import React from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2Icon, MapPinIcon, PhoneIcon, UserPlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/credentials';
import { verifiedSkillIds } from '../../utils/matching';

export function TrainerApprentices() {
  const { user } = useAuth();
  const { apprentices, credentials, skills, trainers } = useSkillPass();
  const me = trainers.find((t) => t.id === user?.id)!;
  const mine = apprentices.filter((a) => a.trainerId === me.id);
  const total = skills.filter((s) => s.trade === me.trade && s.status === 'active').length;

  return (
    <>
      <PageHeader title="Apprentices" subtitle="Each apprentice is linked to one trainer — you. They link themselves when they register." />
      {mine.length === 0 ?
      <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
          <UserPlusIcon className="mx-auto h-8 w-8 text-ink-subtle" />
          <p className="mt-3 font-semibold text-ink">No apprentices yet</p>
          <p className="mt-1 text-sm text-ink-muted">Share your workshop name so apprentices can select you when they sign up.</p>
        </div> :

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mine.map((a) => {
          const n = verifiedSkillIds(a.id, credentials).size;
          return (
            <li key={a.id} className="flex flex-col rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800">{a.name.split(' ').map((p) => p[0]).join('')}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{a.name}</p>
                    <p className="text-xs text-ink-muted">Apprentice since {formatDate(a.startedAt)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">Checklist</span><span className="font-medium text-ink">{n}/{total} verified</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-brand-600" style={{ width: `${total ? n / total * 100 : 0}%` }} /></div>
                </div>
                <dl className="mt-4 space-y-1.5 text-sm text-ink-muted">
                  <div className="flex items-center gap-2"><MapPinIcon className="h-4 w-4" /><dd>{a.location.name}</dd></div>
                  <div className="flex items-center gap-2"><PhoneIcon className="h-4 w-4" /><dd>{a.phone}</dd></div>
                </dl>
                <div className="mt-auto flex gap-2 pt-5">
                  <Link to={`/passport/${a.id}`} className="flex-1 rounded-xl border border-line px-3 py-2.5 text-center text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">Passport</Link>
                  {me.approved &&
                <Link to={`/trainer/issue?apprentice=${a.id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
                      <FilePlus2Icon className="h-4 w-4" /> Issue
                    </Link>
                }
                </div>
              </li>);

        })}
        </ul>
      }
    </>);

}