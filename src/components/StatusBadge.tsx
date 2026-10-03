import React from 'react';
import type { CredentialStatus } from '../types/skillpass';
import { statusMeta } from '../utils/credentials';

const toneClasses = {
  ok: 'bg-ok-50 text-ok-700',
  warn: 'bg-warn-50 text-warn-700',
  bad: 'bg-bad-50 text-bad-700',
  neutral: 'bg-canvas text-ink-muted ring-1 ring-inset ring-line'
};

const dotClasses = {
  ok: 'bg-ok-600',
  warn: 'bg-warn-600',
  bad: 'bg-bad-600',
  neutral: 'bg-ink-subtle'
};

export function StatusBadge({ status }: {status: CredentialStatus;}) {
  const meta = statusMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[meta.tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[meta.tone]}`} aria-hidden="true" />
      {meta.label}
    </span>);

}

export function Pill({ tone = 'neutral', children }: {tone?: keyof typeof toneClasses;children: React.ReactNode;}) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{children}</span>;
}