import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { HttpError } from '../lib/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { algorithm: 'HS256', expiresIn: config.jwtExpiresIn });
}

/**
 * Requires a valid Bearer token. The account is re-read from the database on every request,
 * so suspending a user or withdrawing consent takes effect immediately, not when the token expires.
 */
export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Please sign in to continue.');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  const { rows } = await query('SELECT id, email, role, status, name FROM users WHERE id = $1', [payload.sub]);
  const user = rows[0];
  if (!user || user.status !== 'active') throw new HttpError(401, 'This account is not active.');
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new HttpError(403, 'You do not have permission to do that.');
  next();
};
