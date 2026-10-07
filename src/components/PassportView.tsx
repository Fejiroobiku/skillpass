import React from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon } from 'lucide-react';
import { Panel } from './Panel';
import { StatusBadge } from './StatusBadge';
import { StarRating } from './StarRating';
import { TrustBadge } from './TrustBadge';
import { skillLevels } from '../data/skills';
import { formatDate } from '../utils/credentials';
import { usePassport } from '../api/usePublic';

/** An apprentice's skills passport, loaded from the public API so it works for anyone with the link. */
export function PassportView({ apprenticeId, actions }: {apprenticeId: string;actions?: React.ReactNode;}) {
  const passport = usePassport(apprenticeId);

  if (passport.status === 'idle' || passport.status === 'loading') return <p role="status" className="rounded-2xl bg-white p-8 text-center text-ink-muted">Loading passport…</p>;
  if (!passport.data) {
    return <p role="alert" className="rounded-2xl bg-white p-8 text-center text-ink-muted">{passport.status === 'missing' ? 'Passport not found.' : passport.error}</p>;
  }

  const { apprentice, trainer, skills, credentials, trainers, ratings } = passport.data;
  const verifiedCount = new Set(credentials.filter((c) => c.status === 'valid').map((c) => c.skillId)).size;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-700 p-6 text-white md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-brand-100">SkillPass · {apprentice.tradeName}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">{apprentice.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-100">
              <MapPinIcon className="h-4 w-4" /> {apprentice.location}{trainer && ` · Trained by ${trainer.name}, ${trainer.workshop}`}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold">{verifiedCount}</span>
            <span className="text-brand-100">of {skills.length} skills verified</span>
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
                  {skills.filter((s) => s.level === level).map((s) => {
                  const cred = credentials.find((c) => c.skillId === s.id);
                  const t = cred ? trainers[cred.trainerId] : undefined;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${cred ? 'text-ink' : 'text-ink-subtle'}`}>{s.name}</p>
                          {cred && t &&
                        <p className="mt-0.5 text-xs text-ink-muted">
                              <TrustBadge trainerId={cred.trainerId} data={{ name: t.name, score: t.trustScore, underReview: t.underReview }} /> · {formatDate(cred.issuedAt)} ·{' '}
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
                  <p className="mt-1 text-xs text-ink-muted">{f.company} · {formatDate(f.createdAt)}</p>
                </li>
            )}
            </ul>
          }
        </Panel>
      </div>
    </div>);

}
