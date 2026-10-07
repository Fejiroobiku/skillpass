import React, { useState } from 'react';
import { StarIcon } from 'lucide-react';
import type { Referral } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Modal } from '../../components/Modal';
import { Pill } from '../../components/StatusBadge';
import { StarRating } from '../../components/StarRating';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/credentials';

const statusLabel = { sent: 'Referral sent', accepted: 'Interested', contacted: 'Contacted', declined: 'Declined' } as const;

export function EmployerFeedback() {
  const { user } = useAuth();
  const { referrals, jobs, credentials, feedback, employers, nameOf, addFeedback, setReferralStatus } = useSkillPass();
  const verified = !!employers.find((e) => e.id === user?.id)?.approved;
  const [error, setError] = useState<string | null>(null);
  const myJobs = jobs.filter((j) => j.employerId === user?.id);
  const myRefs = referrals.filter((r) => myJobs.some((j) => j.id === r.jobId));
  const given = feedback.filter((f) => f.employerId === user?.id);
  const [rating, setRating] = useState<Referral | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');

  const open = (r: Referral) => {
    setRating(r);
    setStars(0);
    setComment('');
  };

  const submit = async () => {
    if (!rating || !user) return;
    const job = jobs.find((j) => j.id === rating.jobId);
    const linked = credentials.filter((c) => c.apprenticeId === rating.apprenticeId && c.status === 'valid' && job?.skillIds.includes(c.skillId)).map((c) => c.id);
    const err = await addFeedback({ apprenticeId: rating.apprenticeId, employerId: user.id, credentialIds: linked, rating: stars, comment: comment.trim(), referralId: rating.id });
    setError(err);
    setRating(null);
  };

  return (
    <>
      <PageHeader title="Feedback" subtitle="One rating per real job, from verified employers only. Ratings attach to credentials and feed the trainer's trust score." />
      {!verified && <p role="status" className="mb-4 rounded-xl bg-warn-50 p-3.5 text-sm text-warn-700">Your employer account must be verified by an administrator before you can leave ratings.</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-bad-50 p-3.5 text-sm font-medium text-bad-700">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Your referrals">
          {myRefs.length === 0 ?
          <p className="text-sm text-ink-muted">Send referrals from Jobs & Matches to see them here.</p> :

          <ul className="divide-y divide-line">
              {myRefs.map((r) => {
              const job = jobs.find((j) => j.id === r.jobId);
              const rated = given.some((f) => f.referralId === r.id);
              return (
                <li key={r.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{nameOf(r.apprenticeId)}</p>
                      <p className="text-sm text-ink-muted">{job?.title} · {formatDate(r.sentAt)}</p>
                    </div>
                    <Pill tone={r.status === 'declined' ? 'bad' : r.status === 'sent' ? 'neutral' : 'ok'}>{statusLabel[r.status]}</Pill>
                    <div className="flex gap-2">
                      {r.status === 'accepted' &&
                    <button type="button" onClick={() => setReferralStatus(r.id, 'contacted')} className="whitespace-nowrap rounded-xl border border-line px-3.5 py-2 text-sm font-medium text-ink hover:bg-canvas">Mark hired</button>
                    }
                      {(r.status === 'accepted' || r.status === 'contacted') && !rated && verified &&
                    <button type="button" onClick={() => open(r)} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-700"><StarIcon className="h-4 w-4" /> Rate work</button>
                    }
                      {rated && <span className="text-sm text-ink-muted">Rated</span>}
                      {r.status === 'sent' && <span className="text-xs text-ink-subtle">Rate once they take the job</span>}
                    </div>
                  </li>);

            })}
            </ul>
          }
        </Panel>

        <Panel title="Ratings you've given">
          {given.length === 0 ?
          <p className="text-sm text-ink-muted">No ratings yet.</p> :

          <ul className="space-y-4">
              {given.map((f) =>
            <li key={f.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between"><p className="font-medium text-ink">{nameOf(f.apprenticeId)}</p><StarRating value={f.rating} /></div>
                  {f.comment && <p className="mt-1 text-sm text-ink-muted">“{f.comment}”</p>}
                  <p className="mt-1 text-xs text-ink-subtle">{formatDate(f.createdAt)} · linked to {f.credentialIds.length} credential{f.credentialIds.length === 1 ? '' : 's'}</p>
                </li>
            )}
            </ul>
          }
        </Panel>
      </div>

      <Modal open={!!rating} title={`Rate ${rating ? nameOf(rating.apprenticeId) : ''}`} onClose={() => setRating(null)}>
        <p className="mb-2 text-sm text-ink-muted">How well did they do the work you hired them for?</p>
        <StarRating value={stars} onChange={setStars} size="lg" />
        <label htmlFor="fb-comment" className="mt-4 block text-sm font-semibold text-ink">Comment</label>
        <textarea id="fb-comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setRating(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
          <button type="button" disabled={stars === 0} onClick={submit} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Submit rating</button>
        </div>
      </Modal>
    </>);

}