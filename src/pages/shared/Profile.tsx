import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Modal } from '../../components/Modal';
import { Pill } from '../../components/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { roleLabel } from '../../data/navigation';
import { ageFrom, formatDate, initials } from '../../utils/credentials';
import { associations } from '../../data/integrity';

export function Profile() {
  const { user, withdrawConsent } = useAuth();
  const sp = useSkillPass();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  if (!user) return null;

  const t = sp.trainers.find((x) => x.id === user.id);
  const a = sp.apprentices.find((x) => x.id === user.id);
  const e = sp.employers.find((x) => x.id === user.id);
  const profile = t ?? a ?? e;
  const tradeName = sp.trades.find((x) => x.id === profile?.trade)?.name;

  const rows: [string, React.ReactNode][] = [
  ['Email', user.email],
  ['Phone', profile?.phone ?? '—'],
  ...(profile ? [['Trade', tradeName], ['Location', profile.location.name]] as [string, React.ReactNode][] : []),
  ...(t ? [['Workshop', t.workshop], ['Approval', t.approved ? <Pill tone="ok">Approved to issue</Pill> : <Pill tone="warn">Awaiting approval</Pill>], ['Association', `${associations.find((x) => x.id === t.associationId)?.name ?? '—'} · ${t.membershipNo}`], ['Trust score', `${sp.trustOf(t.id).score} / 100`]] as [string, React.ReactNode][] : []),
  ...(a ? [['Trainer', `${sp.nameOf(a.trainerId)} · ${sp.trainers.find((x) => x.id === a.trainerId)?.workshop ?? ''}`], ['Apprentice since', formatDate(a.startedAt)]] as [string, React.ReactNode][] : []),
  ...(e ? [['Company', e.company], ['Co-signing', e.approved ? <Pill tone="ok">Approved</Pill> : <Pill tone="warn">Awaiting approval</Pill>]] as [string, React.ReactNode][] : []),
  ['Member since', formatDate(user.account.createdAt)]];


  return (
    <>
      <PageHeader title="My Profile" subtitle="Your account details and data consent." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex items-center gap-4 border-b border-line pb-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-600 text-xl font-semibold text-white">{initials(user.name)}</span>
            <div>
              <h2 className="text-xl font-semibold text-ink">{user.name}</h2>
              <p className="text-sm text-ink-muted">{roleLabel[user.role]} · {user.title}</p>
            </div>
          </div>
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) =>
            <div key={k} className="grid grid-cols-[140px_1fr] gap-4 py-3 text-sm">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-medium text-ink">{v}</dd>
              </div>
            )}
          </dl>
        </Panel>

        <Panel title="Data & consent" description="Nigeria Data Protection Act 2023" className="self-start">
          <div className="flex gap-3 rounded-xl bg-ok-50 p-4 text-sm text-ok-700">
            <ShieldCheckIcon className="h-5 w-5 shrink-0" />
            <p>Consent given {formatDate(user.account.consentAt)}. Age confirmed 18+ ({ageFrom(user.account.dob)}).</p>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-ink-muted">
            <li>We collect only what SkillPass needs: name, phone, trade, location and evidence photos.</li>
            <li>Employers see only the fields on the public verification page.</li>
            <li>Evidence is stored privately and shown only on your credential pages.</li>
          </ul>
          {user.role !== 'admin' &&
          <button type="button" onClick={() => setConfirming(true)} className="mt-5 w-full rounded-xl border border-bad-200 px-4 py-2.5 text-sm font-semibold text-bad-700 hover:bg-bad-50">Withdraw consent & close account</button>
          }
        </Panel>
      </div>

      <Modal open={confirming} title="Withdraw consent?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-ink-muted">Your account will be closed and your personal data scheduled for deletion. Credentials already verified stay on the audit log in anonymised form, as required for integrity.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Keep my account</button>
          <button type="button" onClick={() => {withdrawConsent();navigate('/login');}} className="rounded-xl bg-bad-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-bad-700">Withdraw consent</button>
        </div>
      </Modal>
    </>);

}