import React, { useState } from 'react';
import { PlusIcon, UsersRoundIcon } from 'lucide-react';
import type { SkillLevel } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Pill } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { skillLevels } from '../../data/skills';

export function AdminSkills() {
  const { user } = useAuth();
  const { trades, skills, nameOf, addSkill, addTrade, reviewSkill } = useSkillPass();
  const actor = user?.name ?? 'Administrator';
  const [tradeId, setTradeId] = useState(trades[0]?.id ?? '');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SkillLevel>('Foundation');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [newTrade, setNewTrade] = useState('');

  const proposals = skills.filter((s) => s.status === 'proposed');
  const active = skills.filter((s) => s.trade === tradeId && s.status === 'active');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 5) return;
    addSkill(tradeId, name.trim(), level, actor);
    setName('');
  };

  return (
    <>
      <PageHeader
        title="Trades & Skills"
        subtitle="Manage the pre-loaded checklists and review skills proposed by trainers."
        actions={
        <button type="button" onClick={() => setTradeOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas">
            <PlusIcon className="h-4 w-4" /> Add trade
          </button>
        } />
      

      {proposals.length > 0 &&
      <Panel className="mb-6" title="Proposed by trainers" description={`${proposals.length} waiting for review`}>
          <ul className="divide-y divide-line">
            {proposals.map((s) =>
          <li key={s.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-muted">{trades.find((t) => t.id === s.trade)?.name} · {s.level} · proposed by {nameOf(s.proposedBy)}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => reviewSkill(s.id, false, actor)} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas">Decline</button>
                  <button type="button" onClick={() => reviewSkill(s.id, true, actor)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">Add to checklist</button>
                </div>
              </li>
          )}
          </ul>
        </Panel>
      }

      <div role="tablist" aria-label="Trade" className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
        {trades.map((t) =>
        <button key={t.id} role="tab" aria-selected={tradeId === t.id} type="button" onClick={() => setTradeId(t.id)} className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${tradeId === t.id ? 'bg-brand-600 text-white' : 'text-ink hover:bg-canvas'}`}>
            {t.name}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Checklist" description={`${active.length} active skills`}>
          <div className="space-y-5">
            {skillLevels.map((lvl) => {
              const list = active.filter((s) => s.level === lvl);
              return (
                <div key={lvl}>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    {lvl}
                    {lvl === 'Advanced' && <Pill tone="warn"><UsersRoundIcon className="h-3 w-3" /> Co-signer required</Pill>}
                  </h3>
                  {list.length === 0 ?
                  <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink-muted">No {lvl.toLowerCase()} skills yet.</p> :

                  <ul className="divide-y divide-line rounded-xl border border-line">
                      {list.map((s) => <li key={s.id} className="px-4 py-3 text-sm text-ink">{s.name}</li>)}
                    </ul>
                  }
                </div>);

            })}
          </div>
        </Panel>

        <Panel title="Add a skill" className="self-start">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="admin-skill" className="block text-sm font-semibold text-ink">Skill name</label>
              <input id="admin-skill" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Level</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
                {skillLevels.map((l) =>
                <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150 ${level === l ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>{l}</button>
                )}
              </div>
            </fieldset>
            <button type="submit" disabled={name.trim().length < 5} className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Add to {trades.find((t) => t.id === tradeId)?.name}</button>
          </form>
        </Panel>
      </div>

      <Modal open={tradeOpen} title="Add a trade" onClose={() => setTradeOpen(false)}>
        <label htmlFor="new-trade" className="block text-sm font-semibold text-ink">Trade name</label>
        <input id="new-trade" value={newTrade} onChange={(e) => setNewTrade(e.target.value)} placeholder="e.g. Plumbing" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setTradeOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
          <button type="button" disabled={newTrade.trim().length < 3} onClick={() => {setTradeId(addTrade(newTrade.trim(), actor));setNewTrade('');setTradeOpen(false);}} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">Create trade</button>
        </div>
      </Modal>
    </>);

}