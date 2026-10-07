import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { query, tx } from '../db.js';
import { HttpError } from '../lib/errors.js';
import { logAudit, notify, notifyAdmins } from '../lib/audit.js';
import { userId } from '../lib/ids.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = Router();

const ROLE_LABEL = { trainer: 'Trainer', apprentice: 'Apprentice', employer: 'Employer', admin: 'Administrator' };
const consentMessage = 'You need to give consent to join the pilot.';

const registerSchema = z.object({
  role: z.enum(['trainer', 'apprentice', 'employer']),
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  phone: z.string().trim().min(7, 'Enter a phone number.').max(25),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(200),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth.'),
  trade: z.string().min(1, 'Choose a trade.'),
  location: z.object({
    name: z.string().trim().min(1).max(120),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  consent: z.boolean({ required_error: consentMessage, invalid_type_error: consentMessage }).refine((v) => v === true, { message: consentMessage }),
  trainerId: z.string().optional(),
  workshop: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  membershipNo: z.string().trim().max(60).optional(),
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase().min(1), password: z.string().min(1) });

function ageFrom(dob) {
  const d = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return NaN;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

// Compared against when the email is unknown, so a missing account takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

/** The signed-in user plus the profile for their role. Shape mirrors what the frontend's AuthContext builds. */
async function currentUser(db, id) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.role, u.name, u.phone, u.location_name, u.lat, u.lng, u.created_at, u.consent_at, u.dob,
            tp.trade_id AS t_trade, tp.workshop, tp.association_id, tp.membership_no, tp.membership_verified, tp.approved AS t_approved,
            tp.misconduct_at, tp.misconduct_reason,
            ap.trade_id AS a_trade, ap.trainer_id, ap.started_at,
            ep.trade_id AS e_trade, ep.company, ep.approved AS e_approved,
            COALESCE(tr.name, ar.name, er.name) AS trade_name
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       LEFT JOIN apprentice_profiles ap ON ap.user_id = u.id
       LEFT JOIN employer_profiles ep ON ep.user_id = u.id
       LEFT JOIN trades tr ON tr.id = tp.trade_id
       LEFT JOIN trades ar ON ar.id = ap.trade_id
       LEFT JOIN trades er ON er.id = ep.trade_id
      WHERE u.id = $1`,
    [id],
  );
  const r = rows[0];
  const location = r.location_name ? { name: r.location_name, lat: r.lat, lng: r.lng } : undefined;
  const account = { createdAt: r.created_at.toISOString(), consentAt: r.consent_at.toISOString(), dob: r.dob };
  const base = { id: r.id, role: r.role, name: r.name, email: r.email, phone: r.phone ?? undefined, location, account };
  if (r.role === 'trainer') {
    return { ...base, title: `Trainer · ${r.trade_name}`, profile: {
      trade: r.t_trade, workshop: r.workshop, associationId: r.association_id, membershipNo: r.membership_no,
      membershipVerified: r.membership_verified, approved: r.t_approved, joinedAt: r.created_at.toISOString(),
      misconductAt: r.misconduct_at?.toISOString(), misconductReason: r.misconduct_reason ?? undefined } };
  }
  if (r.role === 'apprentice') {
    return { ...base, title: `Apprentice · ${r.trade_name}`, profile: { trade: r.a_trade, trainerId: r.trainer_id, startedAt: r.started_at.toISOString() } };
  }
  if (r.role === 'employer') {
    return { ...base, title: r.company ?? 'Employer', profile: { trade: r.e_trade, company: r.company, approved: r.e_approved } };
  }
  return { ...base, title: 'Pilot Administrator', profile: {} };
}

router.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);
  const age = ageFrom(input.dob);
  if (Number.isNaN(age) || age < 0 || age > 120) throw new HttpError(400, 'Enter a valid date of birth.');
  if (age < 18) throw new HttpError(400, 'SkillPass pilot participants must be 18 or older.');
  if (input.role === 'trainer' && !input.membershipNo) throw new HttpError(400, 'Enter your trade association membership number so we can verify it.');

  const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

  const id = await tx(async (db) => {
    const trade = (await db.query('SELECT id FROM trades WHERE id = $1', [input.trade])).rows[0];
    if (!trade) throw new HttpError(400, 'Choose a valid trade.');
    const taken = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [input.email]);
    if (taken.rowCount) throw new HttpError(409, 'An account with this email already exists.');

    const id = userId({ trainer: 't', apprentice: 'a', employer: 'e' }[input.role]);
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, name, phone, dob, location_name, lat, lng, consent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [id, input.email, passwordHash, input.role, input.name, input.phone, input.dob, input.location.name, input.location.lat, input.location.lng],
    );

    if (input.role === 'trainer') {
      const assoc = (await db.query('SELECT id FROM associations WHERE trade_id = $1 ORDER BY id LIMIT 1', [input.trade])).rows[0];
      await db.query(
        `INSERT INTO trainer_profiles (user_id, trade_id, workshop, association_id, membership_no) VALUES ($1, $2, $3, $4, $5)`,
        [id, input.trade, input.workshop || `${input.name.split(' ')[0]}'s Workshop`, assoc?.id ?? null, input.membershipNo],
      );
      await notifyAdmins(db, 'Trainer awaiting approval',
        `${input.name} (${input.location.name}) registered. Verify association membership ${input.membershipNo}.`, '/admin/users');
    } else if (input.role === 'apprentice') {
      if (!input.trainerId) throw new HttpError(400, 'Choose the trainer you are learning from.');
      const trainer = (await db.query(
        `SELECT u.id FROM users u JOIN trainer_profiles tp ON tp.user_id = u.id
          WHERE u.id = $1 AND tp.trade_id = $2 AND u.status = 'active'`,
        [input.trainerId, input.trade],
      )).rows[0];
      if (!trainer) throw new HttpError(400, 'Choose a trainer in the same trade.');
      await db.query('INSERT INTO apprentice_profiles (user_id, trade_id, trainer_id) VALUES ($1, $2, $3)', [id, input.trade, trainer.id]);
      await notify(db, trainer.id, 'New apprentice linked', `${input.name} joined SkillPass as your apprentice.`, { link: '/trainer/apprentices' });
    } else {
      await db.query('INSERT INTO employer_profiles (user_id, company, trade_id) VALUES ($1, $2, $3)', [id, input.company || input.name, input.trade]);
    }

    await logAudit(db, { actor: { id, name: input.name }, action: 'account.registered', target: input.email, detail: `${ROLE_LABEL[input.role]} · consent recorded (NDPA 2023)` });
    return id;
  });

  const user = await currentUser({ query }, id);
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await query('SELECT id, email, role, status, name, password_hash FROM users WHERE lower(email) = $1', [email]);
  const account = rows[0];
  const passwordOk = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
  // One message for "no such account" and "wrong password" so the form cannot be used to find out who has an account.
  if (!account || !passwordOk) throw new HttpError(401, 'Incorrect email or password.');
  if (account.status === 'suspended') throw new HttpError(403, 'This account is suspended. Contact the pilot administrator.');
  if (account.status === 'withdrawn') throw new HttpError(403, 'Consent was withdrawn for this account, so it has been closed.');

  await logAudit({ query }, { actor: account, action: 'account.login', target: account.email, detail: `Signed in as ${ROLE_LABEL[account.role]}` });
  res.json({ token: signToken(account), user: await currentUser({ query }, account.id) });
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: await currentUser({ query }, req.user.id) });
});

/** NDPA 2023: a participant can withdraw consent at any time. The account is closed immediately. */
router.post('/withdraw-consent', authenticate, async (req, res) => {
  await tx(async (db) => {
    await db.query(`UPDATE users SET status = 'withdrawn' WHERE id = $1`, [req.user.id]);
    await logAudit(db, { actor: req.user, action: 'consent.withdrawn', target: req.user.email, detail: 'Participant withdrew consent; personal data scheduled for deletion' });
  });
  res.json({ ok: true });
});

export default router;
