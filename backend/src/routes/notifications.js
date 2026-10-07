import { Router } from 'express';
import { pool } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, user_id, channel, title, body, at, read, link FROM notifications WHERE user_id = $1 ORDER BY at DESC LIMIT 100', [req.user.id]);
  res.json({
    notifications: rows.map((n) => ({ id: n.id, userId: n.user_id, channel: n.channel, title: n.title, body: n.body, at: n.at.toISOString(), read: n.read, link: n.link ?? undefined })),
  });
});

router.post('/read-all', async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

router.post('/:id/read', async (req, res) => {
  await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

export default router;
