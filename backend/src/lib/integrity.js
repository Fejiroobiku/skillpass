import { query } from '../db.js';
import { config } from '../config.js';
import { HttpError } from './errors.js';
import { getSettings, logAudit, notify, SYSTEM } from './audit.js';
import { uid } from './ids.js';
import { computeRisk, computeTrust } from './scoring.js';
import { signCredential } from './signing.js';

const AUDIT_REASON_LABEL = { random: 'Random', risk: 'Risk-based', probation: 'Probation', misconduct: 'Misconduct review' };

/** Feedback rows that mention any of the given credentials, with every credential each one covers. */
async function feedbackFor(db, credentialIds) {
  if (!credentialIds.length) return [];
  const { rows } = await db.query(
    `SELECT f.id, f.rating, array_agg(fc.credential_id) AS credential_ids
       FROM feedback f JOIN feedback_credentials fc ON fc.feedback_id = f.id
      WHERE f.id IN (SELECT feedback_id FROM feedback_credentials WHERE credential_id = ANY($1))
      GROUP BY f.id, f.rating`,
    [credentialIds],
  );
  return rows.map((r) => ({ rating: r.rating, credentialIds: r.credential_ids }));
}

export async function loadTrust(db, trainerId) {
  const creds = (await db.query(
    `SELECT c.id, c.status, (SELECT count(*) FROM evidence e WHERE e.credential_id = c.id)::int AS evidence_count
       FROM credentials c WHERE c.trainer_id = $1`,
    [trainerId],
  )).rows;
  const ids = creds.map((c) => c.id);
  const flags = ids.length ? (await db.query('SELECT credential_id, status FROM flags WHERE credential_id = ANY($1)', [ids])).rows : [];
  const samples = ids.length ? (await db.query('SELECT credential_id, result FROM audit_samples WHERE credential_id = ANY($1)', [ids])).rows : [];
  const misconduct = (await db.query('SELECT misconduct_at FROM trainer_profiles WHERE user_id = $1', [trainerId])).rows[0]?.misconduct_at != null;
  return computeTrust({
    credentials: creds.map((c) => ({ id: c.id, status: c.status, evidenceCount: c.evidence_count })),
    flags: flags.map((f) => ({ credentialId: f.credential_id, status: f.status })),
    feedback: await feedbackFor(db, ids),
    samples: samples.map((s) => ({ credentialId: s.credential_id, result: s.result })),
    misconduct,
  });
}

export async function loadRisk(db, trainerId, settings) {
  const creds = (await db.query('SELECT id, issued_at FROM credentials WHERE trainer_id = $1', [trainerId])).rows;
  const notYet = (await db.query('SELECT count(*)::int AS n FROM attempts WHERE trainer_id = $1', [trainerId])).rows[0].n;
  const reports = (await db.query(`SELECT count(*)::int AS n FROM concern_reports WHERE trainer_id = $1 AND status <> 'closed'`, [trainerId])).rows[0].n;
  return computeRisk({
    credentials: creds.map((c) => ({ id: c.id, issuedAt: c.issued_at.toISOString() })),
    notYetCount: notYet,
    feedback: await feedbackFor(db, creds.map((c) => c.id)),
    openReportCount: reports,
    settings,
  });
}

/** Number of credentials this trainer has issued today (Lagos time). */
export async function issuedToday(db, trainerId) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS n FROM credentials
      WHERE trainer_id = $1 AND (issued_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date`,
    [trainerId, config.timezone],
  );
  return rows[0].n;
}

/**
 * A co-signer must be another approved trainer in the same trade (not under review),
 * or an approved employer in that trade.
 */
export async function assertEligibleCosigner(db, cosignerId, issuingTrainer) {
  const { rows } = await db.query(
    `SELECT u.id, u.role, u.status,
            tp.trade_id AS t_trade, tp.approved AS t_approved, tp.misconduct_at,
            ep.trade_id AS e_trade, ep.approved AS e_approved
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.id = $1`,
    [cosignerId],
  );
  const u = rows[0];
  const ok = u && u.status === 'active' && u.id !== issuingTrainer.id && (
    (u.role === 'trainer' && u.t_approved && u.t_trade === issuingTrainer.trade_id && !u.misconduct_at) ||
    (u.role === 'employer' && u.e_approved && u.e_trade === issuingTrainer.trade_id));
  if (!ok) throw new HttpError(400, 'That co-signer is not eligible. Choose an approved trainer or employer in the same trade.');
}

/** Pick an independent assessor for a trade, preferring ones with an NSQ id. */
async function assessorFor(db, tradeId) {
  const { rows } = await db.query(
    `SELECT a.id FROM assessors a JOIN assessor_trades t ON t.assessor_id = a.id
      WHERE t.trade_id = $1 ORDER BY (a.nsq_id IS NULL), a.id LIMIT 1`,
    [tradeId],
  );
  return rows[0]?.id ?? null;
}

/** Queue credentials for an independent re-check. */
export async function addAuditSamples(db, credentials, reason, actor = SYSTEM) {
  for (const c of credentials) {
    const trade = (await db.query('SELECT trade_id FROM skills WHERE id = $1', [c.skillId])).rows[0]?.trade_id;
    await db.query(
      `INSERT INTO audit_samples (id, credential_id, reviewer_id, assessor_id, reason) VALUES ($1, $2, $3, $4, $5)`,
      [uid('as'), c.id, actor.id ?? null, trade ? await assessorFor(db, trade) : null, reason],
    );
    await logAudit(db, { actor, action: 'audit.selected', target: c.id, detail: `${AUDIT_REASON_LABEL[reason]} audit sample` });
  }
}

/**
 * A trainer is found to have cheated: freeze issuing and put every credential they signed under review.
 * Apprentices are told they may be asked to show the skill to an assessor.
 */
export async function markMisconduct(db, trainerId, reason, actor) {
  const t = (await db.query(
    'SELECT u.name FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id WHERE u.id = $1 FOR UPDATE OF tp',
    [trainerId],
  )).rows[0];
  if (!t) throw new HttpError(404, 'Trainer not found.');
  await db.query('UPDATE trainer_profiles SET misconduct_at = now(), misconduct_reason = $2 WHERE user_id = $1', [trainerId, reason]);
  const affected = (await db.query(
    `UPDATE credentials SET status = 'under_review' WHERE trainer_id = $1 AND status <> 'revoked' RETURNING id, apprentice_id`,
    [trainerId],
  )).rows;
  await logAudit(db, { actor, action: 'trainer.misconduct', target: t.name, detail: `${reason} · ${affected.length} earlier credentials moved to under review · association notified` });
  for (const c of affected) await logAudit(db, { action: 'credential.under_review', target: c.id, detail: 'Issuing trainer found cheating' });
  for (const apprenticeId of new Set(affected.map((c) => c.apprentice_id))) {
    await notify(db, apprenticeId, 'Credential under review',
      `Credentials signed by ${t.name} are being re-checked. You may be asked to show the skill to an assessor.`,
      { link: '/apprentice', channels: ['in_app', 'sms'] });
  }
  await notify(db, trainerId, 'Issuing suspended',
    `Your credentials are under review: ${reason}. Your trade association has been informed.`,
    { link: '/trainer', channels: ['in_app', 'sms', 'email'] });
  return affected.length;
}

/**
 * Recompute every credential signature with the current SIGNING_KEY.
 * Used after seeding and after rotating the key. Only db:resign and db:seed call this.
 */
export async function resignAll(db = { query }) {
  const { rows } = await db.query(`
    SELECT c.id, c.apprentice_id, c.skill_id, c.trainer_id, c.issued_at,
           COALESCE(array_agg(e.sha256) FILTER (WHERE e.sha256 IS NOT NULL), '{}') AS hashes
      FROM credentials c LEFT JOIN evidence e ON e.credential_id = c.id
     GROUP BY c.id`);
  for (const r of rows) {
    const signature = signCredential({
      id: r.id, apprenticeId: r.apprentice_id, skillId: r.skill_id, trainerId: r.trainer_id,
      issuedAt: r.issued_at, evidenceHashes: r.hashes,
    });
    await db.query('UPDATE credentials SET signature = $2 WHERE id = $1', [r.id, signature]);
  }
  return rows.length;
}

export { getSettings };

/**
 * The trainer making this request, if they are allowed to issue. Pass lock: true inside a
 * transaction so two simultaneous requests cannot both slip under the daily limit.
 */
export async function loadTrainerForIssuing(db, trainerId, { lock = false } = {}) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, tp.trade_id, tp.approved, tp.membership_verified, tp.misconduct_at
       FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id
      WHERE u.id = $1${lock ? ' FOR UPDATE OF tp' : ''}`,
    [trainerId],
  );
  const t = rows[0];
  if (!t || !t.approved || !t.membership_verified) throw new HttpError(403, 'Your trainer account is not approved to issue.');
  if (t.misconduct_at) throw new HttpError(403, 'Issuing is suspended while your credentials are under review.');
  return t;
}
