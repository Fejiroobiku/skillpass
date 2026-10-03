import React from 'react';
import { BadgeCheckIcon, CheckIcon, CircleAlertIcon, ClockIcon, FingerprintIcon, MapPinIcon, ShieldXIcon, UserCheckIcon } from 'lucide-react';
import type { Credential } from '../types/skillpass';
import { useSkillPass } from '../contexts/SkillPassContext';
import { associations, rubricFor } from '../data/integrity';
import { formatDate, formatDateTime } from '../utils/credentials';

const banner = {
  valid: { cls: 'bg-ok-50 text-ok-700', icon: BadgeCheckIcon, title: 'Valid credential', text: 'Signed by an approved trainer, confirmed by the apprentice, with live evidence on file.' },
  flagged: { cls: 'bg-warn-50 text-warn-700', icon: CircleAlertIcon, title: 'Flagged — under review', text: 'Someone has challenged this credential. An administrator is reviewing it.' },
  under_review: { cls: 'bg-warn-50 text-warn-700', icon: CircleAlertIcon, title: 'Under review', text: 'The issuing trainer was found to have issued false credentials. Every credential they signed is being re-checked.' },
  revoked: { cls: 'bg-bad-50 text-bad-700', icon: ShieldXIcon, title: 'Revoked', text: 'This credential is no longer valid. Its history is kept for transparency.' },
  pending_apprentice: { cls: 'bg-canvas text-ink-muted', icon: ClockIcon, title: 'Not yet valid', text: 'Waiting for the apprentice to confirm they performed the task.' },
  pending_cosign: { cls: 'bg-canvas text-ink-muted', icon: ClockIcon, title: 'Not yet valid', text: 'Waiting for a second trainer or verified employer to co-sign.' },
  held_review: { cls: 'bg-canvas text-ink-muted', icon: ClockIcon, title: 'Not yet valid', text: 'Held for administrator review before it becomes valid.' }
};

export function CredentialRecord({ credential }: {credential: Credential;}) {
  const { trainers, apprentices, skills, trades, auditLog, nameOf, trustOf } = useSkillPass();
  const skill = skills.find((s) => s.id === credential.skillId);
  const apprentice = apprentices.find((a) => a.id === credential.apprenticeId);
  const trainer = trainers.find((t) => t.id === credential.trainerId);
  const trust = trainer ? trustOf(trainer.id) : null;
  const assoc = associations.find((a) => a.id === trainer?.associationId);
  const history = auditLog.filter((e) => e.target === credential.id).slice().reverse();
  const rubric = rubricFor(credential.skillId);
  const b = banner[credential.status];
  const trustTone = !trust || trust.misconduct || trust.score < 50 ? 'text-bad-700' : trust.score < 70 ? 'text-warn-700' : 'text-ok-700';

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className={`flex items-start gap-3 px-5 py-4 md:px-6 ${b.cls}`}>
        <b.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">{b.title}</p>
          <p className="text-sm opacity-90">{credential.revokeReason ?? b.text}</p>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1.3fr_1fr] md:p-6">
        <div>
          <p className="text-sm text-ink-muted">{skill?.level} · {trades.find((t) => t.id === skill?.trade)?.name}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{skill?.name}</h2>

          <div className="mt-5 flex items-center gap-4 rounded-xl border border-line p-4">
            <div className="text-center">
              <p className={`text-3xl font-semibold ${trustTone}`}>{trust?.score ?? '—'}</p>
              <p className="text-[11px] text-ink-muted">trust score</p>
            </div>
            <div className="min-w-0 border-l border-line pl-4">
              <p className="text-xs text-ink-muted">Verified by</p>
              <p className="font-semibold text-ink">{trainer?.name}</p>
              <p className="truncate text-xs text-ink-muted">{trainer?.workshop}</p>
              {assoc && <p className="truncate text-xs text-ink-subtle">{assoc.name}{trainer?.membershipVerified ? ' · member verified' : ''}</p>}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><dt className="text-ink-muted">Apprentice</dt><dd className="mt-0.5 font-medium text-ink">{apprentice?.name}</dd></div>
            <div><dt className="text-ink-muted">Date observed</dt><dd className="mt-0.5 font-medium text-ink">{formatDate(credential.issuedAt)}</dd></div>
            <div>
              <dt className="text-ink-muted">Apprentice confirmed</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-ink">{credential.apprenticeConfirmedAt ? <><UserCheckIcon className="h-4 w-4 text-ok-600" /> {formatDate(credential.apprenticeConfirmedAt)}</> : 'Pending'}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Co-signed by</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {credential.cosignerId ? nameOf(credential.cosignerId) : credential.needsCosign ? 'Pending' : 'Not required'}
                {credential.cosignReason === 'probation' && <span className="block text-xs font-normal text-ink-muted">Trainer on probation</span>}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-muted">Credential ID & server signature</dt>
              <dd className="mt-0.5 break-all font-mono text-ink">{credential.id} <span className="text-ink-subtle">· {credential.signature}</span></dd>
            </div>
          </dl>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink">Rubric · {credential.criteriaMet.length}/{rubric.length} observed</h3>
            <ul className="space-y-1.5">
              {rubric.map((r) => {
                const met = credential.criteriaMet.includes(r);
                return (
                  <li key={r} className={`flex items-start gap-2 text-sm ${met ? 'text-ink' : 'text-ink-subtle line-through'}`}>
                    <CheckIcon className={`mt-0.5 h-4 w-4 shrink-0 ${met ? 'text-ok-600' : 'text-line'}`} aria-hidden="true" /> {r}
                  </li>);

              })}
            </ul>
          </div>
          {credential.note && <p className="mt-5 border-l-2 border-brand-200 pl-3 text-sm italic text-ink-muted">“{credential.note}”</p>}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Live evidence</h3>
            <div className="space-y-3">
              {credential.evidence.map((ev) =>
              <figure key={ev.id}>
                  {ev.kind === 'video' && ev.source === 'camera' ?
                <video src={ev.url} poster={ev.poster} controls className="aspect-[4/3] w-full rounded-xl bg-ink object-cover" /> :

                <div className="relative">
                      <img src={ev.poster ?? ev.url} alt={ev.caption} className="aspect-[4/3] w-full rounded-xl object-cover" />
                      {ev.kind === 'video' && <span className="absolute left-2 top-2 rounded-lg bg-white px-2 py-1 font-mono text-xs font-semibold text-ink">code {ev.challengeCode} · {ev.durationSec}s video</span>}
                    </div>
                }
                  <figcaption className="mt-1.5 space-y-0.5 text-xs text-ink-muted">
                    <p className="text-ink">{ev.caption}</p>
                    <p className="flex items-center gap-1"><ClockIcon className="h-3 w-3" /> {formatDateTime(ev.capturedAt)}</p>
                    <p className="flex items-center gap-1"><MapPinIcon className="h-3 w-3" /> {ev.locationLabel}</p>
                    <p className="flex items-center gap-1 font-mono text-ink-subtle"><FingerprintIcon className="h-3 w-3" /> {ev.hash.slice(0, 20)}…</p>
                  </figcaption>
                </figure>
              )}
            </div>
          </div>
          {history.length > 0 &&
          <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">History</h3>
              <ol className="space-y-2 border-l border-line pl-4">
                {history.map((h) =>
              <li key={h.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
                    <p className="font-medium capitalize text-ink">{h.action.split('.')[1].replace('_', ' ')} · {h.actor}</p>
                    <p className="text-ink-subtle">{formatDateTime(h.at)}</p>
                  </li>
              )}
              </ol>
            </div>
          }
        </div>
      </div>
    </article>);

}