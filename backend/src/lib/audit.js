import { uid } from './ids.js';

export const SYSTEM = { id: null, name: 'System' };

export async function getSettings(db) {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  const r = rows[0];
  return {
    dailyLimit: r.daily_limit,
    auditRatePct: r.audit_rate_pct,
    probationCount: r.probation_count,
    clusterThreshold: r.cluster_threshold,
    fastMinutes: r.fast_minutes,
    smsEnabled: r.sms_enabled,
    emailEnabled: r.email_enabled,
  };
}

/**
 * Append one row to the audit log. `actor` is a user ({ id, name }) or SYSTEM.
 * The table is append-only at the database level, so this is the only write there is.
 */
export async function logAudit(db, { actor = SYSTEM, action, target, detail = '' }) {
  await db.query(
    'INSERT INTO audit_log (id, actor_id, actor_name, action, target, detail) VALUES ($1, $2, $3, $4, $5, $6)',
    [uid('al'), actor.id ?? null, actor.name, action, target, detail],
  );
}

/**
 * Queue a notification. In-app rows are read by the frontend. SMS and email rows are stored with
 * delivered_at = NULL, ready for a gateway worker (Termii, Africa's Talking, etc.) to pick up.
 */
export async function notify(db, userId, title, body, { link = null, channels = ['in_app'] } = {}) {
  const settings = await getSettings(db);
  const active = channels.filter((c) => (c === 'sms' ? settings.smsEnabled : c === 'email' ? settings.emailEnabled : true));
  for (const channel of active) {
    await db.query(
      'INSERT INTO notifications (id, user_id, channel, title, body, link) VALUES ($1, $2, $3, $4, $5, $6)',
      [uid('n'), userId, channel, title, body, link],
    );
  }
}

export async function notifyAdmins(db, title, body, link) {
  const { rows } = await db.query(`SELECT id FROM users WHERE role = 'admin' AND status = 'active'`);
  for (const r of rows) await notify(db, r.id, title, body, { link });
}

export async function nameOf(db, id) {
  if (!id) return '';
  const { rows } = await db.query('SELECT name FROM users WHERE id = $1', [id]);
  return rows[0]?.name ?? id;
}
