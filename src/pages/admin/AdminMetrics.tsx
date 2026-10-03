import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { dataCollection } from '../../data/pilot';
import { median } from '../../utils/credentials';

interface Metric {
  problem: string;
  name: string;
  value: string;
  target: string;
  progress: number;
  met: boolean | null;
}

export function AdminMetrics() {
  const { apprentices, credentials, samples, verifications, referrals, susResponses, flags, trainers, employers, auditLog } = useSkillPass();

  const holders = apprentices.filter((a) => credentials.some((c) => c.apprenticeId === a.id && c.status === 'valid'));
  const holderPct = apprentices.length ? holders.length / apprentices.length : 0;
  const done = samples.filter((s) => s.result !== 'pending');
  const agreePct = done.length ? done.filter((s) => s.result === 'agree').length / done.length : 0;
  const evidencePct = credentials.length ? credentials.filter((c) => c.evidence.length > 0).length / credentials.length : 1;
  const medSecs = median(verifications.map((v) => v.seconds));
  const ratings = verifications.filter((v) => v.trustRating).map((v) => v.trustRating as number);
  const meanTrust = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const referred = holders.filter((a) => referrals.some((r) => r.apprenticeId === a.id));
  const referralPct = holders.length ? referred.length / holders.length : 0;
  const contactPct = referrals.length ? referrals.filter((r) => r.status === 'contacted').length / referrals.length : 0;
  const sus = susResponses.length ? susResponses.reduce((a, b) => a + b.score, 0) / susResponses.length : 0;

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const metrics: Metric[] = [
  { problem: 'Verifiable record', name: 'Apprentices with ≥1 verified credential', value: `${pct(holderPct)} (${holders.length}/${apprentices.length})`, target: '≥ 80%', progress: holderPct / 0.8, met: holderPct >= 0.8 },
  { problem: 'Integrity', name: 'Spot-check agreement', value: `${pct(agreePct)} (${done.length} checked)`, target: '≥ 80%', progress: agreePct / 0.8, met: done.length ? agreePct >= 0.8 : null },
  { problem: 'Integrity', name: 'Credentials carrying evidence', value: pct(evidencePct), target: '100%', progress: evidencePct, met: evidencePct >= 1 },
  { problem: 'Employer trust', name: 'Median time to verify', value: medSecs === null ? '—' : `${medSecs}s`, target: '< 60s', progress: medSecs === null ? 0 : Math.min(1, 60 / Math.max(medSecs, 1)), met: medSecs === null ? null : medSecs < 60 },
  { problem: 'Employer trust', name: 'Mean employer trust rating', value: ratings.length ? `${meanTrust.toFixed(1)} / 5` : '—', target: '≥ 4.0', progress: meanTrust / 4, met: ratings.length ? meanTrust >= 4 : null },
  { problem: 'Opportunities', name: 'Verified apprentices referred', value: `${pct(referralPct)} · ${pct(contactPct)} led to contact`, target: '≥ 30%', progress: referralPct / 0.3, met: referralPct >= 0.3 },
  { problem: 'Usability', name: 'SUS score (all roles)', value: susResponses.length ? `${sus.toFixed(1)} (${susResponses.length} responses)` : '—', target: '≥ 68', progress: sus / 68, met: susResponses.length ? sus >= 68 : null }];

  const metCount = metrics.filter((m) => m.met).length;

  const queue = [
  { label: 'Open flags', value: flags.filter((f) => f.status === 'open').length, to: '/admin/review' },
  { label: 'Pending audit samples', value: samples.filter((s) => s.result === 'pending').length, to: '/admin/review' },
  { label: 'Held credentials', value: credentials.filter((c) => c.status === 'held_review').length, to: '/admin/review' },
  { label: 'Accounts awaiting approval', value: trainers.filter((t) => !t.approved).length + employers.filter((e) => !e.approved).length, to: '/admin/users' }];


  return (
    <>
      <PageHeader title="Pilot Metrics" subtitle={`Table 1 targets · ${metCount} of ${metrics.length} currently met · Lagos pilot, week 9 of 16`} />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-5 py-4 md:px-6">
            <h2 className="text-lg font-semibold text-ink">Success metrics</h2>
            <p className="text-sm text-ink-muted">Calculated live from system logs, spot-checks, employer ratings and survey responses.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-canvas text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium md:px-6">Metric</th>
                  <th scope="col" className="px-3 py-3 font-medium">Current</th>
                  <th scope="col" className="px-3 py-3 font-medium">Target</th>
                  <th scope="col" className="w-40 px-5 py-3 font-medium md:px-6">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {metrics.map((m) =>
                <tr key={m.name}>
                    <td className="px-5 py-3.5 md:px-6">
                      <p className="font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-subtle">{m.problem}</p>
                    </td>
                    <td className="px-3 py-3.5 text-ink">{m.value}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-ink-muted">{m.target}</td>
                    <td className="px-5 py-3.5 md:px-6">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                          <div className={`h-full rounded-full ${m.met === null ? 'bg-ink-subtle' : m.met ? 'bg-ok-600' : 'bg-warn-600'}`} style={{ width: `${Math.min(100, Math.round(m.progress * 100))}%` }} />
                        </div>
                        <span className={`w-14 text-right text-xs font-medium ${m.met === null ? 'text-ink-subtle' : m.met ? 'text-ok-700' : 'text-warn-700'}`}>{m.met === null ? 'No data' : m.met ? 'Met' : 'Below'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <Panel title="Review queue">
            <ul className="divide-y divide-line">
              {queue.map((q) =>
              <li key={q.label}>
                  <Link to={q.to} className="flex items-center justify-between py-3 text-sm first:pt-0 hover:text-brand-700">
                    <span className="text-ink">{q.label}</span>
                    <span className="flex items-center gap-2 font-semibold text-ink">{q.value}<ArrowRightIcon className="h-4 w-4 text-ink-subtle" /></span>
                  </Link>
                </li>
              )}
            </ul>
          </Panel>
          <Panel title="Data collection">
            <ul className="space-y-3">
              {dataCollection.map((d) =>
              <li key={d.label} className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink">{d.label}</p>
                    <p className="text-xs text-ink-subtle">{d.detail}</p>
                  </div>
                  <span className="text-lg font-semibold text-ink">{d.value}</span>
                </li>
              )}
              <li className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm text-ink">System log entries</p>
                  <p className="text-xs text-ink-subtle">Append-only audit log</p>
                </div>
                <span className="text-lg font-semibold text-ink">{auditLog.length}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-sm text-ink">Employer trust ratings</p>
                  <p className="text-xs text-ink-subtle">Captured after each verification</p>
                </div>
                <span className="text-lg font-semibold text-ink">{ratings.length}</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>);

}