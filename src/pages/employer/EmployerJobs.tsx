import React, { useState } from 'react';
import { CheckIcon, MapPinIcon, PlusIcon, SendIcon } from 'lucide-react';
import type { TradeId } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { Modal } from '../../components/Modal';
import { Pill } from '../../components/StatusBadge';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useAuth } from '../../contexts/AuthContext';
import { places } from '../../data/people';
import { rankMatches } from '../../utils/matching';
import { formatDate } from '../../utils/credentials';

export function EmployerJobs() {
  const { user } = useAuth();
  const { jobs, credentials, referrals, apprentices, trainers: allTrainers, skills: allSkills, trades, postJob, sendReferral } = useSkillPass();
  const skills = allSkills.filter((s) => s.status === 'active');
  const me = { id: user?.id ?? '', name: user?.name ?? '' };
  const myJobs = jobs.filter((j) => j.employerId === me.id);
  const [selectedId, setSelectedId] = useState(myJobs[0]?.id ?? '');
  const selected = myJobs.find((j) => j.id === selectedId) ?? myJobs[0];
  const matches = selected ? rankMatches(selected, apprentices, credentials) : [];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [trade, setTrade] = useState<TradeId>('electrical');
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [placeKey, setPlaceKey] = useState('lekki');
  const [pay, setPay] = useState('');

  const create = () => {
    const job = postJob({ employerId: me.id, title: title.trim(), trade, skillIds, location: places[placeKey], pay: pay.trim() || 'Negotiable' });
    setSelectedId(job.id);
    setOpen(false);
    setTitle('');
    setSkillIds([]);
    setPay('');
  };

  return (
    <div>
      <PageHeader
        title="Jobs & Matches"
        subtitle="Post a job and we rank apprentices by verified skills and distance."
        actions={
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">
            <PlusIcon className="h-4 w-4" /> Post a job
          </button>
        } />
      

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <nav aria-label="Your jobs" className="space-y-2">
          {myJobs.length === 0 &&
          <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-ink-muted">No jobs yet. Post one to see ranked matches.</p>
          }
          {myJobs.map((j) => {
            const active = j.id === selected?.id;
            return (
              <button key={j.id} type="button" onClick={() => setSelectedId(j.id)} aria-current={active} className={`w-full rounded-2xl border p-4 text-left transition-colors duration-150 ${active ? 'border-brand-500 bg-brand-50' : 'border-line bg-white hover:bg-canvas'}`}>
                <p className="font-semibold text-ink">{j.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{j.location.name} · {j.pay}</p>
                <p className="mt-1 text-xs text-ink-subtle">Posted {formatDate(j.postedAt)} · {j.skillIds.length} required skills</p>
              </button>);

          })}
        </nav>

        {selected &&
        <Panel title="Ranked matches" description={`Only skills with a valid credential count. ${matches.length} apprentice${matches.length === 1 ? '' : 's'} qualify.`}>
            {matches.length === 0 ?
          <p className="rounded-xl bg-canvas p-6 text-center text-sm text-ink-muted">No apprentices hold a verified credential for these skills yet.</p> :

          <ol className="divide-y divide-line">
                {matches.map((m, i) => {
              const ref = referrals.find((r) => r.jobId === selected.id && r.apprenticeId === m.apprentice.id);
              const trainer = allTrainers.find((t) => t.id === m.apprentice.trainerId);
              return (
                <li key={m.apprentice.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center">
                      <span className="w-6 text-sm font-semibold text-ink-subtle">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-ink">{m.apprentice.name}</p>
                          <span className="text-sm font-semibold text-brand-700">{m.score}%</span>
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted"><MapPinIcon className="h-3.5 w-3.5" /> {m.apprentice.location.name} · {m.distance.toFixed(1)} km · trained by {trainer?.name}</p>
                        <p className="mt-1.5 text-xs text-ink-muted">
                          <span className="font-medium text-ok-700">{m.matchedSkillIds.length}/{selected.skillIds.length} skills verified</span>
                          {m.missingSkillIds.length > 0 && <> · missing {m.missingSkillIds.map((id) => skills.find((s) => s.id === id)?.name).join(', ')}</>}
                        </p>
                      </div>
                      {ref ?
                  <Pill tone="ok"><CheckIcon className="h-3.5 w-3.5" /> {ref.status === 'sent' ? 'Referral sent' : ref.status === 'accepted' ? 'Interested' : ref.status === 'contacted' ? 'Contacted' : 'Declined'}</Pill> :

                  <button type="button" onClick={() => sendReferral(selected.id, m.apprentice.id, me.id)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-canvas">
                          <SendIcon className="h-4 w-4" /> Send referral
                        </button>
                  }
                    </li>);

            })}
              </ol>
          }
          </Panel>
        }
      </div>

      <Modal open={open} title="Post a job" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="job-title" className="block text-sm font-semibold text-ink">Job title</label>
            <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" placeholder="e.g. Wire a new shop in Lekki" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-trade" className="block text-sm font-semibold text-ink">Trade</label>
              <select id="job-trade" value={trade} onChange={(e) => {setTrade(e.target.value as TradeId);setSkillIds([]);}} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
                {trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="job-place" className="block text-sm font-semibold text-ink">Location</label>
              <select id="job-place" value={placeKey} onChange={(e) => setPlaceKey(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm">
                {Object.entries(places).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Required skills</legend>
            <div className="mt-1.5 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {skills.filter((s) => s.trade === trade).map((s) =>
              <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-canvas">
                  <input type="checkbox" checked={skillIds.includes(s.id)} onChange={(e) => setSkillIds(e.target.checked ? [...skillIds, s.id] : skillIds.filter((x) => x !== s.id))} className="h-4 w-4 accent-brand-600" />
                  {s.name}
                </label>
              )}
            </div>
          </fieldset>
          <div>
            <label htmlFor="job-pay" className="block text-sm font-semibold text-ink">Pay</label>
            <input id="job-pay" value={pay} onChange={(e) => setPay(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" placeholder="e.g. ₦150,000 fixed" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas">Cancel</button>
            <button type="button" disabled={!title.trim() || skillIds.length === 0} onClick={create} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-40">Post & find matches</button>
          </div>
        </div>
      </Modal>
    </div>);

}