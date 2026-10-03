import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon } from 'lucide-react';
import { useSkillPass } from '../contexts/SkillPassContext';
import { Panel } from './Panel';
import { StatusBadge } from './StatusBadge';
import { StarRating } from './StarRating';
import { TrustBadge } from './TrustBadge';
import { skillLevels } from '../data/skills';
import { formatDate } from '../utils/credentials';

export function PassportView({ apprenticeId, actions }: {apprenticeId: string;actions?: React.ReactNode;}) {
  const { apprentices, trainers, credentials, skills, trades, feedback, employers } = useSkillPass();
  const me = apprentices.find((a) => a.id === apprenticeId);
  if (!me) return <p className="rounded-2xl bg-white p-8 text-center text-ink-muted">Passport not found.</p>;

  const trainer = trainers.find((t) => t.id === me.trainerId);
  const mine = credentials.filter((c) => c.apprenticeId === me.id);
  const tradeSkills = skills.filter((s) => s.trade === me.trade && s.status === 'active');
  const verifiedCount = new Set(mine.filter((c) => c.status === 'valid').map((c) => c.skillId)).size;
  const ratings = feedback.filter((f) => f.apprenticeId === me.id);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-700 p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-brand-100">SkillPass · {trades.find((t) => t.id === me.trade)?.name}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{me.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-100">
              <MapPinIcon className="h-4 w-4" /> {me.location.name} · Trained by {trainer?.name}, {trainer?.workshop}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold">{verifiedCount}</span>
            <span className="text-brand-100">of {tradeSkills.length} skills verified</span>
          </div>
        </div>
        {actions && <div className="no-print mt-6 flex flex-wrap items-center gap-2 border-t border-white/20 pt-5">{actions}</div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Skills checklist" description="Every verified skill was watched and signed by a trainer.">
          <div className="space-y-6">
            {skillLevels.map((level) =>
            <div key={level}>
                <h3 className="mb-2 text-sm font-semibold text-ink-muted">{level}</h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {tradeSkills.filter((s) => s.level === level).map((s) => {
                  const cred = mine.find((c) => c.skillId === s.id && c.status !== 'pending_apprentice');
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${cred ? 'text-ink' : 'text-ink-subtle'}`}>{s.name}</p>
                          {cred &&
                        <p className="mt-0.5 text-xs text-ink-muted">
                              <TrustBadge trainerId={cred.trainerId} /> · {formatDate(cred.issuedAt)} ·{' '}
                              <Link to={`/verify/${cred.id}`} className="font-mono text-brand-700 hover:underline">{cred.id}</Link>
                            </p>
                        }
                        </div>
                        {cred ? <StatusBadge status={cred.status} /> : <span className="text-xs text-ink-subtle">Not yet verified</span>}
                      </li>);

                })}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Employer feedback" description="Ratings from completed jobs.">
          {ratings.length === 0 ?
          <p className="text-sm text-ink-muted">No ratings yet.</p> :

          <ul className="space-y-4">
              {ratings.map((f) =>
            <li key={f.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                  <StarRating value={f.rating} />
                  <p className="mt-2 text-sm text-ink">“{f.comment}”</p>
                  <p className="mt-1 text-xs text-ink-muted">{employers.find((e) => e.id === f.employerId)?.company} · {formatDate(f.createdAt)}</p>
                </li>
            )}
            </ul>
          }
        </Panel>
      </div>
    </div>);

}