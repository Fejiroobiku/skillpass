import React, { useState } from 'react';
import { UsersRoundIcon } from 'lucide-react';
import type { SkillLevel } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Pill } from '../../components/StatusBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { skillLevels } from '../../data/skills';

export function TrainerSkills() {
  const { user } = useAuth();
  const { skills, trainers, trades, proposeSkill } = useSkillPass();
  const me = trainers.find((t) => t.id === user?.id)!;
  const tradeName = trades.find((t) => t.id === me.trade)?.name;
  const active = skills.filter((s) => s.trade === me.trade && s.status === 'active');
  const myProposals = skills.filter((s) => s.proposedBy === me.id);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SkillLevel>('Intermediate');
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 5) return;
    proposeSkill(me.id, me.trade, name.trim(), level);
    setName('');
    setSent(true);
  };

  return (
    <>
      <PageHeader title="Skill Framework" subtitle={`The pre-loaded ${tradeName} checklist, grouped by level.`} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={`${tradeName} checklist`} description={`${active.length} active skills`}>
          <div className="space-y-6">
            {skillLevels.map((lvl) =>
            <div key={lvl}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                  {lvl}
                  {lvl === 'Advanced' && <Pill tone="warn"><UsersRoundIcon className="h-3 w-3" /> Co-signer required</Pill>}
                </h3>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {active.filter((s) => s.level === lvl).map((s) =>
                <li key={s.id} className="px-4 py-3 text-sm text-ink">{s.name}</li>
                )}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Propose a skill" description="An administrator reviews proposals before they join the checklist.">
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="skill-name" className="block text-sm font-semibold text-ink">Skill</label>
                <input id="skill-name" value={name} onChange={(e) => {setName(e.target.value);setSent(false);}} placeholder="e.g. Install a surge protection device" className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Level</legend>
                <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-canvas p-1">
                  {skillLevels.map((l) =>
                  <button key={l} type="button" onClick={() => setLevel(l)} aria-pressed={level === l} className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors duration-150 ${level === l ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}>{l}</button>
                  )}
                </div>
                {level === 'Advanced' && <p className="mt-2 text-xs text-ink-muted">Advanced skills always need a co-signer.</p>}
              </fieldset>
              <button type="submit" disabled={name.trim().length < 5} className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-40">Send proposal</button>
              {sent && <p role="status" className="text-sm font-medium text-ok-700">Proposal sent to the administrator.</p>}
            </form>
          </Panel>

          <Panel title="Your proposals">
            {myProposals.length === 0 ?
            <p className="text-sm text-ink-muted">No proposals yet.</p> :

            <ul className="divide-y divide-line">
                {myProposals.map((s) =>
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink-muted">{s.level}</p>
                    </div>
                    <Pill tone={s.status === 'active' ? 'ok' : s.status === 'rejected' ? 'bad' : 'neutral'}>{s.status === 'active' ? 'Approved' : s.status === 'rejected' ? 'Declined' : 'In review'}</Pill>
                  </li>
              )}
              </ul>
            }
          </Panel>
        </div>
      </div>
    </>);

}