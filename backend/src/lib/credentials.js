import { config } from '../config.js';
import { logAudit, notify } from './audit.js';

const iso = (d) => (d ? new Date(d).toISOString() : undefined);

const CREDENTIAL_COLUMNS = `
  c.id, c.apprentice_id, c.trainer_id, c.skill_id, c.issued_at, c.status, c.criteria_met, c.note, c.needs_cosign,
  c.cosign_reason, c.cosign_requested_from, c.cosigner_id, c.apprentice_confirmed_at, c.held_for_review, c.held_cleared,
  c.signature, c.revoke_reason`;

/** Evidence stored by this API lives under /uploads; seed/demo files are served by the frontend itself. */
const publicUrl = (u) => (u && u.startsWith('/uploads/') ? `${config.publicUrl}${u}` : u ?? undefined);

export function mapEvidence(r) {
  return {
    id: r.id,
    kind: r.kind,
    url: publicUrl(r.url),
    poster: publicUrl(r.poster_url),
    caption: r.caption,
    capturedAt: iso(r.captured_at),
    locationLabel: r.location_label,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    hash: r.sha256,
    challengeCode: r.challenge_code ?? undefined,
    durationSec: r.duration_sec ?? undefined,
    source: r.source,
  };
}

/** Same shape as the frontend's Credential type, so the UI types keep working. */
export function mapCredential(r, evidence = []) {
  return {
    id: r.id,
    apprenticeId: r.apprentice_id,
    trainerId: r.trainer_id,
    skillId: r.skill_id,
    issuedAt: iso(r.issued_at),
    evidence,
    status: r.status,
    criteriaMet: r.criteria_met,
    needsCosign: r.needs_cosign,
    cosignReason: r.cosign_reason ?? undefined,
    cosignerId: r.cosigner_id ?? undefined,
    cosignRequestedFrom: r.cosign_requested_from ?? undefined,
    apprenticeConfirmedAt: iso(r.apprentice_confirmed_at),
    heldForReview: r.held_for_review,
    heldCleared: r.held_cleared,
    signature: r.signature,
    note: r.note,
    revokeReason: r.revoke_reason ?? undefined,
  };
}

/** One credential without its evidence. Pass lock: true inside a transaction to serialise changes to it. */
export async function loadCredential(db, id, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT ${CREDENTIAL_COLUMNS} FROM credentials c WHERE c.id = $1${lock ? ' FOR UPDATE OF c' : ''}`,
    [id],
  );
  return rows[0] ? mapCredential(rows[0]) : undefined;
}

/** Credentials with their evidence attached. `where` is a SQL fragment using $1.. params; it may join skills as s. */
export async function loadCredentialsFull(db, where = 'TRUE', params = []) {
  const { rows } = await db.query(
    `SELECT ${CREDENTIAL_COLUMNS} FROM credentials c JOIN skills s ON s.id = c.skill_id WHERE ${where} ORDER BY c.issued_at DESC`,
    params,
  );
  if (!rows.length) return [];
  const ev = await db.query('SELECT * FROM evidence WHERE credential_id = ANY($1) ORDER BY captured_at', [rows.map((r) => r.id)]);
  const byCredential = new Map();
  ev.rows.forEach((e) => {
    if (!byCredential.has(e.credential_id)) byCredential.set(e.credential_id, []);
    byCredential.get(e.credential_id).push(mapEvidence(e));
  });
  return rows.map((r) => mapCredential(r, byCredential.get(r.id) ?? []));
}

/** Which credentials a user may see, as a SQL fragment (uses $1 = user id) for loadCredentialsFull. */
export function scopeFor(user) {
  const params = [user.id];
  if (user.role === 'trainer') return { where: '(c.trainer_id = $1 OR c.cosign_requested_from = $1 OR c.cosigner_id = $1)', params };
  if (user.role === 'apprentice') return { where: 'c.apprentice_id = $1', params };
  if (user.role === 'employer') {
    return {
      where: `((c.status = 'valid' AND s.trade_id = (SELECT trade_id FROM employer_profiles WHERE user_id = $1))
               OR c.cosign_requested_from = $1 OR c.cosigner_id = $1)`,
      params,
    };
  }
  return { where: '$1::text IS NOT NULL', params }; // administrators see everything
}

export async function loadCredentialFull(db, id) {
  return (await loadCredentialsFull(db, 'c.id = $1', [id]))[0];
}

// ---------------------------------------------------------------------------
// Pipeline: issue -> apprentice confirms -> (co-sign) -> valid
// ---------------------------------------------------------------------------

const LOCKED = new Set(['revoked', 'under_review', 'flagged']);

/** Where a credential sits in the issue -> confirm -> co-sign pipeline. */
export function flowStatus(c) {
  if (c.heldForReview && !c.heldCleared) return 'held_review';
  if (!c.apprenticeConfirmedAt) return 'pending_apprentice';
  if (c.needsCosign && !c.cosignerId) return 'pending_cosign';
  return 'valid';
}

async function describe(db, c) {
  const { rows } = await db.query(
    `SELECT s.name AS skill, tu.name AS trainer, au.name AS apprentice
       FROM skills s, users tu, users au
      WHERE s.id = $1 AND tu.id = $2 AND au.id = $3`,
    [c.skillId, c.trainerId, c.apprenticeId],
  );
  return rows[0] ?? { skill: c.skillId, trainer: c.trainerId, apprentice: c.apprenticeId };
}

/**
 * Apply a patch and move the credential to its next pipeline stage, notifying the right people.
 * Revoked, flagged and under-review credentials stay locked unless the patch sets the status explicitly.
 * Allowed patch fields: apprenticeConfirmedAt, cosignerId, heldCleared, status.
 */
export async function transition(db, c, patch) {
  const next = { ...c, ...patch };
  const status = LOCKED.has(c.status) && !patch.status ? c.status : patch.status ?? flowStatus(next);
  await db.query(
    `UPDATE credentials
        SET apprentice_confirmed_at = $2, cosigner_id = $3, held_cleared = $4, status = $5
      WHERE id = $1`,
    [c.id, next.apprenticeConfirmedAt ?? null, next.cosignerId ?? null, !!next.heldCleared, status],
  );
  const updated = { ...next, status };
  if (status === c.status) return updated;

  const n = await describe(db, c);
  if (status === 'pending_cosign' && updated.cosignRequestedFrom) {
    const role = (await db.query('SELECT role FROM users WHERE id = $1', [updated.cosignRequestedFrom])).rows[0]?.role;
    await notify(db, updated.cosignRequestedFrom, 'Co-sign request',
      `${n.trainer} asked you to co-sign “${n.skill}” for ${n.apprentice}.`,
      { link: role === 'employer' ? '/employer' : '/trainer', channels: ['in_app', 'sms'] });
  }
  if (status === 'valid') {
    await notify(db, c.apprenticeId, 'Skill verified', `“${n.skill}” is now valid. ID ${c.id}.`,
      { link: `/verify/${c.id}`, channels: ['in_app', 'sms'] });
    await notify(db, c.trainerId, 'Credential valid', `${c.id} for ${n.apprentice} is now valid.`, { link: '/trainer/credentials' });
  }
  return updated;
}

export async function revokeCredential(db, c, reason, actor) {
  await db.query(`UPDATE credentials SET status = 'revoked', revoke_reason = $2 WHERE id = $1`, [c.id, reason]);
  await logAudit(db, { actor, action: 'credential.revoked', target: c.id, detail: reason });
  const n = await describe(db, c);
  await notify(db, c.apprenticeId, 'Credential revoked', `${c.id} (“${n.skill}”) was revoked: ${reason}`,
    { link: `/verify/${c.id}`, channels: ['in_app', 'sms'] });
}

