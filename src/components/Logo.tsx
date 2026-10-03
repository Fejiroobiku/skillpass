import React from 'react';
import { BadgeCheckIcon } from 'lucide-react';

export function Logo({ compact = false, inverted = false }: {compact?: boolean;inverted?: boolean;}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center justify-center rounded-lg ${compact ? 'h-8 w-8' : 'h-9 w-9'} ${inverted ? 'bg-white text-brand-700' : 'bg-brand-600 text-white'}`}>
        <BadgeCheckIcon className={compact ? 'h-5 w-5' : 'h-5 w-5'} strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className={`font-semibold tracking-tight ${compact ? 'text-lg' : 'text-xl'} ${inverted ? 'text-white' : 'text-ink'}`}>
        Skill<span className={inverted ? 'text-brand-100' : 'text-brand-600'}>Pass</span>
      </span>
    </div>);

}