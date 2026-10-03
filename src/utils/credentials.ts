import type { AuditSample, Credential, CredentialStatus, Feedback, Flag, Place } from '../types/skillpass';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCredentialId(): string {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  return `SP-${block()}-${block()}`;
}

/** Deterministic pseudo-signature for the prototype (server signs in production). */
export function signPayload(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1234567;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822507);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).slice(0, 16);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export interface TrustBreakdown {
  score: number;
  auditAgreement: number | null;
  auditCount: number;
  avgRating: number | null;
  ratingCount: number;
  flaggedShare: number;
  issuedCount: number;
  evidenceShare: number;
  poorRatings: number;
  ratingPenalty: number;
  misconduct: boolean;
}

/** Ratings of 2 or below count as poor; two or more trigger an automatic penalty. */
export const POOR_RATING = 2;

export function computeTrust(
trainerId: string,
credentials: Credential[],
flags: Flag[],
feedback: Feedback[],
samples: AuditSample[],
misconduct = false)
: TrustBreakdown {
  const mine = credentials.filter((c) => c.trainerId === trainerId);
  const ids = new Set(mine.map((c) => c.id));
  const done = samples.filter((s) => ids.has(s.credentialId) && s.result !== 'pending');
  const agree = done.filter((s) => s.result === 'agree').length;
  const auditAgreement = done.length ? agree / done.length : null;
  const ratings = feedback.filter((f) => f.credentialIds.some((id) => ids.has(id)));
  const avgRating = ratings.length ? ratings.reduce((s, f) => s + f.rating, 0) / ratings.length : null;
  const flaggedIds = new Set(flags.filter((f) => ids.has(f.credentialId) && f.status !== 'dismissed').map((f) => f.credentialId));
  mine.filter((c) => c.status === 'revoked').forEach((c) => flaggedIds.add(c.id));
  const flaggedShare = mine.length ? flaggedIds.size / mine.length : 0;
  const evidenceShare = mine.length ? mine.filter((c) => c.evidence.length > 0).length / mine.length : 1;

  const a = auditAgreement ?? 0.8;
  const r = avgRating !== null ? avgRating / 5 : 0.8;
  const poorRatings = ratings.filter((f) => f.rating <= POOR_RATING).length;
  const ratingPenalty = poorRatings >= 2 ? Math.min(25, poorRatings * 8) : 0;
  let score = Math.round((0.4 * a + 0.3 * r + 0.3 * (1 - flaggedShare)) * 100) - ratingPenalty;
  if (misconduct) score = Math.min(score, 10);
  score = Math.max(0, score);

  return { score, auditAgreement, auditCount: done.length, avgRating, ratingCount: ratings.length, flaggedShare, issuedCount: mine.length, evidenceShare, poorRatings, ratingPenalty, misconduct };
}

export const statusMeta: Record<CredentialStatus, {label: string;tone: 'ok' | 'warn' | 'bad' | 'neutral';}> = {
  valid: { label: 'Valid', tone: 'ok' },
  flagged: { label: 'Flagged', tone: 'warn' },
  under_review: { label: 'Under review', tone: 'warn' },
  revoked: { label: 'Revoked', tone: 'bad' },
  pending_apprentice: { label: 'Awaiting apprentice', tone: 'neutral' },
  pending_cosign: { label: 'Awaiting co-sign', tone: 'neutral' },
  held_review: { label: 'Held for review', tone: 'neutral' }
};

/** Standard System Usability Scale scoring (answers 1–5, ten items). */
export function susScore(answers: number[]): number {
  const sum = answers.reduce((s, a, i) => s + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return sum * 2.5;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function ageFrom(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || now.getMonth() === d.getMonth() && now.getDate() < d.getDate()) age--;
  return age;
}

export function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}