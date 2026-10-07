import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { loadTrust } from '../lib/integrity.js';

const router = Router();
router.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => config.env === 'test' }));

/**
 * An apprentice's shareable skills passport. Public, no login. Shows skills and the trainers who signed them.
 * Contact details are never included.
 */
router.get('/:id', async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.location_name, ap.trade_id, ap.started_at, tr.name AS trade_name,
            tu.id AS trainer_id, tu.name AS trainer_name, tp.workshop
       FROM users u
       JOIN apprentice_profiles ap ON ap.user_id = u.id
       JOIN trades tr ON tr.id = ap.trade_id
       LEFT JOIN users tu ON tu.id = ap.trainer_id
       LEFT JOIN trainer_profiles tp ON tp.user_id = ap.trainer_id
      WHERE u.id = $1 AND u.status = 'active'`,
    [req.params.id],
  );
  const a = rows[0];
  if (!a) throw new HttpError(404, 'Passport not found.');

  const credentials = (await query(
    `SELECT id, skill_id, trainer_id, status, issued_at FROM credentials
      WHERE apprentice_id = $1 AND status <> 'pending_apprentice' ORDER BY issued_at`,
    [a.id],
  )).rows;
  const skills = (await query(`SELECT id, name, level FROM skills WHERE trade_id = $1 AND status = 'active' ORDER BY id`, [a.trade_id])).rows;
  const ratings = (await query(
    `SELECT f.id, f.rating, f.comment, f.created_at, ep.company
       FROM feedback f JOIN employer_profiles ep ON ep.user_id = f.employer_id
      WHERE f.apprentice_id = $1 ORDER BY f.created_at DESC`,
    [a.id],
  )).rows;

  const trainerIds = new Set(credentials.map((c) => c.trainer_id));
  if (a.trainer_id) trainerIds.add(a.trainer_id);
  const trainers = {};
  for (const id of trainerIds) {
    const t = await loadTrust({ query }, id);
    const info = (await query('SELECT u.name, tp.misconduct_at FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id WHERE u.id = $1', [id])).rows[0];
    trainers[id] = { id, name: info.name, trustScore: t.score, underReview: info.misconduct_at != null };
  }

  res.json({
    passport: {
      apprentice: { id: a.id, name: a.name, location: a.location_name ?? '', trade: a.trade_id, tradeName: a.trade_name, startedAt: a.started_at.toISOString() },
      trainer: a.trainer_id ? { ...trainers[a.trainer_id], workshop: a.workshop } : null,
      skills,
      credentials: credentials.map((c) => ({ id: c.id, skillId: c.skill_id, trainerId: c.trainer_id, status: c.status, issuedAt: c.issued_at.toISOString() })),
      trainers,
      ratings: ratings.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, company: r.company, createdAt: r.created_at.toISOString() })),
    },
  });
});

export default router;
