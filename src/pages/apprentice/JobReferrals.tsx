import React from 'react';
import { CheckIcon, MapPinIcon, MessageSquareIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/StatusBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { scoreMatch } from '../../utils/matching';
import { formatDate } from '../../utils/credentials';

const statusCopy = {
  sent: { tone: 'neutral' as const, label: 'New' },
  accepted: { tone: 'ok' as const, label: 'Interested' },
  contacted: { tone: 'ok' as const, label: 'Employer contacted you' },
  declined: { tone: 'bad' as const, label: 'Declined' }
};

export function JobReferrals() {
  const { user } = useAuth();
  const { referrals, jobs, credentials, apprentices, employers, skills, setReferralStatus } = useSkillPass();
  const me = apprentices.find((a) => a.id === user?.id);
  if (!me) return null;
  const mine = referrals.filter((r) => r.apprenticeId === me.id);

  return (
    <>
      <PageHeader title="Job Referrals" subtitle="Jobs matched to your verified skills and location. We also send these by SMS." />
      {mine.length === 0 ?
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <p className="font-semibold text-ink">No referrals yet</p>
          <p className="mt-1 text-sm text-ink-muted">Referrals arrive when employers post jobs that match your verified skills.</p>
        </div> :

      <ul className="space-y-4">
          {mine.map((r) => {
          const job = jobs.find((j) => j.id === r.jobId);
          if (!job) return null;
          const m = scoreMatch(job, me, credentials);
          const employer = employers.find((e) => e.id === job.employerId);
          const s = statusCopy[r.status];
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="text-xl font-semibold">{m.score}%</span>
                    <span className="text-[10px] font-medium">match</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-ink">{job.title}</h2>
                      <Pill tone={s.tone}>{s.label}</Pill>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{employer?.company} · {job.pay}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted"><MapPinIcon className="h-4 w-4" /> {job.location.name} · {m.distance.toFixed(1)} km away · referred {formatDate(r.sentAt)}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {job.skillIds.map((id) => {
                      const has = m.matchedSkillIds.includes(id);
                      return (
                        <li key={id} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${has ? 'bg-ok-50 text-ok-700' : 'bg-canvas text-ink-muted'}`}>
                            {has ? <CheckIcon className="h-3.5 w-3.5" /> : <XIcon className="h-3.5 w-3.5" />}
                            {skills.find((x) => x.id === id)?.name}
                          </li>);

                    })}
                    </ul>
                  </div>
                  {r.status === 'sent' &&
                <div className="flex gap-2 md:flex-col">
                      <button type="button" onClick={() => setReferralStatus(r.id, 'accepted')} className="flex-1 whitespace-nowrap rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">I'm interested</button>
                      <button type="button" onClick={() => setReferralStatus(r.id, 'declined')} className="flex-1 rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">Decline</button>
                    </div>
                }
                  {r.status === 'accepted' &&
                <p className="flex items-center gap-2 text-sm text-ink-muted md:max-w-[200px]"><MessageSquareIcon className="h-4 w-4 shrink-0" /> Your passport link was shared with the employer.</p>
                }
                </div>
              </li>);

        })}
        </ul>
      }
    </>);

}