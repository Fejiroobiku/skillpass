import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CredentialStatus } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { RevokeModal } from '../../components/RevokeModal';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../utils/credentials';

const filters: {id: 'all' | CredentialStatus;label: string;}[] = [
{ id: 'all', label: 'All' },
{ id: 'valid', label: 'Valid' },
{ id: 'pending_apprentice', label: 'Awaiting apprentice' },
{ id: 'pending_cosign', label: 'Awaiting co-sign' },
{ id: 'under_review', label: 'Under review' },
{ id: 'held_review', label: 'Held' },
{ id: 'flagged', label: 'Flagged' },
{ id: 'revoked', label: 'Revoked' }];


export function TrainerCredentials() {
  const { user } = useAuth();
  const { credentials, skills, nameOf, revoke } = useSkillPass();
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [revoking, setRevoking] = useState<string | null>(null);
  const mine = credentials.filter((c) => c.trainerId === user?.id);
  const rows = mine.filter((c) => filter === 'all' || c.status === filter);

  return (
    <>
      <PageHeader title="Credentials" subtitle="Everything you have signed. You can revoke, but never edit, a credential." />
      <div role="tablist" aria-label="Filter by status" className="mb-4 flex gap-1 overflow-x-auto">
        {filters.map((f) => {
          const count = f.id === 'all' ? mine.length : mine.filter((c) => c.status === f.id).length;
          return (
            <button key={f.id} role="tab" aria-selected={filter === f.id} type="button" onClick={() => setFilter(f.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${filter === f.id ? 'bg-ink text-white' : 'bg-white text-ink-muted ring-1 ring-inset ring-line hover:text-ink'}`}>
              {f.label} <span className={filter === f.id ? 'text-white/70' : 'text-ink-subtle'}>{count}</span>
            </button>);

        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Skill</th>
                <th scope="col" className="px-3 py-3 font-medium">Apprentice</th>
                <th scope="col" className="px-3 py-3 font-medium">Issued</th>
                <th scope="col" className="px-3 py-3 font-medium">Evidence</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) =>
              <tr key={c.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{skills.find((s) => s.id === c.skillId)?.name}</p>
                    <Link to={`/verify/${c.id}`} className="font-mono text-xs text-brand-700 hover:underline">{c.id}</Link>
                  </td>
                  <td className="px-3 py-3 text-ink">{nameOf(c.apprenticeId)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatDate(c.issuedAt)}</td>
                  <td className="px-3 py-3 text-ink-muted">{c.evidence.length} file{c.evidence.length === 1 ? '' : 's'}</td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {c.status !== 'revoked' && <button type="button" onClick={() => setRevoking(c.id)} className="text-sm font-medium text-bad-700 hover:underline">Revoke</button>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-ink-muted">No credentials match this filter.</p>}
      </div>

      <RevokeModal
        mode="revoke"
        credentialId={revoking}
        onClose={() => setRevoking(null)}
        onConfirm={(reason) => {
          if (revoking && user) revoke(revoking, reason, user.name);
          setRevoking(null);
        }} />
      
    </>);

}