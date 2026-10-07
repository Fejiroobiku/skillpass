import { config } from '../config.js';

/**
 * Trust score and risk signals.
 *
 * These are direct ports of computeTrust (src/utils/credentials.ts) and computeRisk (src/utils/risk.ts)
 * from the frontend, so the numbers match what the UI already shows. They are pure functions:
 * the loaders in integrity.js fetch the rows and hand them in.
 */

/** Ratings of 2 or below count as poor; two or more trigger an automatic penalty. */
export const POOR_RATING = 2;

/**
 * @param {object} p
 * @param {{id: string, status: string, evidenceCount: number}[]} p.credentials  all credentials issued by this trainer
 * @param {{credentialId: string, status: string}[]} p.flags
 * @param {{rating: number, credentialIds: string[]}[]} p.feedback
 * @param {{credentialId: string, result: string}[]} p.samples
 * @param {boolean} p.misconduct
 */
export function computeTrust({ credentials, flags, feedback, samples, misconduct = false }) {
  const mine = credentials;
  const ids = new Set(mine.map((c) => c.id));

  const done = samples.filter((s) => ids.has(s.credentialId) && s.result !== 'pending');
  const agree = done.filter((s) => s.result === 'agree').length;
  const auditAgreement = done.length ? agree / done.length : null;

  const ratings = feedback.filter((f) => f.credentialIds.some((id) => ids.has(id)));
  const avgRating = ratings.length ? ratings.reduce((sum, f) => sum + f.rating, 0) / ratings.length : null;

  const flaggedIds = new Set(flags.filter((f) => ids.has(f.credentialId) && f.status !== 'dismissed').map((f) => f.credentialId));
  mine.filter((c) => c.status === 'revoked').forEach((c) => flaggedIds.add(c.id));
  const flaggedShare = mine.length ? flaggedIds.size / mine.length : 0;
  const evidenceShare = mine.length ? mine.filter((c) => c.evidenceCount > 0).length / mine.length : 1;

  const a = auditAgreement ?? 0.8;
  const r = avgRating !== null ? avgRating / 5 : 0.8;
  const poorRatings = ratings.filter((f) => f.rating <= POOR_RATING).length;
  const ratingPenalty = poorRatings >= 2 ? Math.min(25, poorRatings * 8) : 0;

  let score = Math.round((0.4 * a + 0.3 * r + 0.3 * (1 - flaggedShare)) * 100) - ratingPenalty;
  if (misconduct) score = Math.min(score, 10);
  score = Math.max(0, score);

  return {
    score,
    auditAgreement,
    auditCount: done.length,
    avgRating,
    ratingCount: ratings.length,
    flaggedShare,
    issuedCount: mine.length,
    evidenceShare,
    poorRatings,
    ratingPenalty,
    misconduct,
  };
}

const lagosDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: config.timezone });

/**
 * @param {object} p
 * @param {{id: string, issuedAt: string}[]} p.credentials  all credentials issued by this trainer
 * @param {number} p.notYetCount          "not yet competent" assessments recorded by this trainer
 * @param {{rating: number, credentialIds: string[]}[]} p.feedback
 * @param {number} p.openReportCount      confidential apprentice reports that are not closed
 * @param {{fastMinutes: number, clusterThreshold: number, probationCount: number}} p.settings
 */
export function computeRisk({ credentials, notYetCount, feedback, openReportCount, settings }) {
  const mine = [...credentials].sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
  const assessed = mine.length + notYetCount;
  const passRate = assessed ? mine.length / assessed : null;
  const signals = [];

  let fastPairs = 0;
  for (let i = 1; i < mine.length; i++) {
    const gapMinutes = (new Date(mine[i].issuedAt).getTime() - new Date(mine[i - 1].issuedAt).getTime()) / 60000;
    if (gapMinutes < settings.fastMinutes) fastPairs++;
  }
  if (fastPairs > 0) {
    signals.push({ id: 'fast', label: 'Issuing very fast', detail: `${fastPairs} credential${fastPairs > 1 ? 's' : ''} signed under ${settings.fastMinutes} min after the previous one` });
  }

  if (passRate !== null && assessed >= 5 && passRate >= 0.95) {
    signals.push({ id: 'pass_all', label: 'Passes everyone', detail: `${Math.round(passRate * 100)}% pass rate across ${assessed} assessments` });
  }

  const byDay = new Map();
  mine.forEach((c) => byDay.set(lagosDay(c.issuedAt), (byDay.get(lagosDay(c.issuedAt)) ?? 0) + 1));
  const peak = Math.max(0, ...byDay.values());
  if (peak >= settings.clusterThreshold) {
    signals.push({ id: 'cluster', label: 'Clustered in one day', detail: `${peak} credentials issued on a single day` });
  }

  const ids = new Set(mine.map((c) => c.id));
  const poor = feedback.filter((f) => f.rating <= POOR_RATING && f.credentialIds.some((id) => ids.has(id))).length;
  if (poor >= 2) {
    signals.push({ id: 'poor_ratings', label: 'Poor employer ratings', detail: `${poor} ratings of ${POOR_RATING}★ or less for apprentices they passed` });
  }

  if (openReportCount > 0) {
    signals.push({ id: 'reports', label: 'Apprentice report', detail: `${openReportCount} confidential report${openReportCount > 1 ? 's' : ''} open` });
  }

  const level = signals.length >= 2 ? 'high' : signals.length === 1 ? 'medium' : 'low';
  return { onProbation: mine.length < settings.probationCount, probationUsed: mine.length, passRate, assessed, signals, level };
}
