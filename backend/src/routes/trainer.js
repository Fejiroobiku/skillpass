import { Router } from 'express';
import { pool } from '../db.js';
import { getSettings } from '../lib/audit.js';
import { issuedToday, loadRisk, loadTrust } from '../lib/integrity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('trainer'));

router.get('/apprentices', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.phone, u.location_name, u.lat, u.lng, ap.trade_id, ap.started_at
       FROM apprentice_profiles ap JOIN users u ON u.id = ap.user_id
      WHERE ap.trainer_id = $1 AND u.status = 'active' ORDER BY u.name`,
    [req.user.id],
  );
  res.json({
    apprentices: rows.map((r) => ({
      id: r.id, name: r.name, phone: r.phone, trade: r.trade_id, trainerId: req.user.id,
      location: { name: r.location_name, lat: r.lat, lng: r.lng }, startedAt: r.started_at.toISOString(),
    })),
  });
});

/** Everything the trainer dashboard and the issue form need to show where this trainer stands. */
router.get('/standing', async (req, res) => {
  const settings = await getSettings(pool);
  const profile = (await pool.query('SELECT approved, membership_verified, misconduct_at FROM trainer_profiles WHERE user_id = $1', [req.user.id])).rows[0];
  const [trust, risk, today] = await Promise.all([
    loadTrust(pool, req.user.id),
    loadRisk(pool, req.user.id, settings),
    issuedToday(pool, req.user.id),
  ]);
  res.json({
    trust, risk,
    issuedToday: today,
    dailyLimit: settings.dailyLimit,
    probationCount: settings.probationCount,
    canIssue: profile.approved && profile.membership_verified && !profile.misconduct_at,
  });
});

/** People who can co-sign this trainer's credentials: other approved trainers and verified employers in the trade. */
router.get('/cosigners', async (req, res) => {
  const trade = (await pool.query('SELECT trade_id FROM trainer_profiles WHERE user_id = $1', [req.user.id])).rows[0].trade_id;
  const trainers = await pool.query(
    `SELECT u.id, u.name, tp.workshop FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id
      WHERE tp.approved AND tp.trade_id = $1 AND u.id <> $2 AND tp.misconduct_at IS NULL AND u.status = 'active' ORDER BY u.name`,
    [trade, req.user.id],
  );
  const employers = await pool.query(
    `SELECT u.id, u.name, ep.company FROM users u JOIN employer_profiles ep ON ep.user_id = u.id
      WHERE ep.approved AND ep.trade_id = $1 AND u.status = 'active' ORDER BY u.name`,
    [trade],
  );
  res.json({ trainers: trainers.rows, employers: employers.rows });
});

export default router;
