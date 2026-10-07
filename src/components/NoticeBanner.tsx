import React from 'react';
import { XIcon } from 'lucide-react';
import { useSkillPass } from '../contexts/SkillPassContext';

/** Shows the server's message when it refuses an action (for example "Only valid credentials can be flagged"). */
export function NoticeBanner() {
  const { notice, clearNotice } = useSkillPass();
  if (!notice) return null;
  return (
    <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-bad-200 bg-bad-50 px-4 py-3 text-sm font-medium text-bad-700">
      <span>{notice}</span>
      <button type="button" onClick={clearNotice} aria-label="Dismiss message" className="shrink-0 rounded-md p-0.5 hover:bg-bad-100"><XIcon className="h-4 w-4" /></button>
    </div>);

}
