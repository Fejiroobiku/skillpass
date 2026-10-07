import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { uid } from '../lib/ids.js';
import { getRubric } from '../lib/rubric.js';
import { loadTrust } from '../lib/integrity.js';
import { mapEvidence } from '../lib/credentials.js';
import { redactHistory } from '../lib/history.js';
import { verifySignature } from '../lib/signing.js';

const router = Router();

// Public and unauthenticated, so it is rate limited to make guessing credential IDs impractical.
router.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => config.env === 'test' }));

const ID_PATTERN = /^SP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
/** Look up a credential by ID. No login needed. Contact details are never included. */
router.get('/:id', async (req, res) => {
  const id = req.params.id.trim().toUpperCase();
  const notFound = new HttpError(404, `No credential found for ${id}. Check the ID for typos.`);
  if (!ID_PATTERN.test(id)) throw notFound;

  const { rows } = await query(
    `SELECT c.*, s.name AS skill_name, s.level, s.trade_id, tr.name AS trade_name,
            au.name AS apprentice_name, tu.name AS trainer_name,
            tp.workshop, tp.membership_verified, tp.misconduct_at, assoc.name AS association_name,
            cu.name AS cosigner_name
       FROM credentials c
       JOIN skills s ON s.id = c.skill_id
       JOIN trades tr ON tr.id = s.trade_id
       JOIN users au ON au.id = c.apprentice_id
       JOIN users tu ON tu.id = c.trainer_id
       JOIN trainer_profiles tp ON tp.user_id = c.trainer_id
       LEFT JOIN associations assoc ON assoc.id = tp.association_id
       LEFT JOIN users cu ON cu.id = c.cosigner_id
      WHERE c.id = $1`,
    [id],
  );
  const c = rows[0];
  if (!c) throw notFound;

  const evidence = (await query('SELECT * FROM evidence WHERE credential_id = $1 ORDER BY captured_at', [id])).rows;
  const history = (await query('SELECT at, actor_name, action, detail FROM audit_log WHERE target = $1 ORDER BY at, id', [id])).rows;
  const trust = await loadTrust({ query }, c.trainer_id);

  const signatureValid = verifySignature({
    id: c.id, apprenticeId: c.apprentice_id, skillId: c.skill_id, trainerId: c.trainer_id,
    issuedAt: c.issued_at, evidenceHashes: evidence.map((e) => e.sha256),
  }, c.signature);

  res.json({
    credential: {
      id: c.id,
      status: c.status,
      issuedAt: c.issued_at.toISOString(),
      skill: { id: c.skill_id, name: c.skill_name, level: c.level, trade: c.trade_id, tradeName: c.trade_name },
      apprentice: { id: c.apprentice_id, name: c.apprentice_name },
      trainer: {
        id: c.trainer_id, name: c.trainer_name, workshop: c.workshop, association: c.association_name ?? null,
        membershipVerified: c.membership_verified, trustScore: trust.score, underReview: c.misconduct_at != null,
      },
      apprenticeConfirmedAt: c.apprentice_confirmed_at?.toISOString(),
      needsCosign: c.needs_cosign,
      cosignReason: c.cosign_reason ?? undefined,
      cosigner: c.cosigner_id ? { id: c.cosigner_id, name: c.cosigner_name } : null,
      criteriaMet: c.criteria_met,
      rubric: await getRubric({ query }, c.skill_id),
      note: c.note,
      revokeReason: c.revoke_reason ?? undefined,
      signature: c.signature,
      signatureValid,
      evidence: evidence.map((e) => {
        // eslint-disable-next-line no-unused-vars
        const { hash, lat, lng, ...publicFields } = mapEvidence(e); // no file hash or GPS point on the public page
        return publicFields;
      }),
      history: redactHistory(history.map((h) => ({ at: h.at.toISOString(), actor: h.actor_name, action: h.action, detail: h.detail }))),
    },
  });
});

// Pilot metrics: how long did verifying take, and how much did the verifier trust the result?
router.post('/:id/events', async (req, res) => {
  const { seconds } = z.object({ seconds: z.number().int().min(0).max(36000) }).parse(req.body);
  const id = req.params.id.trim().toUpperCase();
  if (!(await query('SELECT 1 FROM credentials WHERE id = $1', [id])).rowCount) throw new HttpError(404, 'Credential not found.');
  const eventId = uid('v');
  await query('INSERT INTO verification_events (id, credential_id, seconds) VALUES ($1, $2, $3)', [eventId, id, seconds]);
  res.status(201).json({ id: eventId });
});

router.patch('/events/:eventId', async (req, res) => {
  const { trustRating } = z.object({ trustRating: z.number().int().min(1).max(5) }).parse(req.body);
  const r = await query('UPDATE verification_events SET trust_rating = $2 WHERE id = $1', [req.params.eventId, trustRating]);
  if (!r.rowCount) throw new HttpError(404, 'Verification event not found.');
  res.json({ ok: true });
});

export default router;
