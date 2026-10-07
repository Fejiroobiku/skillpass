import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon, CheckIcon, CircleIcon, CircleCheckBigIcon, ClockIcon, FileSearchIcon, TriangleAlertIcon } from 'lucide-react';
import type { useIssueCredential } from '../hooks/useIssueCredential';
import { Panel } from './Panel';
import { Pill, StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/credentials';

type Form = ReturnType<typeof useIssueCredential>;

const issuedCopy = {
  pending_apprentice: ['Sent to the apprentice to confirm', 'It becomes valid once they confirm they did the task.'],
  pending_cosign: ['Sent for co-signature', 'It becomes valid once your co-signer approves it.'],
  held_review: ['Held for administrator review', 'You passed today’s issuing limit. An administrator will check it.'],
  valid: ['Credential signed and issued', 'The apprentice has been notified by SMS.']
} as const;

export function IssuePreviewPanel({ form }: {form: Form;}) {
  const { skill, apprentice, me, checks, ready, issued } = form;

  const checkRows = [
  { ok: checks.skill, label: 'Skill selected from the trade checklist' },
  { ok: checks.rubric, label: skill ? `All ${form.rubric.length} rubric criteria observed` : 'Rubric criteria observed' },
  { ok: checks.video, label: `Live video showing code ${form.code}` },
  { ok: checks.unique, label: 'Evidence is new (no re-used files)' },
  { ok: checks.observed, label: 'You confirm you observed the task' },
  ...(form.needsCosign ? [{ ok: checks.cosign, label: form.skill?.requiresCosign ? 'Co-signer chosen (advanced skill)' : `Co-signer chosen (probation ${form.mineCount + 1}/${form.probationCount})` }] : [])];

  const copy = issued ? issuedCopy[issued.status as keyof typeof issuedCopy] : null;

  return (
    <Panel
      title="Credential Preview"
      description="What employers will see on the verification page."
      aside={issued ? <StatusBadge status={issued.status} /> : <Pill tone={ready ? 'ok' : 'neutral'}>{ready ? 'Ready to sign' : `${checkRows.filter((c) => c.ok).length}/${checkRows.length} checks`}</Pill>}
      className="lg:sticky lg:top-24 lg:self-start">
      
      <AnimatePresence mode="wait" initial={false}>
        {issued ?
        <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="space-y-5">
            <div className="rounded-2xl bg-brand-50 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white"><ClockIcon className="h-7 w-7" /></div>
              <p className="mt-4 text-lg font-semibold text-ink">{copy?.[0] ?? 'Issued'}</p>
              <p className="mt-1 text-sm text-ink-muted">{copy?.[1]}</p>
              <p className="mt-4 font-mono text-xl font-semibold tracking-wider text-brand-800">{issued.id}</p>
              <p className="mt-1 font-mono text-xs text-ink-subtle">sig {issued.signature}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to={`/verify/${issued.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-canvas">
                <FileSearchIcon className="h-4 w-4" /> Verification page
              </Link>
              <button type="button" onClick={form.reset} className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Issue another</button>
            </div>
          </motion.div> :

        <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="space-y-5">
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="flex items-center justify-between bg-brand-600 px-4 py-3 text-sm text-white">
                <span className="font-semibold">SkillPass Credential</span>
                <span className="font-mono text-white/80">SP-••••-••••</span>
              </div>
              <dl className="divide-y divide-line text-sm">
                {[
              ['Skill', skill ? `${skill.name} (${skill.level})` : '—'],
              ['Apprentice', apprentice?.name ?? '—'],
              ['Verified by', `${me.name} · trust ${form.trust.score}/100`],
              ['Rubric', skill ? `${form.criteria.length}/${form.rubric.length} criteria` : '—'],
              ['Evidence', form.evidence.length ? `${form.evidence.length} live file${form.evidence.length > 1 ? 's' : ''}` : 'None yet'],
              ['Issued', formatDateTime(new Date().toISOString())]].
              map(([k, v]) =>
              <div key={k} className="grid grid-cols-[100px_1fr] gap-3 px-4 py-2.5">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className={`font-medium ${v === '—' || v === 'None yet' ? 'text-ink-subtle' : 'text-ink'}`}>{v}</dd>
                  </div>
              )}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Integrity checks</h3>
              <ul className="space-y-2">
                {checkRows.map((c) =>
              <li key={c.label} className="flex items-center gap-2.5 text-sm">
                    {c.ok ? <CircleCheckBigIcon className="h-4 w-4 shrink-0 text-ok-600" aria-hidden="true" /> : <CircleIcon className="h-4 w-4 shrink-0 text-line" aria-hidden="true" />}
                    <span className={c.ok ? 'text-ink' : 'text-ink-muted'}>{c.label}</span>
                  </li>
              )}
              </ul>
            </div>

            {form.needsCosign &&
          <div>
                <label htmlFor="cosigner" className="mb-1.5 block text-sm font-semibold text-ink">Co-signer</label>
                <select id="cosigner" value={form.cosignerId} onChange={(e) => form.setCosignerId(e.target.value)} className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
                  <option value="">Choose an approved trainer or employer</option>
                  <optgroup label="Approved trainers">
                    {form.cosignTrainers.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.workshop}</option>)}
                  </optgroup>
                  {form.cosignEmployers.length > 0 &&
              <optgroup label="Verified employers">
                      {form.cosignEmployers.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.company}</option>)}
                    </optgroup>
              }
                </select>
                {form.onProbation && !skill?.requiresCosign && <p className="mt-1.5 text-xs text-ink-muted">You're on probation: your first {form.probationCount} credentials are all co-signed.</p>}
              </div>
          }

            {form.overLimit &&
          <div role="status" className="flex gap-2.5 rounded-xl bg-warn-50 p-3.5 text-sm text-warn-700">
                <TriangleAlertIcon className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden="true" />
                You've issued {form.todayCount} credentials today. This one will be held for administrator review.
              </div>
          }
            {form.risk?.level === 'high' &&
          <div role="status" className="flex gap-2.5 rounded-xl bg-warn-50 p-3.5 text-sm text-warn-700">
                <TriangleAlertIcon className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden="true" />
                Your recent pattern ({form.risk.signals.map((s) => s.label.toLowerCase()).join(', ')}) means this credential will also be audited.
              </div>
          }

            <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-4 text-sm">
              <input type="checkbox" checked={form.observed} onChange={(e) => form.setObserved(e.target.checked)} className="sr-only" />
              <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${form.observed ? 'border-brand-600 bg-brand-600 text-white' : 'border-line'}`}>
                {form.observed && <CheckIcon className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className="text-ink">
                I personally watched <strong>{apprentice?.name}</strong> perform this task to standard. I understand this record carries my name and trust score, and may be audited.
              </span>
            </label>

            {form.error && <p role="alert" className="rounded-xl bg-bad-50 p-3.5 text-sm font-medium text-bad-700">{form.error}</p>}

            <div>
              <button type="button" disabled={!ready || form.busy} onClick={form.submit} className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-5 py-4 text-base font-semibold text-white transition-colors duration-150 hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-200">
                <CircleCheckBigIcon className="h-5 w-5" /> Sign & Issue <ArrowRightIcon className="h-5 w-5" />
              </button>
              <p className="mt-2 text-center text-xs text-ink-muted">The apprentice must confirm before it becomes valid. Apprentices cannot create or edit credentials.</p>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </Panel>);

}