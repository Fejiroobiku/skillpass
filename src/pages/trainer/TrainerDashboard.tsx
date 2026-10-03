import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ClockIcon, FilePlus2Icon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { StatusBadge } from '../../components/StatusBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/credentials';
import { associations } from '../../data/integrity';

export function TrainerDashboard() {
  const { user } = useAuth();
  const { credentials, flags, samples, trainers, apprentices, skills, settings, cosign, nameOf, trustOf, riskOf } = useSkillPass();
  const me = trainers.find((t) => t.id === user?.id)!;
  const trust = trustOf(me.id);
  const risk = riskOf(me.id);
  const assoc = associations.find((a) => a.id === me.associationId);
  const mine = credentials.filter((c) => c.trainerId === me.id);
  const requests = credentials.filter((c) => c.status === 'pending_cosign' && c.cosignRequestedFrom === me.id);
  const openFlags = flags.filter((f) => f.status === 'open' && mine.some((c) => c.id === f.credentialId));
  const pendingAudits = samples.filter((s) => s.result === 'pending' && mine.some((c) => c.id === s.credentialId));
  const skillName = (id: string) => skills.find((s) => s.id === id)?.name;

  const metrics = [
  { label: 'Audit agreement', value: trust.auditAgreement === null ? '—' : `${Math.round(trust.auditAgreement * 100)}%`, hint: `${trust.auditCount} re-checked` },
  { label: 'Employer rating', value: trust.avgRating === null ? '—' : trust.avgRating.toFixed(1), hint: `${trust.ratingCount} ratings` },
  { label: 'Flagged or revoked', value: `${Math.round(trust.flaggedShare * 100)}%`, hint: `of ${trust.issuedCount} issued` },
  { label: 'With evidence', value: `${Math.round(trust.evidenceShare * 100)}%`, hint: 'required on every credential' }];


  return (
    <>
      <PageHeader
        title={`Welcome back, ${me.name.split(' ')[0]}`}
        subtitle={`${me.workshop} · ${me.location.name}`}
        actions={
        me.approved && !me.misconductAt &&
        <Link to="/trainer/issue" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
              <FilePlus2Icon className="h-4 w-4" /> Issue credential
            </Link>

        } />
      

      {!me.approved &&
      <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-warn-200 bg-warn-50 p-4 text-sm text-warn-700">
          <ClockIcon className="h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Your trainer account is awaiting approval.</span>{' '}
            {me.membershipVerified ? 'Your association membership is confirmed.' : `We're confirming your membership (${me.membershipNo}) with ${assoc?.name ?? 'your trade association'}.`} Issuing unlocks once an administrator approves your workshop.
          </p>
        </div>
      }
      {me.misconductAt &&
      <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-bad-200 bg-bad-50 p-4 text-sm text-bad-700">
          <TriangleAlertIcon className="h-5 w-5 shrink-0" />
          <p><span className="font-semibold">Issuing suspended.</span> {me.misconductReason}. All your earlier credentials are under review and {assoc?.name ?? 'your association'} has been informed.</p>
        </div>
      }
      {me.approved && !me.misconductAt && risk?.onProbation &&
      <div role="status" className="mb-6 flex gap-3 rounded-2xl border border-line bg-white p-4 text-sm text-ink">
          <ClockIcon className="h-5 w-5 shrink-0 text-brand-600" />
          <p><span className="font-semibold">Probation: {risk.probationUsed} of {settings.probationCount} credentials.</span> Until you reach {settings.probationCount}, every credential you sign needs a second trainer or verified employer to co-sign.</p>
        </div>
      }

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Your trust score" description="Employers see this next to every credential you sign.">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-semibold tracking-tight text-brand-700">{trust.score}</span>
              <span className="text-lg text-ink-muted">/ 100</span>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 border-line md:border-l md:pl-6">
              {metrics.map((m) =>
              <div key={m.label}>
                  <dt className="text-xs text-ink-muted">{m.label}</dt>
                  <dd className="mt-0.5 text-xl font-semibold text-ink">{m.value}</dd>
                  <dd className="text-xs text-ink-subtle">{m.hint}</dd>
                </div>
              )}
            </dl>
          </div>
          {trust.ratingPenalty > 0 &&
          <p className="mt-5 flex gap-2 rounded-xl bg-warn-50 p-3 text-sm text-warn-700">
              <TriangleAlertIcon className="h-4 w-4 shrink-0 translate-y-0.5" /> −{trust.ratingPenalty} points: {trust.poorRatings} apprentices you passed received poor employer ratings.
            </p>
          }
          {risk && risk.signals.length > 0 &&
          <p className="mt-3 flex gap-2 rounded-xl bg-canvas p-3 text-sm text-ink-muted">
              <TriangleAlertIcon className="h-4 w-4 shrink-0 translate-y-0.5 text-warn-600" /> More of your credentials are being audited because of: {risk.signals.map((s) => s.label.toLowerCase()).join(', ')}.
            </p>
          }
          <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">Score = 40% audit agreement + 30% employer ratings + 30% never flagged, minus an automatic penalty when apprentices you passed keep getting poor ratings.</p>
        </Panel>

        <Panel title="Needs your attention">
          <ul className="space-y-3">
            {requests.map((c) =>
            <li key={c.id} className="rounded-xl border border-line p-4">
                <p className="text-xs font-medium text-brand-700">Co-sign request</p>
                <p className="mt-1 text-sm font-semibold text-ink">{skillName(c.skillId)}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{nameOf(c.apprenticeId)} · issued by {nameOf(c.trainerId)}</p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/verify/${c.id}`} className="flex-1 rounded-lg border border-line px-3 py-2 text-center text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">Evidence</Link>
                  <button type="button" onClick={() => cosign(c.id, me.id)} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Co-sign</button>
                </div>
              </li>
            )}
            {openFlags.map((f) =>
            <li key={f.id} className="flex gap-3 rounded-xl bg-warn-50 p-4 text-sm text-warn-700">
                <TriangleAlertIcon className="h-4 w-4 shrink-0 translate-y-0.5" />
                <p><Link to={`/verify/${f.credentialId}`} className="font-mono font-semibold hover:underline">{f.credentialId}</Link> was flagged: “{f.reason}”</p>
              </li>
            )}
            {pendingAudits.length > 0 &&
            <li className="rounded-xl bg-canvas p-4 text-sm text-ink-muted">
                {pendingAudits.length} of your credentials {pendingAudits.length > 1 ? 'are' : 'is'} selected for a random spot-check.
              </li>
            }
            {requests.length + openFlags.length + pendingAudits.length === 0 && <li className="rounded-xl bg-canvas p-4 text-sm text-ink-muted">Nothing needs your attention.</li>}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6" title="Recently issued" aside={<Link to="/trainer/credentials" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">View all <ArrowRightIcon className="h-4 w-4" /></Link>}>
        {mine.length === 0 ?
        <p className="text-sm text-ink-muted">You haven't issued any credentials yet.</p> :

        <ul className="divide-y divide-line">
            {mine.slice(0, 5).map((c) =>
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{skillName(c.skillId)}</p>
                  <p className="text-xs text-ink-muted">{nameOf(c.apprenticeId)} · {formatDate(c.issuedAt)} · <Link to={`/verify/${c.id}`} className="font-mono text-brand-700 hover:underline">{c.id}</Link></p>
                </div>
                <StatusBadge status={c.status} />
              </li>
          )}
          </ul>
        }
        <p className="mt-4 border-t border-line pt-4 text-xs text-ink-muted">{apprentices.filter((a) => a.trainerId === me.id).length} apprentices linked to your workshop.</p>
      </Panel>
    </>);

}