import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { getSettings, logAudit, notify, notifyAdmins, SYSTEM } from '../lib/audit.js';
import { credentialId, uid } from '../lib/ids.js';
import { signCredential } from '../lib/signing.js';
import { getRubric } from '../lib/rubric.js';
import { flowStatus, loadCredential, loadCredentialFull, loadCredentialsFull, revokeCredential, scopeFor, transition } from '../lib/credentials.js';
import { addAuditSamples, assertEligibleCosigner, issuedToday, loadRisk, loadTrainerForIssuing } from '../lib/integrity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const STATUSES = ['pending_apprentice', 'pending_cosign', 'held_review', 'valid', 'flagged', 'under_review', 'revoked'];

const issueSchema = z.object({
  apprenticeId: z.string().min(1, 'Choose an apprentice.'),
  skillId: z.string().min(1, 'Choose a skill.'),
  evidenceIds: z.array(z.string().min(1)).min(1, 'Add your evidence first.').max(10),
  criteriaMet: z.array(z.string()).max(50),
  note: z.string().trim().max(500).default(''),
  cosignRequestedFrom: z.string().min(1).optional(),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters).').max(500),
});

const skillNameOf = async (db, skillId) => (await db.query('SELECT name FROM skills WHERE id = $1', [skillId])).rows[0]?.name ?? skillId;
const respond = async (res, id, status = 200) => res.status(status).json({ credential: await loadCredentialFull(pool, id) });

/** Credentials this person is allowed to see, newest first. Optional ?status=valid filter. */
router.get('/', async (req, res) => {
  const { where: scope, params } = scopeFor(req.user);
  let where = scope;
  const status = z.enum(STATUSES).optional().parse(req.query.status);
  if (status) {
    params.push(status);
    where += ` AND c.status = $${params.length}`;
  }
  res.json({ credentials: await loadCredentialsFull(pool, where, params) });
});

/**
 * Issue a credential. Every integrity rule is enforced here, on the server:
 * approved trainer, own apprentice, own-trade skill, live video with a fresh code, unused evidence,
 * every rubric criterion observed, probation / advanced-skill co-sign, and the daily issuing limit.
 */
router.post('/', requireRole('trainer'), async (req, res) => {
  const input = issueSchema.parse(req.body);

  const id = await tx(async (db) => {
    // Lock the trainer row so two requests at once cannot both slip under the daily limit.
    const trainer = await loadTrainerForIssuing(db, req.user.id, { lock: true });
    const settings = await getSettings(db);

    const apprentice = (await db.query(
      `SELECT u.id, u.name, u.status, ap.trainer_id
         FROM users u JOIN apprentice_profiles ap ON ap.user_id = u.id WHERE u.id = $1`,
      [input.apprenticeId],
    )).rows[0];
    if (!apprentice || apprentice.trainer_id !== trainer.id || apprentice.status !== 'active') {
      throw new HttpError(403, 'You can only issue credentials to your own apprentices.');
    }

    const skill = (await db.query('SELECT id, name, trade_id, requires_cosign, status FROM skills WHERE id = $1', [input.skillId])).rows[0];
    if (!skill || skill.status !== 'active') throw new HttpError(400, 'Choose a skill.');
    if (skill.trade_id !== trainer.trade_id) throw new HttpError(400, 'That skill belongs to a different trade.');

    const held = await db.query(`SELECT 1 FROM credentials WHERE apprentice_id = $1 AND skill_id = $2 AND status <> 'revoked'`, [apprentice.id, skill.id]);
    if (held.rowCount) throw new HttpError(409, `${apprentice.name} already holds this skill.`);

    const evidenceIds = [...new Set(input.evidenceIds)];
    const evidence = (await db.query('SELECT * FROM evidence WHERE id = ANY($1) FOR UPDATE', [evidenceIds])).rows;
    if (evidence.length !== evidenceIds.length) throw new HttpError(400, 'One of the evidence files was not found. Upload it again.');
    if (evidence.some((e) => e.uploaded_by !== trainer.id)) throw new HttpError(403, 'You can only attach evidence you uploaded yourself.');
    if (evidence.some((e) => e.credential_id)) throw new HttpError(409, 'One file matches evidence already used on another credential.');
    if (!evidence.some((e) => e.kind === 'video' && e.challenge_code)) throw new HttpError(400, 'A live video showing the challenge code is required.');

    const rubric = await getRubric(db, skill.id);
    if (!rubric.every((r) => input.criteriaMet.includes(r))) throw new HttpError(400, 'Every rubric criterion must be observed to issue.');

    const issuedSoFar = (await db.query('SELECT count(*)::int AS n FROM credentials WHERE trainer_id = $1', [trainer.id])).rows[0].n;
    const onProbation = issuedSoFar < settings.probationCount;
    const needsCosign = skill.requires_cosign || onProbation;
    let cosignerName = '';
    if (needsCosign) {
      if (!input.cosignRequestedFrom) throw new HttpError(400, 'Choose a co-signer for this credential.');
      await assertEligibleCosigner(db, input.cosignRequestedFrom, trainer);
      cosignerName = (await db.query('SELECT name FROM users WHERE id = $1', [input.cosignRequestedFrom])).rows[0].name;
    }

    const overLimit = (await issuedToday(db, trainer.id)) >= settings.dailyLimit;
    const risk = await loadRisk(db, trainer.id, settings);

    let id = null;
    for (let i = 0; i < 8 && !id; i++) {
      const candidate = credentialId();
      if (!(await db.query('SELECT 1 FROM credentials WHERE id = $1', [candidate])).rowCount) id = candidate;
    }
    if (!id) throw new HttpError(500, 'Could not allocate a credential ID. Please try again.');

    const issuedAt = new Date();
    const signature = signCredential({ id, apprenticeId: apprentice.id, skillId: skill.id, trainerId: trainer.id, issuedAt, evidenceHashes: evidence.map((e) => e.sha256) });
    const status = flowStatus({ heldForReview: overLimit, heldCleared: false, apprenticeConfirmedAt: null, needsCosign, cosignerId: null });

    await db.query(
      `INSERT INTO credentials (id, apprentice_id, trainer_id, skill_id, issued_at, status, criteria_met, note,
                                needs_cosign, cosign_reason, cosign_requested_from, held_for_review, signature)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, apprentice.id, trainer.id, skill.id, issuedAt, status, rubric, input.note, needsCosign,
        skill.requires_cosign ? 'advanced' : onProbation ? 'probation' : null,
        needsCosign ? input.cosignRequestedFrom : null, overLimit, signature],
    );
    await db.query('UPDATE evidence SET credential_id = $1 WHERE id = ANY($2)', [id, evidenceIds]);

    await logAudit(db, {
      actor: req.user, action: 'credential.issued', target: id,
      detail: `${apprentice.name} · ${skill.name} · ${rubric.length}/${rubric.length} criteria${needsCosign ? ` · co-signature requested from ${cosignerName}` : ''}`,
    });
    await notify(db, apprentice.id, 'Please confirm your skill',
      `${trainer.name} recorded “${skill.name}”. Confirm you did this task, or tell us if you didn't.`,
      { link: '/apprentice/confirm', channels: ['in_app', 'sms'] });
    if (overLimit) {
      await logAudit(db, { actor: SYSTEM, action: 'credential.held', target: id, detail: `Daily issuing limit (${settings.dailyLimit}) exceeded by ${trainer.name}` });
      await notifyAdmins(db, 'Credential held for review', `${trainer.name} passed the daily limit. ${id} needs review.`, '/admin/review');
    }
    if (risk.level === 'high') await addAuditSamples(db, [{ id, skillId: skill.id }], 'risk', SYSTEM);
    return id;
  });

  await respond(res, id, 201);
});

/** The apprentice confirms they really did the task. */
router.post('/:id/confirm', requireRole('apprentice'), async (req, res) => {
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c || c.apprenticeId !== req.user.id) throw new HttpError(404, 'Credential not found.');
    if (c.status === 'revoked') throw new HttpError(409, 'This credential was revoked.');
    if (c.status === 'flagged' || c.status === 'under_review') throw new HttpError(409, 'This credential is under review.');
    if (c.apprenticeConfirmedAt) return; // already confirmed: nothing to do
    await transition(db, c, { apprenticeConfirmedAt: new Date() });
    await logAudit(db, { actor: req.user, action: 'credential.confirmed', target: c.id, detail: 'Apprentice confirmed they performed the task' });
  });
  await respond(res, req.params.id);
});

/** The apprentice says they did NOT do this task. The credential is flagged and goes to an administrator. */
router.post('/:id/dispute', requireRole('apprentice'), async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c || c.apprenticeId !== req.user.id) throw new HttpError(404, 'Credential not found.');
    if (c.status === 'revoked') throw new HttpError(409, 'This credential was already revoked.');
    if (c.status === 'flagged' || c.status === 'under_review') throw new HttpError(409, 'This credential is already under review.');
    await db.query('INSERT INTO flags (id, credential_id, raised_by, reason) VALUES ($1, $2, $3, $4)', [uid('fl'), c.id, req.user.id, `Apprentice dispute: ${reason}`]);
    await transition(db, c, { status: 'flagged' });
    await logAudit(db, { actor: req.user, action: 'credential.disputed', target: c.id, detail: 'Apprentice says they did not perform this task' });
    await notifyAdmins(db, 'Apprentice disputed a credential', `${req.user.name} says they did not do “${await skillNameOf(db, c.skillId)}”.`, '/admin/review');
  });
  await respond(res, req.params.id);
});

/** The requested second trainer or verified employer co-signs. */
router.post('/:id/cosign', requireRole('trainer', 'employer'), async (req, res) => {
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c) throw new HttpError(404, 'Credential not found.');
    if (c.cosignRequestedFrom !== req.user.id) throw new HttpError(403, 'This co-sign request was not sent to you.');
    if (c.status !== 'pending_cosign') throw new HttpError(409, 'This credential is not waiting for a co-signature.');
    const issuer = (await db.query('SELECT user_id AS id, trade_id FROM trainer_profiles WHERE user_id = $1', [c.trainerId])).rows[0];
    await assertEligibleCosigner(db, req.user.id, issuer);
    await transition(db, c, { cosignerId: req.user.id });
    await logAudit(db, { actor: req.user, action: 'credential.cosigned', target: c.id, detail: c.cosignReason === 'probation' ? 'Probation co-signature' : 'Advanced skill co-signed' });
  });
  await respond(res, req.params.id);
});

/** A trainer, employer or administrator challenges a valid credential. They cannot flag their own. */
router.post('/:id/flag', requireRole('trainer', 'employer', 'admin'), async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c) throw new HttpError(404, 'Credential not found.');
    if (c.trainerId === req.user.id) throw new HttpError(403, 'You cannot flag your own credential.');
    if (c.status !== 'valid') throw new HttpError(409, 'Only valid credentials can be flagged.');
    await db.query('INSERT INTO flags (id, credential_id, raised_by, reason) VALUES ($1, $2, $3, $4)', [uid('fl'), c.id, req.user.id, reason]);
    await db.query(`UPDATE credentials SET status = 'flagged' WHERE id = $1`, [c.id]);
    await logAudit(db, { actor: req.user, action: 'credential.flagged', target: c.id, detail: reason });
    await notifyAdmins(db, 'New flag', `${c.id} was flagged by ${req.user.name}.`, '/admin/review');
    await notify(db, c.trainerId, 'Credential flagged', `${req.user.name} flagged ${c.id}: “${reason}”`, { link: `/verify/${c.id}` });
  });
  await respond(res, req.params.id);
});

/** An administrator, or the trainer who issued it, withdraws a credential. The record stays for transparency. */
router.post('/:id/revoke', requireRole('trainer', 'admin'), async (req, res) => {
  const { reason } = reasonSchema.parse(req.body);
  await tx(async (db) => {
    const c = await loadCredential(db, req.params.id, { lock: true });
    if (!c || (req.user.role === 'trainer' && c.trainerId !== req.user.id)) throw new HttpError(404, 'Credential not found.');
    if (c.status === 'revoked') throw new HttpError(409, 'This credential was already revoked.');
    await revokeCredential(db, c, reason, req.user);
  });
  await respond(res, req.params.id);
});

export default router;
