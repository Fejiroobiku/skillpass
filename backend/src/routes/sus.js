import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { uid } from '../lib/ids.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

/** Standard System Usability Scale scoring: ten answers from 1 to 5, odd items positive, even items negative. */
export const susScore = (answers) => answers.reduce((sum, a, i) => sum + (i % 2 === 0 ? a - 1 : 5 - a), 0) * 2.5;

/** Submit the usability survey. The score is worked out here, once per person, so it cannot be inflated. */
router.post('/', async (req, res) => {
  const { answers } = z.object({ answers: z.array(z.number().int().min(1).max(5)).length(10, 'Answer all ten questions.') }).parse(req.body);
  if ((await pool.query('SELECT 1 FROM sus_responses WHERE user_id = $1', [req.user.id])).rowCount) throw new HttpError(409, 'You have already completed the survey.');
  const score = susScore(answers);
  await pool.query('INSERT INTO sus_responses (id, user_id, role, score) VALUES ($1, $2, $3, $4)', [uid('sus'), req.user.id, req.user.role, score]);
  res.status(201).json({ score });
});

export default router;
