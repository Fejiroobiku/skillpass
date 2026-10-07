import { Router } from 'express';
import { query } from '../db.js';
import { getSettings } from '../lib/audit.js';
import { DEFAULT_RUBRIC } from '../lib/rubric.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/trades', async (req, res) => {
  const { rows } = await query('SELECT id, name FROM trades ORDER BY name');
  res.json({ trades: rows });
});

router.get('/associations', async (req, res) => {
  const { rows } = await query('SELECT id, name, trade_id AS trade FROM associations ORDER BY name');
  res.json({ associations: rows });
});

/** Active skills with their rubric criteria. Add ?trade=electrical to narrow it down. */
router.get('/skills', async (req, res) => {
  const params = [];
  let where = `s.status = 'active'`;
  if (typeof req.query.trade === 'string') {
    params.push(req.query.trade);
    where += ` AND s.trade_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT s.id, s.trade_id, s.name, s.level, s.requires_cosign,
            COALESCE(array_agg(c.text ORDER BY c.position) FILTER (WHERE c.text IS NOT NULL), '{}') AS criteria
       FROM skills s LEFT JOIN skill_criteria c ON c.skill_id = s.id
      WHERE ${where} GROUP BY s.id ORDER BY s.trade_id, s.id`,
    params,
  );
  res.json({
    skills: rows.map((r) => ({
      id: r.id, trade: r.trade_id, name: r.name, level: r.level, requiresCosign: r.requires_cosign, status: 'active',
      rubric: r.criteria.length ? r.criteria : DEFAULT_RUBRIC,
    })),
  });
});

/** Trainers an apprentice can choose from when registering. Approved trainers only, public fields only. */
router.get('/trainers', async (req, res) => {
  const params = [];
  let where = `tp.approved AND u.status = 'active'`;
  if (typeof req.query.trade === 'string') {
    params.push(req.query.trade);
    where += ` AND tp.trade_id = $${params.length}`;
  }
  const { rows } = await query(
    `SELECT u.id, u.name, tp.trade_id, tp.workshop, u.location_name
       FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id WHERE ${where} ORDER BY u.name`,
    params,
  );
  res.json({ trainers: rows.map((r) => ({ id: r.id, name: r.name, trade: r.trade_id, workshop: r.workshop, location: r.location_name })) });
});

/** The integrity rules (daily limit, probation length, ...) are visible to every signed-in user. */
router.get('/settings', authenticate, async (req, res) => {
  res.json({ settings: await getSettings({ query }) });
});

export default router;
