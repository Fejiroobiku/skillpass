import React, { useState } from 'react';
import { CheckIcon, LockIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { outOfScope } from '../../data/pilot';

function Toggle({ checked, onChange, label }: {checked: boolean;onChange: (v: boolean) => void;label: string;}) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${checked ? 'bg-brand-600' : 'bg-line'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>);

}

export function AdminSettings() {
  const { user } = useAuth();
  const { settings, updateSettings } = useSkillPass();
  const [limit, setLimit] = useState(settings.dailyLimit);
  const [rate, setRate] = useState(settings.auditRatePct);
  const [saved, setSaved] = useState(false);
  const actor = user?.name ?? 'Administrator';
  const [probation, setProbation] = useState(settings.probationCount);
  const dirty = limit !== settings.dailyLimit || rate !== settings.auditRatePct || probation !== settings.probationCount;

  const locked = [
  { name: 'Evidence before credential', text: 'At least one photo or video on every credential.' },
  { name: 'Co-signature for advanced skills', text: 'A second approved trainer or approved employer must co-sign.' },
  { name: 'Tamper resistance', text: 'Server-signed credentials and an append-only audit log.' },
  { name: 'Revoked stays visible', text: 'Revoked credentials remain on the verification page, marked revoked.' }];


  const security = ['Passwords hashed with Argon2id', 'HTTPS everywhere (TLS 1.3)', 'Credentials signed with Ed25519 server key · fingerprint 7F:2A:91:C4', 'Role-based access control on every REST endpoint', 'Evidence stored privately; signed URLs expire after 10 minutes'];

  return (
    <>
      <PageHeader title="Settings" subtitle="Integrity engine rules and notification gateways for the pilot." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Integrity rules" description="Adjustable thresholds. Changes are written to the audit log.">
          <div className="space-y-5">
            <div>
              <label htmlFor="limit" className="block text-sm font-semibold text-ink">Daily issuing limit per trainer</label>
              <p className="text-xs text-ink-muted">Credentials beyond this are held for administrator review.</p>
              <input id="limit" type="number" min={1} max={50} value={limit} onChange={(e) => {setLimit(Math.max(1, Number(e.target.value)));setSaved(false);}} className="mt-2 w-28 rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label htmlFor="rate" className="block text-sm font-semibold text-ink">Random audit sample rate</label>
              <p className="text-xs text-ink-muted">Share of valid credentials drawn for independent re-check.</p>
              <div className="mt-2 flex items-center gap-3">
                <input id="rate" type="range" min={1} max={30} value={rate} onChange={(e) => {setRate(Number(e.target.value));setSaved(false);}} className="flex-1 accent-brand-600" />
                <span className="w-12 text-right text-sm font-semibold text-ink">{rate}%</span>
              </div>
            </div>
            <div>
              <label htmlFor="probation" className="block text-sm font-semibold text-ink">Probation period for new trainers</label>
              <p className="text-xs text-ink-muted">Number of first credentials that must all be co-signed.</p>
              <input id="probation" type="number" min={0} max={50} value={probation} onChange={(e) => {setProbation(Math.max(0, Number(e.target.value)));setSaved(false);}} className="mt-2 w-28 rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <p className="rounded-xl bg-canvas p-3 text-xs text-ink-muted">Risk-based audits trigger when a trainer signs credentials under {settings.fastMinutes} min apart, passes ≥95% of 5+ assessments, issues {settings.clusterThreshold}+ in one day, gets 2+ poor employer ratings, or has an open apprentice report.</p>
            <div className="flex items-center gap-3">
              <button type="button" disabled={!dirty} onClick={() => {updateSettings({ dailyLimit: limit, auditRatePct: rate, probationCount: probation }, actor);setSaved(true);}} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Save rules</button>
              {saved && <span role="status" className="flex items-center gap-1 text-sm font-medium text-ok-700"><CheckIcon className="h-4 w-4" /> Saved</span>}
            </div>
            <ul className="space-y-3 border-t border-line pt-5">
              {locked.map((l) =>
              <li key={l.name} className="flex gap-3">
                  <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  <div><p className="text-sm font-medium text-ink">{l.name}</p><p className="text-xs text-ink-muted">{l.text}</p></div>
                </li>
              )}
            </ul>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Notification gateways">
            <ul className="divide-y divide-line">
              <li className="flex items-center justify-between gap-4 pb-4">
                <div><p className="text-sm font-medium text-ink">SMS gateway</p><p className="text-xs text-ink-muted">Referrals, verified skills and co-sign requests</p></div>
                <Toggle label="SMS gateway" checked={settings.smsEnabled} onChange={(v) => updateSettings({ smsEnabled: v }, actor)} />
              </li>
              <li className="flex items-center justify-between gap-4 pt-4">
                <div><p className="text-sm font-medium text-ink">E-mail service</p><p className="text-xs text-ink-muted">Account and admin notices</p></div>
                <Toggle label="E-mail service" checked={settings.emailEnabled} onChange={(v) => updateSettings({ emailEnabled: v }, actor)} />
              </li>
            </ul>
          </Panel>
          <Panel title="Security">
            <ul className="space-y-2 text-sm text-ink">
              {security.map((s) => <li key={s} className="flex gap-2"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ok-600" />{s}</li>)}
            </ul>
          </Panel>
          <Panel title="Outside this pilot" description="Listed as future work.">
            <ul className="flex flex-wrap gap-2">
              {outOfScope.map((s) => <li key={s} className="rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-ink-muted">{s}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>);

}