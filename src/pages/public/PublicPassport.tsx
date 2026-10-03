import React from 'react';
import { useParams } from 'react-router-dom';
import { LockIcon, PrinterIcon } from 'lucide-react';
import { PublicHeader } from '../../components/PublicHeader';
import { PassportView } from '../../components/PassportView';

export function PublicPassport() {
  const { id = '' } = useParams();
  return (
    <div className="flex min-h-full w-full flex-col bg-canvas">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <PassportView
          apprenticeId={id}
          actions={
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand-800 transition-colors duration-150 hover:bg-brand-50">
              <PrinterIcon className="h-4 w-4" /> Print record
            </button>
          } />
        
      </main>
      <footer className="border-t border-line bg-white px-6 py-4 text-center text-sm text-ink-muted">
        <p className="inline-flex items-center gap-2"><LockIcon className="h-4 w-4" /> Public view. Contact details are never shown.</p>
      </footer>
    </div>);

}