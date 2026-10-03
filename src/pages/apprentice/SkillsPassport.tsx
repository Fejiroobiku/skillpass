import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckIcon, CopyIcon, ExternalLinkIcon, PrinterIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { PassportView } from '../../components/PassportView';
import { useAuth } from '../../contexts/AuthContext';

export function SkillsPassport() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  if (!user) return null;
  const path = `/passport/${user.id}`;
  const url = `${window.location.origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {

      /* clipboard unavailable */}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <PageHeader title="My Skills Passport" subtitle="Share this with employers. Only trainers can add or change skills on it." />
      <PassportView
        apprenticeId={user.id}
        actions={
        <>
            <span className="max-w-full truncate rounded-lg bg-white/10 px-3 py-2 font-mono text-sm">{url.replace(/^https?:\/\//, '')}</span>
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand-800 transition-colors duration-150 hover:bg-brand-50">
              {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />} {copied ? 'Link copied' : 'Copy link'}
            </button>
            <Link to={path} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 transition-colors duration-150 hover:bg-white/10">
              <ExternalLinkIcon className="h-4 w-4" /> Public view
            </Link>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 transition-colors duration-150 hover:bg-white/10">
              <PrinterIcon className="h-4 w-4" /> Print
            </button>
          </>
        } />
      
    </>);

}