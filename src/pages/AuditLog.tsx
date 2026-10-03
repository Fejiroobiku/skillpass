import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useSkillPass } from '../contexts/SkillPassContext';
import { formatDateTime } from '../utils/credentials';

const filters = [
{ id: 'all', label: 'All' },
{ id: 'credential.issued', label: 'Issued' },
{ id: 'credential.flagged', label: 'Flagged' },
{ id: 'credential.revoked', label: 'Revoked' },
{ id: 'audit', label: 'Audits' },
{ id: 'account', label: 'Accounts' }] as
const;

export function AuditLog() {
  const { auditLog } = useSkillPass();
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const rows = auditLog.filter((e) => filter === 'all' || (filter === 'audit' || filter === 'account' ? e.action.startsWith(filter) : e.action === filter));

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Log" subtitle={`Append-only · ${auditLog.length} entries. Entries can be added but never edited or deleted.`} />

      <div role="tablist" aria-label="Filter" className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
        {filters.map((f) =>
        <button key={f.id} role="tab" aria-selected={filter === f.id} type="button" onClick={() => setFilter(f.id)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${filter === f.id ? 'bg-brand-600 text-white' : 'text-ink hover:bg-canvas'}`}>
            {f.label}
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-canvas text-xs text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">When</th>
              <th scope="col" className="px-3 py-3 font-medium">Actor</th>
              <th scope="col" className="px-3 py-3 font-medium">Action</th>
              <th scope="col" className="px-3 py-3 font-medium">Target</th>
              <th scope="col" className="px-5 py-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((e) =>
            <tr key={e.id}>
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{formatDateTime(e.at)}</td>
                <td className="whitespace-nowrap px-3 py-3 font-medium text-ink">{e.actor}</td>
                <td className="whitespace-nowrap px-3 py-3"><code className="rounded bg-canvas px-1.5 py-0.5 text-xs text-ink">{e.action}</code></td>
                <td className="whitespace-nowrap px-3 py-3">
                  {e.target.startsWith('SP-') ? <Link to={`/verify/${e.target}`} className="font-mono text-brand-700 hover:underline">{e.target}</Link> : <span className="text-ink">{e.target}</span>}
                </td>
                <td className="px-5 py-3 text-ink-muted">{e.detail}</td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-ink-muted">No entries for this filter.</p>}
      </div>
    </div>);

}