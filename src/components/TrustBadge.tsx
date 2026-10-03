import React from 'react';
import { ShieldCheckIcon, ShieldAlertIcon } from 'lucide-react';
import { useSkillPass } from '../contexts/SkillPassContext';

/** Trainer name + live trust score, shown wherever a credential appears. */
export function TrustBadge({ trainerId, withName = true }: {trainerId: string;withName?: boolean;}) {
  const { trustOf, nameOf, trainers } = useSkillPass();
  const t = trainers.find((x) => x.id === trainerId);
  const { score } = trustOf(trainerId);
  const tone = t?.misconductAt || score < 50 ? 'bg-bad-50 text-bad-700' : score < 70 ? 'bg-warn-50 text-warn-700' : 'bg-ok-50 text-ok-700';
  const Icon = t?.misconductAt || score < 50 ? ShieldAlertIcon : ShieldCheckIcon;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {withName && <span className="text-ink">{nameOf(trainerId)}</span>}
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`} title="Trainer trust score">
        <Icon className="h-3 w-3" aria-hidden="true" /> {score}
      </span>
    </span>);

}