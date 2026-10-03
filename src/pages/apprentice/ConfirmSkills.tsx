import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, LockIcon, ShieldCheckIcon, XIcon } from 'lucide-react';
import type { ConcernCategory } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Modal } from '../../components/Modal';
import { TrustBadge } from '../../components/TrustBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { concernLabels } from '../../data/integrity';
import { formatDateTime } from '../../utils/credentials';

export function ConfirmSkills() {
  const { user } = useAuth();
  const { credentials, skills, reports, confirmCredential, disputeCredential, reportConcern } = useSkillPass();
  const pending = credentials.filter((c) => c.apprenticeId === user?.id && c.status === 'pending_apprentice');
  const myReports = reports.filter((r) => r.apprenticeId === user?.id);
  const [disputing, setDisputing] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [category, setCategory] = useState<ConcernCategory>('payment');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || details.trim().length < 10) return;
    reportConcern(user.id, category, details.trim());
    setDetails('');
    setSent(true);
  };

  return (
    <>
      <PageHeader title="Confirm & Report" subtitle="Your voice keeps SkillPass honest. Only confirm skills you actually performed." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Waiting for your confirmation" description="A credential only becomes valid after you confirm it.">
          {done && <p role="status" className="mb-4 rounded-xl bg-ok-50 p-3 text-sm font-medium text-ok-700">{done}</p>}
          {pending.length === 0 ?
          <div className="rounded-xl bg-canvas p-8 text-center">
              <ShieldCheckIcon className="mx-auto h-8 w-8 text-ink-subtle" />
              <p className="mt-2 text-sm text-ink-muted">Nothing to confirm right now.</p>
            </div> :

          <ul className="space-y-4">
              {pending.map((c) => {
              const skill = skills.find((s) => s.id === c.skillId);
              const ev = c.evidence[0];
              return (
                <li key={c.id} className="overflow-hidden rounded-xl border border-line">
                    <div className="flex gap-4 p-4">
                      {ev && <img src={ev.poster ?? ev.url} alt={ev.caption} className="h-20 w-24 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{skill?.name}</p>
                        <p className="mt-0.5 text-sm text-ink-muted">Recorded by <TrustBadge trainerId={c.trainerId} /></p>
                        <p className="text-xs text-ink-subtle">{formatDateTime(c.issuedAt)} · {ev?.locationLabel}</p>
                        <Link to={`/verify/${c.id}`} className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline">See rubric & evidence</Link>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 border-t border-line">
                      <button type="button" onClick={() => {setDisputing(c.id);setDisputeReason('');}} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-bad-700 transition-colors duration-150 hover:bg-bad-50">
                        <XIcon className="h-4 w-4" /> I didn't do this
                      </button>
                      <button type="button" onClick={() => {confirmCredential(c.id);setDone(`Confirmed “${skill?.name}”.`);}} className="flex items-center justify-center gap-2 border-l border-line bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
                        <CheckIcon className="h-4 w-4" /> Yes, I did this
                      </button>
                    </div>
                  </li>);

            })}
            </ul>
          }
        </Panel>

        <Panel title="Report a concern privately" description="If your trainer asks for money, pressures you, or records skills you didn't earn." aside={<LockIcon className="h-4 w-4 text-ink-muted" aria-hidden="true" />} className="self-start">
          {sent ?
          <div role="status" className="rounded-xl bg-ok-50 p-4 text-sm text-ok-700">
              <p className="font-semibold">Report received.</p>
              <p className="mt-1">Only pilot administrators can see it. Your trainer will not be told who reported.</p>
              <button type="button" onClick={() => setSent(false)} className="mt-3 font-semibold underline">Send another</button>
            </div> :

          <form onSubmit={submitReport} className="space-y-4">
              <fieldset>
                <legend className="text-sm font-semibold text-ink">What happened?</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(Object.keys(concernLabels) as ConcernCategory[]).map((k) =>
                <button key={k} type="button" aria-pressed={category === k} onClick={() => setCategory(k)} className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${category === k ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink hover:bg-canvas'}`}>{concernLabels[k]}</button>
                )}
                </div>
              </fieldset>
              <div>
                <label htmlFor="concern" className="text-sm font-semibold text-ink">Details</label>
                <textarea id="concern" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="What was said or asked, and when" className="mt-1.5 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
              <button type="submit" disabled={details.trim().length < 10} className="w-full rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-ink/90 disabled:opacity-40">Send confidentially</button>
              {myReports.length > 0 && <p className="text-xs text-ink-muted">You've sent {myReports.length} report{myReports.length > 1 ? 's' : ''}. Latest status: {myReports[0].status}.</p>}
            </form>
          }
        </Panel>
      </div>

      <Modal open={!!disputing} title="Tell us what's wrong" onClose={() => setDisputing(null)}>
        <p className="text-sm text-ink-muted">This credential will be flagged for an administrator. It won't appear as valid on your passport.</p>
        <textarea rows={3} aria-label="Reason" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="e.g. I have not done this task yet" className="mt-3 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setDisputing(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
          <button type="button" disabled={disputeReason.trim().length < 5} onClick={() => {if (disputing) disputeCredential(disputing, disputeReason.trim());setDisputing(null);setDone('Flagged for review. Thank you for being honest.');}} className="rounded-xl bg-bad-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-bad-700 disabled:opacity-40">Flag it</button>
        </div>
      </Modal>
    </>);

}