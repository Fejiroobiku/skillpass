import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { getSettings, logAudit, notify } from '../lib/audit.js';
import { flowStatus, loadCredential, loadCredentialsFull, revokeCredential, transition } from '../lib/credentials.js';
import { uid } from '../lib/ids.js';
import { addAuditSamples, markMisconduct } from '../lib/integrity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const iso = (d) => (d ? new Date(d).toISOString() : undefined);
const reasonSchema = z.object({ reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters).').max(500) });

const mapFlag = (f) => ({ id: f.id, credentialId: f.credential_id, raisedBy: f.raised_by, raisedByName: f.raised_by_name, reason: f.reason, raisedAt: iso(f.raised_at), status: f.status });
const mapSample = (s) => ({ id: s.id, credentialId: s.credential_id, assessor: s.reviewer_id ?? undefined, assessorId: s.assessor_id ?? undefined, reason: s.reason ?? undefined, selectedAt: iso(s.selected_at), result: s.result });

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

/** Everything waiting on an administrator, in one call. */
router.get('/review', async (req, res) => {
  const held = await loadCredentialsFull(pool, `c.status = 'held_review'`);
  const flags = (await pool.query(
    `SELECT f.*, u.name AS raised_by_name FROM flags f JOIN users u ON u.id = f.raised_by WHERE f.status = 'open' ORDER BY f.raised_at DESC`,
  )).rows;
  const flagged = flags.length ? await loadCredentialsFull(pool, 'c.id = ANY($1)', [flags.map((f) => f.credential_id)]) : [];
  const samples = (await pool.query(`SELECT * FROM audit_samples WHERE result = 'pending' ORDER BY selected_at DESC`)).rows;
  const sampled = samples.length ? await loadCredentialsFull(pool, 'c.id = ANY($1)', [samples.map((s) => s.credential_id)]) : [];
  const reports = (await pool.query(
    `SELECT r.*, au.name AS apprentice_name, tu.name AS trainer_name FROM concern_reports r
       JOIN users au ON au.id = r.apprentice_id JOIN users tu ON tu.id = r.trainer_id
      WHERE r.status <> 'closed' ORDER BY r.at DESC`,
  )).rows;
  const pendingTrainers = (await pool.query(
    `SELECT u.id, u.name, u.phone, u.location_name, tp.trade_id, tp.workshop, tp.membership_no, tp.membership_verified, tp.joined_at
       FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id
      WHERE u.status = 'active' AND NOT tp.approved ORDER BY tp.joined_at`,
  )).rows;
  const pendingEmployers = (await pool.query(
    `SELECT u.id, u.name, u.phone, ep.company, ep.trade_id FROM users u JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE u.status = 'active' AND NOT ep.approved ORDER BY u.created_at`,
  )).rows;

  res.json({
    held,
    flags: flags.map((f) => ({ ...mapFlag(f), credential: flagged.find((c) => c.id === f.credential_id) })),
    samples: samples.map((s) => ({ ...mapSample(s), credential: sampled.find((c) => c.id === s.credential_id) })),
    reports: reports.map((r) => ({
      id: r.id, apprenticeId: r.apprentice_id, apprenticeName: r.apprentice_name, trainerId: r.trainer_id, trainerName: r.trainer_name,
      category: r.category, details: r.details, at: iso(r.at), status: r.status,
    })),
    pendingTrainers: pendingTrainers.map((t) => ({
      id: t.id, name: t.name, phone: t.phone, location: t.location_name, trade: t.trade_id, workshop: t.workshop,
      membershipNo: t.membership_no, membershipVerified: t.membership_verified, joinedAt: iso(t.joined_at),
    })),
    pendingEmployers: pendingEmployers.map((e) => ({ id: e.id, name: e.name, phone: e.phone, company: e.company, trade: e.trade_id })),
  });
});

/** A credential held because its trainer passed the daily limit: release it, or reject (revoke) it. */
router.post('/credentials/:id/release', async (req, res) => {
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c) throw new HttpError(404, 'Credential not found.');
    if (c.status !== 'held_review') throw new HttpError(409, 'This credential is not being held for review.');
    if (approve) {
      await transition(db, c, { heldCleared: true });
      await logAudit(db, { actor: req.user, action: 'credential.released', target: c.id, detail: 'Released after administrator review' });
    } else {
      await revokeCredential(db, c, 'Rejected during issuing-limit review', req.user);
    }
  });
  res.json({ ok: true });
});

/** After a re-check clears a credential that was flagged or under review, put it back in its pipeline stage. */
router.post('/credentials/:id/reinstate', async (req, res) => {
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c) throw new HttpError(404, 'Credential not found.');
    if (c.status !== 'under_review' && c.status !== 'flagged') throw new HttpError(409, 'Only flagged or under-review credentials can be reinstated.');
    await db.query('UPDATE credentials SET status = $2 WHERE id = $1', [c.id, flowStatus(c)]);
    await logAudit(db, { actor: req.user, action: 'credential.reinstated', target: c.id, detail: 'Re-checked and reinstated' });
  });
  res.json({ ok: true });
});

router.post('/flags/:id/resolve', async (req, res) => {
  const { outcome } = z.object({ outcome: z.enum(['dismiss', 'revoke', 'misconduct']) }).parse(req.body);
  await tx(async (db) => {
    const flag = (await db.query('SELECT * FROM flags WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!flag) throw new HttpError(404, 'Flag not found.');
    if (flag.status !== 'open') throw new HttpError(409, 'This flag has already been resolved.');
    await db.query('UPDATE flags SET status = $2 WHERE id = $1', [flag.id, outcome === 'dismiss' ? 'dismissed' : 'upheld']);
    const c = await loadCredential(db, flag.credential_id, { lock: true });

    if (outcome === 'dismiss') {
      if (c.status === 'flagged') await db.query('UPDATE credentials SET status = $2 WHERE id = $1', [c.id, flowStatus(c)]);
      await logAudit(db, { actor: req.user, action: 'flag.dismissed', target: c.id, detail: 'Flag reviewed and dismissed' });
      return;
    }
    if (c.status !== 'revoked') await revokeCredential(db, c, `Flag upheld: ${flag.reason}`, req.user);
    if (outcome === 'misconduct') await markMisconduct(db, c.trainerId, `Flag upheld on ${c.id}`, req.user);
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Audit sampling
// ---------------------------------------------------------------------------

/** Pick a random share of valid, not-yet-sampled credentials for independent re-checking. */
router.post('/audit-samples/run', async (req, res) => {
  const picked = await tx(async (db) => {
    const settings = await getSettings(db);
    const valid = (await db.query(`SELECT id, skill_id, trainer_id FROM credentials WHERE status = 'valid'`)).rows;
    const sampled = new Set((await db.query('SELECT credential_id FROM audit_samples')).rows.map((s) => s.credential_id));
    const pool = valid.filter((c) => !sampled.has(c.id));
    const n = settings.auditRatePct === 0 ? 0 : Math.min(pool.length, Math.max(1, Math.round((valid.length * settings.auditRatePct) / 100)));
    const chosen = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    await addAuditSamples(db, chosen.map((c) => ({ id: c.id, skillId: c.skill_id })), 'random', req.user);
    for (const c of chosen) await notify(db, c.trainer_id, 'Audit sample selected', `${c.id} was picked for a random spot-check.`);
    return chosen.length;
  });
  res.json({ selected: picked });
});

/** Record what the independent re-check found. A disagreement revokes the credential. */
router.post('/audit-samples/:id/complete', async (req, res) => {
  const { outcome } = z.object({ outcome: z.enum(['agree', 'disagree', 'misconduct']) }).parse(req.body);
  await tx(async (db) => {
    const s = (await db.query('SELECT * FROM audit_samples WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!s) throw new HttpError(404, 'Audit sample not found.');
    if (s.result !== 'pending') throw new HttpError(409, 'This audit sample is already complete.');
    await db.query('UPDATE audit_samples SET result = $2 WHERE id = $1', [s.id, outcome === 'agree' ? 'agree' : 'disagree']);
    await logAudit(db, { actor: req.user, action: 'audit.completed', target: s.credential_id, detail: outcome === 'agree' ? 'Re-check agrees with trainer' : 'Re-check disagrees with trainer' });
    const c = await loadCredential(db, s.credential_id, { lock: true });
    await notify(db, c.trainerId, 'Audit result', `Spot-check of ${c.id} ${outcome === 'agree' ? 'agreed' : 'did not agree'} with your assessment.`, { link: '/trainer' });
    if (outcome !== 'agree' && c.status !== 'revoked') await revokeCredential(db, c, 'Independent re-check found the skill was not demonstrated', req.user);
    if (outcome === 'misconduct') await markMisconduct(db, c.trainerId, `Audit of ${c.id} found a false claim`, req.user);
  });
  res.json({ ok: true });
});

router.post('/audit-samples/:id/assign', async (req, res) => {
  const { assessorId } = z.object({ assessorId: z.string().min(1) }).parse(req.body);
  await tx(async (db) => {
    const a = (await db.query('SELECT id, name FROM assessors WHERE id = $1', [assessorId])).rows[0];
    if (!a) throw new HttpError(404, 'Assessor not found.');
    const s = (await db.query('UPDATE audit_samples SET assessor_id = $2 WHERE id = $1 AND result = $3 RETURNING credential_id', [req.params.id, assessorId, 'pending'])).rows[0];
    if (!s) throw new HttpError(404, 'Pending audit sample not found.');
    await logAudit(db, { actor: req.user, action: 'audit.assigned', target: s.credential_id, detail: `Assigned to ${a.name}` });
  });
  res.json({ ok: true });
});

/** Queue every valid credential a trainer has issued for independent re-checking (used when risk signals pile up). */
router.post('/trainers/:id/audit', async (req, res) => {
  const selected = await tx(async (db) => {
    if (!(await db.query('SELECT 1 FROM trainer_profiles WHERE user_id = $1', [req.params.id])).rowCount) throw new HttpError(404, 'Trainer not found.');
    const picked = (await db.query(
      `SELECT c.id, c.skill_id FROM credentials c
        WHERE c.trainer_id = $1 AND c.status = 'valid'
          AND NOT EXISTS (SELECT 1 FROM audit_samples a WHERE a.credential_id = c.id AND a.result = 'pending')`,
      [req.params.id],
    )).rows;
    await addAuditSamples(db, picked.map((c) => ({ id: c.id, skillId: c.skill_id })), 'risk', req.user);
    if (picked.length) await notify(db, req.params.id, 'Risk-based audit', `${picked.length} of your credentials will be re-checked by an independent assessor.`, { link: '/trainer' });
    return picked.length;
  });
  res.json({ selected });
});

// ---------------------------------------------------------------------------
// Skills and trades
// ---------------------------------------------------------------------------

router.post('/skills', async (req, res) => {
  const input = z.object({
    trade: z.string().min(1), level: z.enum(['Foundation', 'Intermediate', 'Advanced']),
    name: z.string().trim().min(3, 'Describe the skill (at least 3 characters).').max(150),
  }).parse(req.body);
  const skill = await tx(async (db) => {
    if (!(await db.query('SELECT 1 FROM trades WHERE id = $1', [input.trade])).rowCount) throw new HttpError(400, 'Choose a valid trade.');
    const id = uid('sk');
    await db.query(`INSERT INTO skills (id, trade_id, name, level, requires_cosign, status) VALUES ($1, $2, $3, $4, $5, 'active')`, [id, input.trade, input.name, input.level, input.level === 'Advanced']);
    await logAudit(db, { actor: req.user, action: 'skill.added', target: input.name, detail: `${input.level} · ${input.trade}` });
    return { id, trade: input.trade, name: input.name, level: input.level, requiresCosign: input.level === 'Advanced', status: 'active' };
  });
  res.status(201).json({ skill });
});

router.post('/skills/:id/review', async (req, res) => {
  const { approve } = z.object({ approve: z.boolean() }).parse(req.body);
  await tx(async (db) => {
    const s = (await db.query(`SELECT id, name, level, proposed_by FROM skills WHERE id = $1 AND status = 'proposed' FOR UPDATE`, [req.params.id])).rows[0];
    if (!s) throw new HttpError(404, 'Proposed skill not found.');
    await db.query('UPDATE skills SET status = $2 WHERE id = $1', [s.id, approve ? 'active' : 'rejected']);
    await logAudit(db, { actor: req.user, action: approve ? 'skill.approved' : 'skill.rejected', target: s.name, detail: s.level });
    if (s.proposed_by) await notify(db, s.proposed_by, approve ? 'Skill added to checklist' : 'Skill proposal declined', `“${s.name}” was ${approve ? 'approved' : 'declined'}.`, { link: '/trainer/skills' });
  });
  res.json({ ok: true });
});

router.post('/trades', async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(3, 'Give the trade a name.').max(80) }).parse(req.body);
  const trade = await tx(async (db) => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id) throw new HttpError(400, 'Give the trade a name.');
    if ((await db.query('SELECT 1 FROM trades WHERE id = $1', [id])).rowCount) throw new HttpError(409, 'That trade already exists.');
    await db.query('INSERT INTO trades (id, name) VALUES ($1, $2)', [id, name]);
    await logAudit(db, { actor: req.user, action: 'trade.added', target: name, detail: 'New trade checklist created' });
    return { id, name };
  });
  res.status(201).json({ trade });
});

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.status, u.name, u.phone, u.location_name, u.created_at,
            tp.approved AS t_approved, tp.membership_verified, tp.misconduct_at, ep.approved AS e_approved,
            COALESCE(tp.trade_id, ap.trade_id, ep.trade_id) AS trade_id
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       LEFT JOIN apprentice_profiles ap ON ap.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
      ORDER BY u.created_at, u.id`,
  );
  res.json({
    users: rows.map((u) => ({
      id: u.id, email: u.email, role: u.role, status: u.status, name: u.name, phone: u.phone ?? undefined,
      location: u.location_name ?? undefined, trade: u.trade_id ?? undefined, createdAt: iso(u.created_at),
      approved: u.role === 'trainer' ? u.t_approved : u.role === 'employer' ? u.e_approved : undefined,
      membershipVerified: u.role === 'trainer' ? u.membership_verified : undefined,
      misconductAt: iso(u.misconduct_at),
    })),
  });
});

router.post('/trainers/:id/verify-membership', async (req, res) => {
  await tx(async (db) => {
    const r = await db.query('UPDATE trainer_profiles SET membership_verified = true WHERE user_id = $1 RETURNING user_id', [req.params.id]);
    if (!r.rowCount) throw new HttpError(404, 'Trainer not found.');
    const name = (await db.query('SELECT name FROM users WHERE id = $1', [req.params.id])).rows[0].name;
    await logAudit(db, { actor: req.user, action: 'trainer.membership_verified', target: name, detail: 'Trade association confirmed membership' });
  });
  res.json({ ok: true });
});

/** Approve a trainer (membership must be verified first) or an employer. */
router.post('/users/:id/approve', async (req, res) => {
  await tx(async (db) => {
    const u = (await db.query('SELECT id, name, role FROM users WHERE id = $1', [req.params.id])).rows[0];
    if (!u) throw new HttpError(404, 'User not found.');
    if (u.role === 'trainer') {
      const t = (await db.query('SELECT membership_verified FROM trainer_profiles WHERE user_id = $1 FOR UPDATE', [u.id])).rows[0];
      if (!t.membership_verified) throw new HttpError(409, 'Verify this trainer\'s association membership first.');
      await db.query('UPDATE trainer_profiles SET approved = true WHERE user_id = $1', [u.id]);
      const { probationCount } = await getSettings(db);
      await logAudit(db, { actor: req.user, action: 'trainer.approved', target: u.name, detail: `Approved · probation for first ${probationCount} credentials` });
      await notify(db, u.id, 'You are approved', `You can now issue credentials. Your first ${probationCount} each need a co-signer.`, { link: '/trainer/issue', channels: ['in_app', 'sms'] });
    } else if (u.role === 'employer') {
      await db.query('UPDATE employer_profiles SET approved = true WHERE user_id = $1', [u.id]);
      await logAudit(db, { actor: req.user, action: 'employer.approved', target: u.name, detail: 'Verified employer' });
      await notify(db, u.id, 'Employer verified', 'You can now rate apprentices after jobs and co-sign skills.', { link: '/employer' });
    } else {
      throw new HttpError(400, 'Only trainers and employers need approval.');
    }
  });
  res.json({ ok: true });
});

router.post('/users/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
  await tx(async (db) => {
    const u = (await db.query('SELECT id, name, role, status FROM users WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!u) throw new HttpError(404, 'User not found.');
    if (u.id === req.user.id) throw new HttpError(400, 'You cannot change your own account status.');
    if (u.role === 'admin') throw new HttpError(403, 'Administrator accounts cannot be suspended here.');
    if (u.status === 'withdrawn') throw new HttpError(409, 'This participant withdrew consent, so the account stays closed.');
    await db.query('UPDATE users SET status = $2 WHERE id = $1', [u.id, status]);
    await logAudit(db, { actor: req.user, action: status === 'suspended' ? 'account.suspended' : 'account.reactivated', target: u.name, detail: status === 'suspended' ? 'Account suspended' : 'Account reactivated' });
    if (status === 'active') await notify(db, u.id, 'Account reactivated', 'Your SkillPass account is active again.', { channels: ['sms'] });
  });
  res.json({ ok: true });
});

router.post('/trainers/:id/misconduct', async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  const affected = await tx((db) => markMisconduct(db, req.params.id, reason, req.user));
  res.json({ ok: true, credentialsUnderReview: affected });
});

router.patch('/reports/:id', async (req, res) => {
  const { status } = z.object({ status: z.enum(['open', 'investigating', 'closed']) }).parse(req.body);
  await tx(async (db) => {
    const r = await db.query('UPDATE concern_reports SET status = $2 WHERE id = $1 RETURNING id', [req.params.id, status]);
    if (!r.rowCount) throw new HttpError(404, 'Report not found.');
    await logAudit(db, { actor: req.user, action: 'report.updated', target: 'Confidential report', detail: `Status → ${status}` });
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Audit log and settings
// ---------------------------------------------------------------------------

router.get('/audit-log', async (req, res) => {
  const { limit, offset } = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query);
  const { rows } = await pool.query('SELECT id, at, actor_name, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT $1 OFFSET $2', [limit, offset]);
  const total = (await pool.query('SELECT count(*)::int AS n FROM audit_log')).rows[0].n;
  res.json({ total, entries: rows.map((e) => ({ id: e.id, at: iso(e.at), actor: e.actor_name, action: e.action, target: e.target, detail: e.detail })) });
});

const SETTING_COLUMNS = {
  dailyLimit: 'daily_limit', auditRatePct: 'audit_rate_pct', probationCount: 'probation_count',
  clusterThreshold: 'cluster_threshold', fastMinutes: 'fast_minutes', smsEnabled: 'sms_enabled', emailEnabled: 'email_enabled',
};

const settingsSchema = z.object({
  dailyLimit: z.number().int().min(1).max(100),
  auditRatePct: z.number().int().min(0).max(100),
  probationCount: z.number().int().min(0).max(50),
  clusterThreshold: z.number().int().min(1).max(100),
  fastMinutes: z.number().int().min(1).max(240),
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
}).partial().refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update.' });

router.patch('/settings', async (req, res) => {
  const patch = settingsSchema.parse(req.body);
  const settings = await tx(async (db) => {
    const keys = Object.keys(patch);
    await db.query(`UPDATE settings SET ${keys.map((k, i) => `${SETTING_COLUMNS[k]} = $${i + 1}`).join(', ')} WHERE id = 1`, keys.map((k) => patch[k]));
    await logAudit(db, { actor: req.user, action: 'settings.updated', target: 'Integrity rules', detail: keys.map((k) => `${k}=${patch[k]}`).join(', ') });
    return getSettings(db);
  });
  res.json({ settings });
});

export default router;
