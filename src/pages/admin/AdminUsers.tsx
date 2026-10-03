import React, { useState } from 'react';
import type { Role } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Pill } from '../../components/StatusBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabel } from '../../data/navigation';
import { associations } from '../../data/integrity';
import { formatDate, initials } from '../../utils/credentials';

type Filter = 'all' | 'pending' | Exclude<Role, 'admin'>;

export function AdminUsers() {
  const { accounts, user, setAccountStatus } = useAuth();
  const { trainers, apprentices, employers, trades, nameOf, approveProfile, verifyMembership } = useSkillPass();
  const [filter, setFilter] = useState<Filter>('all');
  const actor = user?.name ?? 'Administrator';

  const rows = accounts.
  filter((a) => a.role !== 'admin').
  map((a) => {
    const t = trainers.find((x) => x.id === a.id);
    const ap = apprentices.find((x) => x.id === a.id);
    const e = employers.find((x) => x.id === a.id);
    const profile = t ?? ap ?? e;
    const approved = t ? t.approved : e ? e.approved : true;
    const assoc = associations.find((x) => x.id === t?.associationId);
    const detail = t ? `${t.workshop} · ${assoc?.name.split(' — ')[0] ?? 'No association'} ${t.membershipNo}${t.membershipVerified ? ' ✓' : ''}` : ap ? `Trainer: ${nameOf(ap.trainerId)}` : e ? e.company : '';
    return { account: a, name: nameOf(a.id), trade: trades.find((x) => x.id === profile?.trade)?.name ?? '—', location: profile?.location.name ?? '—', detail, approved, needsMembership: !!t && !t.membershipVerified };
  });
  const visible = rows.filter((r) => filter === 'all' ? true : filter === 'pending' ? !r.approved : r.account.role === filter);

  const filters: {id: Filter;label: string;}[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Awaiting approval' },
  { id: 'trainer', label: 'Trainers' },
  { id: 'apprentice', label: 'Apprentices' },
  { id: 'employer', label: 'Employers' }];


  return (
    <>
      <PageHeader title="Users" subtitle="Approve trainers and employers, and suspend accounts that break pilot rules." />
      <div role="tablist" aria-label="Filter users" className="mb-4 flex gap-1 overflow-x-auto">
        {filters.map((f) => {
          const count = f.id === 'all' ? rows.length : f.id === 'pending' ? rows.filter((r) => !r.approved).length : rows.filter((r) => r.account.role === f.id).length;
          return (
            <button key={f.id} role="tab" aria-selected={filter === f.id} type="button" onClick={() => setFilter(f.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${filter === f.id ? 'bg-ink text-white' : 'bg-white text-ink-muted ring-1 ring-inset ring-line hover:text-ink'}`}>
              {f.label} <span className={filter === f.id ? 'text-white/70' : 'text-ink-subtle'}>{count}</span>
            </button>);

        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Name</th>
                <th scope="col" className="px-3 py-3 font-medium">Role</th>
                <th scope="col" className="px-3 py-3 font-medium">Trade & location</th>
                <th scope="col" className="px-3 py-3 font-medium">Joined</th>
                <th scope="col" className="px-3 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => {
                const s = r.account.status;
                return (
                  <tr key={r.account.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">{initials(r.name)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{r.name}</p>
                          <p className="truncate text-xs text-ink-muted">{r.account.email} · {r.detail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink">{roleLabel[r.account.role]}</td>
                    <td className="px-3 py-3"><p className="text-ink">{r.trade}</p><p className="text-xs text-ink-muted">{r.location}</p></td>
                    <td className="whitespace-nowrap px-3 py-3 text-ink-muted">{formatDate(r.account.createdAt)}</td>
                    <td className="px-3 py-3">
                      {s === 'suspended' ? <Pill tone="bad">Suspended</Pill> : s === 'withdrawn' ? <Pill tone="neutral">Consent withdrawn</Pill> : !r.approved ? <Pill tone="warn">Awaiting approval</Pill> : <Pill tone="ok">Active</Pill>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!r.approved && s === 'active' && r.needsMembership &&
                        <button type="button" onClick={() => verifyMembership(r.account.id, actor)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">Confirm membership</button>
                        }
                        {!r.approved && s === 'active' &&
                        <button type="button" disabled={r.needsMembership} title={r.needsMembership ? 'Confirm trade association membership first' : undefined} onClick={() => approveProfile(r.account.id, actor)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Approve</button>
                        }
                        {s === 'active' &&
                        <button type="button" onClick={() => setAccountStatus(r.account.id, 'suspended', actor)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-bad-700 hover:bg-bad-50">Suspend</button>
                        }
                        {s === 'suspended' &&
                        <button type="button" onClick={() => setAccountStatus(r.account.id, 'active', actor)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">Reactivate</button>
                        }
                      </div>
                    </td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <p className="p-10 text-center text-sm text-ink-muted">No users in this group.</p>}
      </div>
    </>);

}