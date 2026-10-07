import { Router } from 'express';
import { z } from 'zod';
import { tx } from '../db.js';
import { logAudit, notifyAdmins } from '../lib/audit.js';
import { uid } from '../lib/ids.js';
import { loadTrainerForIssuing } from '../lib/integrity.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('trainer'));

/** A trainer proposes a skill for their trade's checklist. An administrator reviews it before it can be used. */
router.post('/propose', async (req, res) => {
  const input = z.object({
    name: z.string().trim().min(3, 'Describe the skill (at least 3 characters).').max(150),
    level: z.enum(['Foundation', 'Intermediate', 'Advanced']),
  }).parse(req.body);
  const skill = await tx(async (db) => {
    const trainer = await loadTrainerForIssuing(db, req.user.id);
    const id = uid('sk');
    await db.query(
      `INSERT INTO skills (id, trade_id, name, level, requires_cosign, status, proposed_by) VALUES ($1, $2, $3, $4, $5, 'proposed', $6)`,
      [id, trainer.trade_id, input.name, input.level, input.level === 'Advanced', req.user.id],
    );
    await logAudit(db, { actor: req.user, action: 'skill.proposed', target: input.name, detail: `${input.level} · ${trainer.trade_id}` });
    await notifyAdmins(db, 'Skill proposed', `${req.user.name} proposed “${input.name}”.`, '/admin/skills');
    return { id, trade: trainer.trade_id, name: input.name, level: input.level, requiresCosign: input.level === 'Advanced', status: 'proposed', proposedBy: req.user.id };
  });
  res.status(201).json({ skill });
});

export default router;
