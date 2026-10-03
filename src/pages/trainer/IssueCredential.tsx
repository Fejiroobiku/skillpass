import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckIcon, LockIcon, ShieldAlertIcon, UserPlusIcon } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Panel } from '../../components/Panel';
import { EvidenceCapture } from '../../components/evidence/EvidenceCapture';
import { IssuePreviewPanel } from '../../components/IssuePreviewPanel';
import { useIssueCredential } from '../../hooks/useIssueCredential';
import { skillLevels } from '../../data/skills';
import { evidencePhotos } from '../../data/evidence';
import { formatDate } from '../../utils/credentials';

export function IssueCredential() {
  const [params] = useSearchParams();
  const form = useIssueCredential(params.get('apprentice'));
  const sample =
  form.me.trade === 'tailoring' ? evidencePhotos.tailoring : form.me.trade === 'mechanic' ? evidencePhotos.mechanic : form.skill?.id === 'el-07' ? evidencePhotos.solar : evidencePhotos.electrical;
  const header = <PageHeader title="Issue Credential" subtitle="Assess a skill against its rubric, with live video evidence." />;

  if (!form.canIssue) {
    const suspended = !!form.me.misconductAt;
    return (
      <>
        {header}
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${suspended ? 'bg-bad-50 text-bad-700' : 'bg-warn-50 text-warn-700'}`}>
            {suspended ? <ShieldAlertIcon className="h-6 w-6" /> : <LockIcon className="h-6 w-6" />}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink">{suspended ? 'Issuing is suspended' : 'Waiting for approval'}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {suspended ?
            `Your credentials are under review: ${form.me.misconductReason}. Your trade association has been informed.` :
            'An administrator must confirm your trade association membership and approve your workshop before you can issue credentials.'}
          </p>
        </div>
      </>);

  }

  if (form.myApprentices.length === 0) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-line bg-white p-8 text-center">
          <UserPlusIcon className="mx-auto h-8 w-8 text-ink-subtle" />
          <h2 className="mt-3 font-semibold text-ink">No apprentices linked yet</h2>
          <p className="mt-1 text-sm text-ink-muted">Apprentices link to you when they register and choose your workshop.</p>
        </div>
      </>);

  }

  return (
    <>
      {header}
      <div role="tablist" aria-label="Apprentice" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5">
        {form.myApprentices.map((a) => {
          const active = a.id === form.apprenticeId;
          return (
            <button key={a.id} role="tab" aria-selected={active} type="button" onClick={() => form.selectApprentice(a.id)} className={`flex min-w-[160px] flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active ? 'bg-brand-600 text-white' : 'text-ink hover:bg-canvas'}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${active ? 'bg-white/20' : 'bg-canvas text-ink-muted'}`}>{a.name.split(' ').map((p) => p[0]).join('')}</span>
              {a.name}
            </button>);

        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Panel title="1. Skill" description={`${form.apprentice?.name} · ${form.tradeName} checklist`} accent>
            <div className="space-y-5">
              {skillLevels.map((level) =>
              <fieldset key={level}>
                  <legend className="mb-2 text-sm font-semibold text-ink">
                    {level}
                    {level === 'Advanced' && <span className="ml-2 font-normal text-ink-muted">always co-signed</span>}
                  </legend>
                  <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {form.tradeSkills.filter((s) => s.level === level).map((s) => {
                    const held = form.heldByApprentice.get(s.id);
                    const selected = form.skillId === s.id;
                    return (
                      <label key={s.id} className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 ${held ? 'cursor-not-allowed bg-canvas' : selected ? 'cursor-pointer bg-brand-50' : 'cursor-pointer hover:bg-canvas'}`}>
                          <input type="radio" name="skill" value={s.id} disabled={!!held} checked={selected} onChange={() => form.setSkillId(s.id)} className="sr-only" />
                          <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${held ? 'border-ok-600 bg-ok-600 text-white' : selected ? 'border-brand-600' : 'border-line'}`}>
                            {held ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
                          </span>
                          <span className={`flex-1 ${held ? 'text-ink-muted' : 'text-ink'}`}>{s.name}</span>
                          {held && <span className="whitespace-nowrap text-xs text-ink-subtle">Issued {formatDate(held.issuedAt)}</span>}
                        </label>);

                  })}
                  </div>
                </fieldset>
              )}
              <p className="text-xs text-ink-muted">Missing a skill? <Link to="/trainer/skills" className="font-medium text-brand-700 hover:underline">Propose it to the administrator</Link>.</p>
              {form.attemptSaved && <p role="status" className="rounded-xl bg-canvas p-3 text-sm text-ink">Recorded as <strong>not yet competent</strong>. Your apprentice has been told to keep practising.</p>}
            </div>
          </Panel>

          {form.skill &&
          <Panel title="2. Rubric" description="Tick only what you actually observed. Every criterion is needed to issue.">
              <ul className="space-y-2">
                {form.rubric.map((c) => {
                const on = form.criteria.includes(c);
                return (
                  <li key={c}>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors duration-150 ${on ? 'border-brand-300 bg-brand-50' : 'border-line hover:bg-canvas'}`}>
                        <input type="checkbox" checked={on} onChange={() => form.toggleCriterion(c)} className="sr-only" />
                        <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line'}`}>{on && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                        <span className="text-ink">{c}</span>
                      </label>
                    </li>);

              })}
              </ul>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-sm text-ink-muted">{form.criteria.length} of {form.rubric.length} observed</p>
                {form.canRecordNotYet &&
              <button type="button" onClick={form.saveNotYet} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas">Record as not yet competent</button>
              }
              </div>
            </Panel>
          }

          <Panel title="3. Live evidence" description="A short video with today's code is required. Photos are optional.">
            <EvidenceCapture value={form.evidence} onChange={form.setEvidence} code={form.code} workshop={form.me.location} sampleUrl={sample} knownHashes={form.evidenceHashes} />
            <div className="mt-5">
              <label htmlFor="note" className="mb-1.5 block text-sm font-semibold text-ink">Observation note <span className="font-normal text-ink-muted">(optional)</span></label>
              <textarea id="note" rows={2} value={form.note} onChange={(e) => form.setNote(e.target.value)} placeholder="Where and how the task was done" className="w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
          </Panel>
        </div>

        <IssuePreviewPanel form={form} />
      </div>
    </>);

}