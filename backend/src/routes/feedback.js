import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { logAudit, notify } from '../lib/audit.js';
import { uid } from '../lib/ids.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('employer'));

const schema = z.object({
  referralId: z.string().min(1, 'Choose the job you are rating.'),
  rating: z.number().int().min(1, 'Choose a rating from 1 to 5.').max(5, 'Choose a rating from 1 to 5.'),
  comment: z.string().trim().max(500).default(''),
  credentialIds: z.array(z.string()).max(20).default([]),
});

/**
 * An employer rates an apprentice after a job. The rating is tied to a real referral the apprentice accepted,
 * can only be given once, and feeds the issuing trainers' trust scores through the credentials it names.
 */
router.post('/', async (req, res) => {
  const input = schema.parse(req.body);
  const id = await tx(async (db) => {
    const employer = (await db.query('SELECT approved FROM employer_profiles WHERE user_id = $1', [req.user.id])).rows[0];
    if (!employer?.approved) throw new HttpError(403, 'Only verified employers can leave ratings.');

    const ref = (await db.query(
      `SELECT r.id, r.apprentice_id, r.status, j.employer_id, j.title
         FROM referrals r JOIN job_postings j ON j.id = r.job_id WHERE r.id = $1 FOR UPDATE OF r`,
      [input.referralId],
    )).rows[0];
    if (!ref || ref.employer_id !== req.user.id || !['accepted', 'contacted'].includes(ref.status)) {
      throw new HttpError(400, 'Ratings must be tied to a real job the apprentice took on.');
    }
    if ((await db.query('SELECT 1 FROM feedback WHERE referral_id = $1', [ref.id])).rowCount) throw new HttpError(409, 'You have already rated this job.');

    const credentialIds = [...new Set(input.credentialIds)];
    if (credentialIds.length) {
      const owned = (await db.query('SELECT id FROM credentials WHERE id = ANY($1) AND apprentice_id = $2', [credentialIds, ref.apprentice_id])).rowCount;
      if (owned !== credentialIds.length) throw new HttpError(400, 'Those credentials do not belong to this apprentice.');
    }

    const id = uid('fb');
    await db.query('INSERT INTO feedback (id, apprentice_id, employer_id, referral_id, rating, comment) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, ref.apprentice_id, req.user.id, ref.id, input.rating, input.comment]);
    for (const cid of credentialIds) await db.query('INSERT INTO feedback_credentials (feedback_id, credential_id) VALUES ($1, $2)', [id, cid]);

    const apprentice = (await db.query('SELECT name FROM users WHERE id = $1', [ref.apprentice_id])).rows[0].name;
    await logAudit(db, { actor: req.user, action: 'feedback.added', target: apprentice, detail: `Rated ${input.rating}/5 for ${ref.title}` });
    await notify(db, ref.apprentice_id, 'New rating', `${req.user.name} rated your work ${input.rating}/5.`, { link: '/apprentice' });
    return id;
  });
  const row = (await pool.query('SELECT created_at FROM feedback WHERE id = $1', [id])).rows[0];
  res.status(201).json({ feedback: { id, referralId: input.referralId, rating: input.rating, comment: input.comment, credentialIds: [...new Set(input.credentialIds)], createdAt: row.created_at.toISOString() } });
});

export default router;
