import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { verifiedSkillIds } from '../../utils/matching';

export function SidebarMeter() {
  const { user } = useAuth();
  const { issuedToday, credentials, flags, samples, trainers, employers, skills, apprentices, settings, jobs } = useSkillPass();
  if (!user) return null;

  let label = '';
  let value = 0;
  let max = 1;
  let caption = '';
  let warn = false;

  if (user.role === 'trainer') {
    value = issuedToday(user.id);
    max = settings.dailyLimit;
    label = 'Issued today';
    warn = value >= max;
    caption = warn ? 'New credentials go to admin review' : `${max - value} left before admin review`;
  } else if (user.role === 'apprentice') {
    const me = apprentices.find((a) => a.id === user.id);
    value = verifiedSkillIds(user.id, credentials).size;
    max = Math.max(1, skills.filter((s) => s.trade === me?.trade && s.status === 'active').length);
    label = 'Trade checklist';
    caption = `${value} of ${max} skills verified`;
  } else if (user.role === 'employer') {
    const open = jobs.filter((j) => j.employerId === user.id).length;
    return (
      <div className="rounded-xl bg-canvas p-4">
        <p className="text-sm font-semibold text-ink">Open jobs</p>
        <p className="mt-1 text-2xl font-semibold text-brand-700">{open}</p>
        <p className="text-xs text-ink-muted">Matched by verified skills and distance</p>
      </div>);

  } else {
    const pending =
    flags.filter((f) => f.status === 'open').length +
    samples.filter((s) => s.result === 'pending').length +
    trainers.filter((t) => !t.approved).length +
    employers.filter((e) => !e.approved).length +
    credentials.filter((c) => c.status === 'held_review').length;
    return (
      <div className="rounded-xl bg-canvas p-4">
        <p className="text-sm font-semibold text-ink">Needs review</p>
        <p className="mt-1 text-2xl font-semibold text-brand-700">{pending}</p>
        <p className="text-xs text-ink-muted">Approvals, flags, audits and held items</p>
      </div>);

  }

  const pct = Math.min(100, Math.round(value / max * 100));
  return (
    <div className="rounded-xl bg-canvas p-4">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-ink">{label}</p>
        <p className="font-medium text-ink-muted">{value}/{max}</p>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={`h-full rounded-full transition-[width] duration-300 ${warn ? 'bg-warn-600' : 'bg-brand-600'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-ink-muted">{caption}</p>
    </div>);

}