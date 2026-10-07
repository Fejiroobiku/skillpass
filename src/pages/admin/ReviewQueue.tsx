import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LockIcon, ShuffleIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/StatusBadge';
import { TrustBadge } from '../../components/TrustBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { assessors, auditReasonLabel, concernLabels } from '../../data/integrity';
import { formatDate } from '../../utils/credentials';

type Tab = 'flags' | 'audits' | 'held' | 'risk' | 'reports' | 'under_review';

export function ReviewQueue() {
  const { user } = useAuth();
  const sp = useSkillPass();
  const { flags, samples, credentials, skills, trainers, reports, settings, nameOf, resolveFlag, completeSample, assignAssessor, releaseHeld, runAuditSampling, auditTrainer, riskOf, markMisconduct, updateReport, reinstate } = sp;
  const actor = user?.name ?? 'Administrator';
  const openFlags = flags.filter((f) => f.status === 'open');
  const pendingSamples = samples.filter((s) => s.result === 'pending');
  const held = credentials.filter((c) => c.status === 'held_review');
  const openReports = reports.filter((r) => r.status !== 'closed');
  const underReview = credentials.filter((c) => c.status === 'under_review');
  const risky = trainers.filter((t) => t.approved).map((t) => ({ t, risk: riskOf(t.id)! })).filter((x) => x.risk.signals.length > 0 || x.risk.onProbation).sort((a, b) => b.risk.signals.length - a.risk.signals.length);
  const [tab, setTab] = useState<Tab>('flags');
  const [notice, setNotice] = useState<string | null>(null);

  const tabs: {id: Tab;label: string;count: number;}[] = [
  { id: 'flags', label: 'Flags', count: openFlags.length },
  { id: 'audits', label: 'Audits', count: pendingSamples.length },
  { id: 'risk', label: 'Trainer risk', count: risky.filter((r) => r.risk.signals.length).length },
  { id: 'reports', label: 'Apprentice reports', count: openReports.length },
  { id: 'under_review', label: 'Under review', count: underReview.length },
  { id: 'held', label: 'Held', count: held.length }];


  const describe = (credentialId: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    return { c, skill: skills.find((s) => s.id === c?.skillId), apprentice: nameOf(c?.apprenticeId) };
  };

  const btn = 'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-150';
  const primary = `${btn} bg-brand-600 text-white hover:bg-brand-700`;
  const secondary = `${btn} border border-line text-ink hover:bg-canvas`;
  const danger = `${btn} border border-bad-200 text-bad-700 hover:bg-bad-50`;
  const card = 'flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 lg:flex-row lg:items-center';
  const empty = <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-muted">Nothing waiting here.</p>;
  const credLine = (id: string, trainerId?: string) =>
  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-muted">
      {describe(id).apprentice} · signed by {trainerId && <TrustBadge trainerId={trainerId} />} · <Link to={`/verify/${id}`} className="font-mono text-brand-700 hover:underline">{id}</Link>
    </p>;


  return (
    <>
      <PageHeader
        title="Review Queue"
        subtitle="Flags, risk-based and random audits, confidential reports and held credentials."
        actions={
        <button type="button" onClick={async () => {const n = await runAuditSampling(actor);setNotice(`${n} credential${n === 1 ? '' : 's'} drawn at random for re-check.`);setTab('audits');}} className={`${secondary} inline-flex items-center gap-2 bg-white`}>
            <ShuffleIcon className="h-4 w-4" /> Draw {settings.auditRatePct}% random sample
          </button>
        } />
      
      {notice && <p role="status" className="mb-4 rounded-xl bg-ok-50 p-3.5 text-sm font-medium text-ok-700">{notice}</p>}

      <div role="tablist" aria-label="Review type" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
        {tabs.map((t) =>
        <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)} className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${tab === t.id ? 'bg-brand-600 text-white' : 'text-ink hover:bg-canvas'}`}>
            {t.label}
            <span className={`rounded-full px-2 text-xs ${tab === t.id ? 'bg-white/20' : 'bg-canvas text-ink-muted'}`}>{t.count}</span>
          </button>
        )}
      </div>

      <div role="tabpanel" className="space-y-3">
        {tab === 'flags' && (openFlags.length === 0 ? empty : openFlags.map((f) => {
          const d = describe(f.credentialId);
          return (
            <article key={f.id} className={card}>
              <div className="flex-1">
                <p className="font-semibold text-ink">{d.skill?.name}</p>
                {credLine(f.credentialId, d.c?.trainerId)}
                <p className="mt-3 border-l-2 border-warn-600 pl-3 text-sm text-ink">“{f.reason}”</p>
                <p className="mt-1 pl-3 text-xs text-ink-subtle">Raised by {nameOf(f.raisedBy)} · {formatDate(f.raisedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => resolveFlag(f.id, 'dismiss', actor)} className={secondary}>Dismiss</button>
                <button type="button" onClick={() => resolveFlag(f.id, 'revoke', actor)} className={danger}>Uphold & revoke</button>
                <button type="button" onClick={() => resolveFlag(f.id, 'misconduct', actor)} className={`${btn} bg-bad-600 text-white hover:bg-bad-700`}>Trainer cheated</button>
              </div>
            </article>);

        }))}

        {tab === 'audits' && (pendingSamples.length === 0 ? empty : pendingSamples.map((s) => {
          const d = describe(s.credentialId);
          const eligible = assessors.filter((a) => a.trades.includes(d.skill?.trade ?? ''));
          const ev = d.c?.evidence[0];
          return (
            <article key={s.id} className={card}>
              {ev && <img src={ev.poster ?? ev.url} alt={ev.caption} className="h-20 w-28 shrink-0 rounded-xl object-cover" />}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{d.skill?.name}</p>
                  <Pill tone={s.reason === 'random' || !s.reason ? 'neutral' : 'warn'}>{auditReasonLabel[s.reason ?? 'random']}</Pill>
                </div>
                {credLine(s.credentialId, d.c?.trainerId)}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <label htmlFor={`as-${s.id}`} className="text-ink-muted">Assessor</label>
                  <select id={`as-${s.id}`} value={s.assessorId ?? ''} onChange={(e) => assignAssessor(s.id, e.target.value, actor)} className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none">
                    <option value="">Unassigned</option>
                    {eligible.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.nsqId ?? a.organisation}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => completeSample(s.id, 'misconduct', actor)} className={danger}>False claim</button>
                <button type="button" onClick={() => completeSample(s.id, 'disagree', actor)} className={secondary}>Disagree</button>
                <button type="button" onClick={() => completeSample(s.id, 'agree', actor)} className={primary}>Agree</button>
              </div>
            </article>);

        }))}

        {tab === 'risk' && (risky.length === 0 ? empty : risky.map(({ t, risk }) =>
        <article key={t.id} className={card}>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <TrustBadge trainerId={t.id} />
                {risk.onProbation && <Pill tone="neutral">Probation {risk.probationUsed}/{settings.probationCount}</Pill>}
                {risk.signals.length > 0 && <Pill tone={risk.level === 'high' ? 'bad' : 'warn'}>{risk.level} risk</Pill>}
                {t.misconductAt && <Pill tone="bad">Misconduct</Pill>}
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">{t.workshop} · pass rate {risk.passRate === null ? '—' : `${Math.round(risk.passRate * 100)}%`} across {risk.assessed}</p>
              {risk.signals.length > 0 ?
            <ul className="mt-2 space-y-1">
                  {risk.signals.map((s) => <li key={s.id} className="text-sm text-ink"><span className="font-medium">{s.label}:</span> <span className="text-ink-muted">{s.detail}</span></li>)}
                </ul> :

            <p className="mt-2 text-sm text-ink-muted">No risk signals. Every credential is co-signed during probation.</p>
            }
            </div>
            {risk.signals.length > 0 && !t.misconductAt &&
          <div className="flex flex-wrap gap-2">
                <button type="button" onClick={async () => {const n = await auditTrainer(t.id, actor);setNotice(`${n} credential${n === 1 ? '' : 's'} from ${t.name} queued for independent audit.`);}} className={primary}>Audit all valid</button>
                <button type="button" onClick={() => markMisconduct(t.id, 'Administrator finding', actor)} className={danger}>Mark misconduct</button>
              </div>
          }
          </article>
        ))}

        {tab === 'reports' &&
        <>
            <p className="flex items-center gap-2 text-xs text-ink-muted"><LockIcon className="h-3.5 w-3.5" /> Confidential. The trainer is never told who reported them.</p>
            {openReports.length === 0 ? empty : openReports.map((r) =>
          <article key={r.id} className={card}>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{concernLabels[r.category]}</p>
                    <Pill tone={r.status === 'open' ? 'warn' : 'neutral'}>{r.status}</Pill>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">About <TrustBadge trainerId={r.trainerId} /> · from {nameOf(r.apprenticeId)} · {formatDate(r.at)}</p>
                  <p className="mt-2 border-l-2 border-warn-600 pl-3 text-sm text-ink">“{r.details}”</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === 'open' && <button type="button" onClick={() => {updateReport(r.id, 'investigating', actor);auditTrainer(r.trainerId, actor);}} className={secondary}>Investigate & audit</button>}
                  <button type="button" onClick={() => updateReport(r.id, 'closed', actor)} className={secondary}>Close</button>
                  <button type="button" onClick={() => {markMisconduct(r.trainerId, `Apprentice report upheld: ${concernLabels[r.category].toLowerCase()}`, actor);updateReport(r.id, 'closed', actor);}} className={danger}>Uphold</button>
                </div>
              </article>
          )}
          </>
        }

        {tab === 'under_review' && (underReview.length === 0 ? empty : underReview.map((c) =>
        <article key={c.id} className={card}>
            <div className="flex-1">
              <p className="font-semibold text-ink">{describe(c.id).skill?.name}</p>
              {credLine(c.id, c.trainerId)}
              <p className="mt-1 text-xs text-ink-subtle">Automatically placed under review because the trainer was found cheating. Re-assess the apprentice, then decide.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => sp.revoke(c.id, 'Not demonstrated on re-assessment', actor)} className={danger}>Revoke</button>
              <button type="button" onClick={() => reinstate(c.id, actor)} className={primary}>Reinstate</button>
            </div>
          </article>
        ))}

        {tab === 'held' && (held.length === 0 ? empty : held.map((c) =>
        <article key={c.id} className={card}>
            <div className="flex-1">
              <p className="font-semibold text-ink">{describe(c.id).skill?.name}</p>
              {credLine(c.id, c.trainerId)}
              <p className="mt-1 text-xs text-ink-subtle">Held because the trainer passed the daily limit of {settings.dailyLimit}.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => releaseHeld(c.id, false, actor)} className={danger}>Reject</button>
              <button type="button" onClick={() => releaseHeld(c.id, true, actor)} className={primary}>Release</button>
            </div>
          </article>
        ))}
      </div>
    </>);

}