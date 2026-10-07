import { randomBytes, randomInt } from 'node:crypto';

// No I, O, 0 or 1 so IDs can be read out over the phone without mix-ups.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function credentialId() {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `SP-${block()}-${block()}`;
}

/** Record ids such as al-mgb3k1x2-a1b2c3. */
export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

/** User ids keep the one-letter role prefix the frontend already relies on (t, a, e). */
export const userId = (prefix) => `${prefix}${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;

/** Four-digit liveness code the trainer must show in the video. */
export const challengeCode = () => String(randomInt(1000, 10000));
