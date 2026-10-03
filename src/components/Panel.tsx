import React from 'react';

interface PanelProps {
  title?: string;
  description?: string;
  aside?: React.ReactNode;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Panel({ title, description, aside, accent, className = '', children }: PanelProps) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 md:p-6 ${className}`}>
      {(title || aside) &&
      <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className={`text-lg font-semibold tracking-tight ${accent ? 'text-brand-700' : 'text-ink'}`}>{title}</h2>}
            {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
          </div>
          {aside}
        </div>
      }
      {children}
    </section>);

}