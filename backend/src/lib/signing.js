import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

/**
 * The signature covers who, what, when and the exact evidence files.
 * Status is deliberately NOT included: it changes legitimately over a credential's life.
 */
export function signingPayload({ id, apprenticeId, skillId, trainerId, issuedAt, evidenceHashes }) {
  return [id, apprenticeId, skillId, trainerId, new Date(issuedAt).toISOString(), [...evidenceHashes].sort().join(',')].join('|');
}

export function signCredential(fields) {
  return createHmac('sha256', config.signingKey).update(signingPayload(fields)).digest('hex');
}

export function verifySignature(fields, signature) {
  const expected = Buffer.from(signCredential(fields), 'hex');
  const given = Buffer.from(String(signature ?? ''), 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
