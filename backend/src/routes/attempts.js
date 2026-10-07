import { Router } from 'express';
import { z } from 'zod';
import { tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { logAudit, notify } from '../lib/audit.js';
import { uid } from '../lib/ids.js';
import { getRubric } from '../lib/rubric.js';
import { loadTrainerForIssuing } from '../lib/integrity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('trainer'));

const schema = z.object({
  apprenticeId: z.string().min(1),
  skillId: z.string().min(1),
  criteriaMet: z.array(z.string()).max(50),
});

/**
 * "Not yet competent": the trainer assessed the apprentice and some criteria were missing.
 * Recording honest failures matters, because a trainer who never fails anyone is a risk signal.
 */
router.post('/', async (req, res) => {
  const input = schema.parse(req.body);
  await tx(async (db) => {
    const trainer = await loadTrainerForIssuing(db, req.user.id);
    const apprentice = (await db.query(
      'SELECT u.id, u.name FROM users u JOIN apprentice_profiles ap ON ap.user_id = u.id WHERE u.id = $1 AND ap.trainer_id = $2',
      [input.apprenticeId, trainer.id],
    )).rows[0];
    if (!apprentice) throw new HttpError(403, 'You can only assess your own apprentices.');
    const skill = (await db.query(`SELECT id, name, trade_id FROM skills WHERE id = $1 AND status = 'active'`, [input.skillId])).rows[0];
    if (!skill || skill.trade_id !== trainer.trade_id) throw new HttpError(400, 'Choose a skill from your trade.');

    const rubric = await getRubric(db, skill.id);
    const met = rubric.filter((r) => input.criteriaMet.includes(r));
    if (met.length === rubric.length) throw new HttpError(400, 'Every criterion was observed, so issue the credential instead.');

    await db.query('INSERT INTO attempts (id, trainer_id, apprentice_id, skill_id, criteria_met) VALUES ($1, $2, $3, $4, $5)', [uid('at'), trainer.id, apprentice.id, skill.id, met]);
    await logAudit(db, { actor: req.user, action: 'assessment.not_yet', target: apprentice.name, detail: `${skill.name} · ${met.length}/${rubric.length} criteria` });
    await notify(db, apprentice.id, 'Keep practising', `“${skill.name}” was assessed as not yet competent. Your trainer can assess you again.`, { link: '/apprentice' });
  });
  res.status(201).json({ ok: true });
});

export default router;
