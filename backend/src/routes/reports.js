import { Router } from 'express';
import { z } from 'zod';
import { pool, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { logAudit, notifyAdmins } from '../lib/audit.js';
import { uid } from '../lib/ids.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const schema = z.object({
  category: z.enum(['payment', 'pressure', 'false_record', 'other']),
  details: z.string().trim().min(10, 'Please describe what happened (at least 10 characters).').max(2000),
});

/**
 * Confidential report by an apprentice about their trainer (for example, being asked to pay for a record).
 * The trainer is never told, and the audit log does not record who filed it.
 */
router.post('/', requireRole('apprentice'), async (req, res) => {
  const input = schema.parse(req.body);
  await tx(async (db) => {
    const trainerId = (await db.query('SELECT trainer_id FROM apprentice_profiles WHERE user_id = $1', [req.user.id])).rows[0]?.trainer_id;
    if (!trainerId) throw new HttpError(400, 'You are not linked to a trainer yet.');
    await db.query('INSERT INTO concern_reports (id, apprentice_id, trainer_id, category, details) VALUES ($1, $2, $3, $4, $5)', [uid('cr'), req.user.id, trainerId, input.category, input.details]);
    await logAudit(db, { actor: { id: null, name: 'Confidential' }, action: 'report.received', target: 'Confidential report', detail: 'Apprentice report received (identity visible to administrators only)' });
    await notifyAdmins(db, 'Confidential apprentice report', 'A new report needs review. The trainer has not been told.', '/admin/review');
  });
  res.status(201).json({ ok: true });
});

/** Apprentices see their own reports (without the trainer). Administrators see all of them. */
router.get('/', requireRole('apprentice', 'admin'), async (req, res) => {
  const admin = req.user.role === 'admin';
  const { rows } = await pool.query(
    `SELECT r.id, r.apprentice_id, r.trainer_id, r.category, r.details, r.at, r.status, au.name AS apprentice_name, tu.name AS trainer_name
       FROM concern_reports r JOIN users au ON au.id = r.apprentice_id JOIN users tu ON tu.id = r.trainer_id
      ${admin ? '' : 'WHERE r.apprentice_id = $1'} ORDER BY r.at DESC`,
    admin ? [] : [req.user.id],
  );
  res.json({
    reports: rows.map((r) => ({
      id: r.id, category: r.category, details: r.details, at: r.at.toISOString(), status: r.status,
      ...(admin ? { apprenticeId: r.apprentice_id, apprenticeName: r.apprentice_name, trainerId: r.trainer_id, trainerName: r.trainer_name } : {}),
    })),
  });
});

export default router;
