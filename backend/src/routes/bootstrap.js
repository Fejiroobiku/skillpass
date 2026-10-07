import { Router } from 'express';
import { pool } from '../db.js';
import { getSettings } from '../lib/audit.js';
import { loadCredentialsFull, scopeFor } from '../lib/credentials.js';
import { redactHistory } from '../lib/history.js';
import { loadRisk, loadTrust } from '../lib/integrity.js';
import { authenticate } from '../middleware/auth.js';

/**
 * One call that loads everything the signed-in person's dashboards need, shaped like the frontend's types.
 * What comes back depends on role. Phone numbers and membership numbers are included only for the person
 * themselves, administrators, and a trainer's own apprentices.
 */
const router = Router();
router.use(authenticate);

const iso = (d) => (d ? new Date(d).toISOString() : undefined);
const place = (r) => ({ name: r.location_name ?? '', lat: r.lat ?? 0, lng: r.lng ?? 0 });
const column = async (sql, params) => (await pool.query(sql, params)).rows.map((r) => r.id);

const PEOPLE_SQL = `
  SELECT u.id, u.role, u.name, u.phone, u.location_name, u.lat, u.lng, u.created_at,
         tp.trade_id AS t_trade, tp.workshop, tp.association_id, tp.membership_no, tp.membership_verified,
         tp.approved AS t_approved, tp.joined_at, tp.misconduct_at, tp.misconduct_reason,
         ap.trade_id AS a_trade, ap.trainer_id, ap.started_at,
         ep.trade_id AS e_trade, ep.company, ep.approved AS e_approved
    FROM users u
    LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
    LEFT JOIN apprentice_profiles ap ON ap.user_id = u.id
    LEFT JOIN employer_profiles ep ON ep.user_id = u.id
   WHERE u.status <> 'withdrawn' AND u.id = ANY($1)`;

/** Trust details other people may see: the score and whether the trainer is under review, nothing else. */
const publicTrust = (t) => ({
  score: t.score, auditAgreement: null, auditCount: 0, avgRating: null, ratingCount: 0, flaggedShare: 0,
  issuedCount: t.issuedCount, evidenceShare: 1, poorRatings: 0, ratingPenalty: 0, misconduct: t.misconduct,
});

router.get('/', async (req, res) => {
  const me = req.user;
  const admin = me.role === 'admin';
  const settings = await getSettings(pool);

  // credentials
  const { where, params } = scopeFor(me);
  const credentials = await loadCredentialsFull(pool, where, params);
  const credIds = credentials.map((c) => c.id);
  const ownIssued = credentials.filter((c) => c.trainerId === me.id).map((c) => c.id);

  // which people this user may see
  const ids = new Set([me.id]);
  credentials.forEach((c) => [c.apprenticeId, c.trainerId, c.cosignerId, c.cosignRequestedFrom].forEach((x) => x && ids.add(x)));
  const addAll = (list) => list.forEach((x) => ids.add(x));
  if (admin) addAll(await column('SELECT id FROM users', []));
  if (me.role === 'trainer') {
    addAll(await column('SELECT user_id AS id FROM apprentice_profiles WHERE trainer_id = $1', [me.id]));
    const trade = (await pool.query('SELECT trade_id FROM trainer_profiles WHERE user_id = $1', [me.id])).rows[0]?.trade_id;
    addAll(await column(`SELECT user_id AS id FROM trainer_profiles WHERE approved AND trade_id = $1 AND misconduct_at IS NULL`, [trade]));
    addAll(await column('SELECT user_id AS id FROM employer_profiles WHERE approved AND trade_id = $1', [trade]));
  }
  if (me.role === 'apprentice') {
    const t = (await pool.query('SELECT trainer_id FROM apprentice_profiles WHERE user_id = $1', [me.id])).rows[0]?.trainer_id;
    if (t) ids.add(t);
  }
  if (me.role === 'employer') {
    // Employers match against verified apprentices in their own trade.
    addAll(await column(
      `SELECT DISTINCT c.apprentice_id AS id FROM credentials c JOIN skills s ON s.id = c.skill_id
        WHERE c.status = 'valid' AND s.trade_id = (SELECT trade_id FROM employer_profiles WHERE user_id = $1)`, [me.id]));
  }

  // jobs and referrals
  let jobWhere = 'FALSE';
  let jobParams = [];
  if (admin) { jobWhere = '$1::text IS NOT NULL'; jobParams = [me.id]; }
  else if (me.role === 'employer') { jobWhere = 'j.employer_id = $1'; jobParams = [me.id]; }
  else if (me.role === 'apprentice') { jobWhere = 'j.id IN (SELECT job_id FROM referrals WHERE apprentice_id = $1)'; jobParams = [me.id]; }
  const jobRows = jobParams.length ? (await pool.query(
    `SELECT j.*, COALESCE(array_agg(js.skill_id) FILTER (WHERE js.skill_id IS NOT NULL), '{}') AS skill_ids
       FROM job_postings j LEFT JOIN job_skills js ON js.job_id = j.id WHERE ${jobWhere} GROUP BY j.id ORDER BY j.posted_at DESC`, jobParams)).rows : [];
  jobRows.forEach((j) => ids.add(j.employer_id));
  const referralRows = jobRows.length
    ? (await pool.query(
      `SELECT * FROM referrals WHERE job_id = ANY($1) ${me.role === 'apprentice' ? 'AND apprentice_id = $2' : ''} ORDER BY sent_at DESC`,
      me.role === 'apprentice' ? [jobRows.map((j) => j.id), me.id] : [jobRows.map((j) => j.id)])).rows
    : [];
  referralRows.forEach((r) => ids.add(r.apprentice_id));

  // feedback
  let fbWhere = 'FALSE';
  let fbParams = [];
  if (admin) { fbWhere = '$1::text IS NOT NULL'; fbParams = [me.id]; }
  else if (me.role === 'employer') { fbWhere = 'f.employer_id = $1'; fbParams = [me.id]; }
  else if (me.role === 'apprentice') { fbWhere = 'f.apprentice_id = $1'; fbParams = [me.id]; }
  else if (me.role === 'trainer') { fbWhere = 'f.apprentice_id IN (SELECT user_id FROM apprentice_profiles WHERE trainer_id = $1)'; fbParams = [me.id]; }
  const feedbackRows = (await pool.query(
    `SELECT f.*, COALESCE(array_agg(fc.credential_id) FILTER (WHERE fc.credential_id IS NOT NULL), '{}') AS credential_ids
       FROM feedback f LEFT JOIN feedback_credentials fc ON fc.feedback_id = f.id WHERE ${fbWhere} GROUP BY f.id ORDER BY f.created_at DESC`, fbParams)).rows;
  feedbackRows.forEach((f) => { ids.add(f.employer_id); ids.add(f.apprentice_id); });

  // people, grouped by role
  const people = (await pool.query(PEOPLE_SQL, [[...ids]])).rows;
  const ownApprentice = (r) => me.role === 'trainer' && r.trainer_id === me.id;
  const trainers = [];
  const apprentices = [];
  const employers = [];
  const admins = [];
  for (const r of people) {
    const contact = admin || r.id === me.id || ownApprentice(r);
    const base = { id: r.id, name: r.name, location: place(r), phone: contact ? r.phone ?? '' : '' };
    if (r.role === 'trainer') {
      trainers.push({ ...base, trade: r.t_trade, workshop: r.workshop, approved: r.t_approved, joinedAt: iso(r.joined_at),
        associationId: r.association_id ?? '', membershipNo: admin || r.id === me.id ? r.membership_no : '',
        membershipVerified: r.membership_verified, misconductAt: iso(r.misconduct_at), misconductReason: r.misconduct_reason ?? undefined });
    } else if (r.role === 'apprentice') {
      apprentices.push({ ...base, trade: r.a_trade, trainerId: r.trainer_id ?? '', startedAt: iso(r.started_at) });
    } else if (r.role === 'employer') {
      employers.push({ ...base, company: r.company, trade: r.e_trade, approved: r.e_approved });
    } else admins.push({ id: r.id, name: r.name });
  }

  // trust and risk
  const trust = {};
  const risk = {};
  await Promise.all(trainers.map(async (t) => {
    const full = await loadTrust(pool, t.id);
    trust[t.id] = admin || t.id === me.id ? full : publicTrust(full);
    if (admin || t.id === me.id) risk[t.id] = await loadRisk(pool, t.id, settings);
  }));

  // integrity records
  const flagRows = admin
    ? (await pool.query('SELECT * FROM flags ORDER BY raised_at DESC')).rows
    : me.role === 'trainer'
      ? (ownIssued.length ? (await pool.query('SELECT * FROM flags WHERE credential_id = ANY($1) ORDER BY raised_at DESC', [ownIssued])).rows : [])
      : (await pool.query('SELECT * FROM flags WHERE raised_by = $1 ORDER BY raised_at DESC', [me.id])).rows;
  const sampleRows = admin
    ? (await pool.query('SELECT * FROM audit_samples ORDER BY selected_at DESC')).rows
    : me.role === 'trainer' && ownIssued.length
      ? (await pool.query('SELECT * FROM audit_samples WHERE credential_id = ANY($1) ORDER BY selected_at DESC', [ownIssued])).rows
      : [];
  const reportRows = admin
    ? (await pool.query('SELECT * FROM concern_reports ORDER BY at DESC')).rows
    : me.role === 'apprentice'
      ? (await pool.query('SELECT * FROM concern_reports WHERE apprentice_id = $1 ORDER BY at DESC', [me.id])).rows
      : [];

  // audit log: administrators see everything, everyone else sees the redacted timeline of their credentials
  const auditRows = admin
    ? (await pool.query('SELECT id, at, actor_name, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT 1000')).rows
    : credIds.length
      ? (await pool.query('SELECT id, at, actor_name, action, target, detail FROM audit_log WHERE target = ANY($1) ORDER BY at DESC, id DESC', [credIds])).rows
      : [];
  const auditEntries = auditRows.map((e) => ({ id: e.id, at: iso(e.at), actor: e.actor_name, action: e.action, target: e.target, detail: e.detail }));

  const notifications = (await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY at DESC LIMIT 200', [me.id])).rows;
  const sus = admin
    ? (await pool.query('SELECT * FROM sus_responses ORDER BY at DESC')).rows
    : (await pool.query('SELECT * FROM sus_responses WHERE user_id = $1 ORDER BY at DESC', [me.id])).rows;
  const verifications = admin ? (await pool.query('SELECT * FROM verification_events ORDER BY at DESC')).rows : [];

  const privileged = admin || me.role === 'trainer';
  const skills = (await pool.query(
    `SELECT id, trade_id, name, level, requires_cosign, status, proposed_by FROM skills ${privileged ? '' : `WHERE status = 'active'`} ORDER BY trade_id, id`)).rows;
  const trades = (await pool.query('SELECT id, name FROM trades ORDER BY name')).rows;

  res.json({
    trades,
    skills: skills.map((s) => ({ id: s.id, trade: s.trade_id, name: s.name, level: s.level, requiresCosign: s.requires_cosign, status: s.status, proposedBy: s.proposed_by ?? undefined })),
    settings,
    trainers, apprentices, employers, admins,
    credentials,
    flags: flagRows.map((f) => ({ id: f.id, credentialId: f.credential_id, raisedBy: f.raised_by, reason: f.reason, raisedAt: iso(f.raised_at), status: f.status })),
    samples: sampleRows.map((s) => ({ id: s.id, credentialId: s.credential_id, assessor: s.reviewer_id ?? '', assessorId: s.assessor_id ?? undefined, reason: s.reason ?? undefined, selectedAt: iso(s.selected_at), result: s.result })),
    reports: reportRows.map((r) => ({ id: r.id, apprenticeId: r.apprentice_id, trainerId: r.trainer_id, category: r.category, details: r.details, at: iso(r.at), status: r.status })),
    feedback: feedbackRows.map((f) => ({ id: f.id, apprenticeId: f.apprentice_id, employerId: f.employer_id, credentialIds: f.credential_ids, rating: f.rating, comment: f.comment, createdAt: iso(f.created_at), referralId: f.referral_id ?? undefined })),
    jobs: jobRows.map((j) => ({ id: j.id, employerId: j.employer_id, title: j.title, trade: j.trade_id, skillIds: j.skill_ids, location: { name: j.location_name, lat: j.lat, lng: j.lng }, postedAt: iso(j.posted_at), pay: j.pay })),
    referrals: referralRows.map((r) => ({ id: r.id, jobId: r.job_id, apprenticeId: r.apprentice_id, status: r.status, sentAt: iso(r.sent_at) })),
    auditLog: admin ? auditEntries : redactHistory(auditEntries),
    notifications: notifications.map((n) => ({ id: n.id, userId: n.user_id, channel: n.channel, title: n.title, body: n.body, at: iso(n.at), read: n.read, link: n.link ?? undefined })),
    susResponses: sus.map((s) => ({ id: s.id, userId: s.user_id, role: s.role, score: Number(s.score), at: iso(s.at) })),
    verifications: verifications.map((v) => ({ id: v.id, credentialId: v.credential_id, seconds: v.seconds, trustRating: v.trust_rating ?? undefined, at: iso(v.at) })),
    trust, risk,
  });
});

export default router;
