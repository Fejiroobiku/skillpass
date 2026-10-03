import type { Attempt, ConcernReport, Credential, Feedback, Settings, Trainer } from '../types/skillpass';
import { POOR_RATING } from './credentials';

export interface RiskSignal {
  id: 'fast' | 'pass_all' | 'cluster' | 'poor_ratings' | 'reports';
  label: string;
  detail: string;
}

export interface TrainerRisk {
  onProbation: boolean;
  probationUsed: number;
  passRate: number | null;
  assessed: number;
  signals: RiskSignal[];
  level: 'low' | 'medium' | 'high';
}

export function computeRisk(
trainer: Trainer,
credentials: Credential[],
attempts: Attempt[],
feedback: Feedback[],
reports: ConcernReport[],
settings: Settings)
: TrainerRisk {
  const mine = credentials.filter((c) => c.trainerId === trainer.id).sort((a, b) => a.issuedAt.localeCompare(b.issuedAt));
  const notYet = attempts.filter((a) => a.trainerId === trainer.id).length;
  const assessed = mine.length + notYet;
  const passRate = assessed ? mine.length / assessed : null;
  const signals: RiskSignal[] = [];

  let fastPairs = 0;
  for (let i = 1; i < mine.length; i++) {
    const gap = (new Date(mine[i].issuedAt).getTime() - new Date(mine[i - 1].issuedAt).getTime()) / 60000;
    if (gap < settings.fastMinutes) fastPairs++;
  }
  if (fastPairs > 0) signals.push({ id: 'fast', label: 'Issuing very fast', detail: `${fastPairs} credential${fastPairs > 1 ? 's' : ''} signed under ${settings.fastMinutes} min after the previous one` });

  if (passRate !== null && assessed >= 5 && passRate >= 0.95) signals.push({ id: 'pass_all', label: 'Passes everyone', detail: `${Math.round(passRate * 100)}% pass rate across ${assessed} assessments` });

  const byDay = new Map<string, number>();
  mine.forEach((c) => byDay.set(c.issuedAt.slice(0, 10), (byDay.get(c.issuedAt.slice(0, 10)) ?? 0) + 1));
  const peak = Math.max(0, ...byDay.values());
  if (peak >= settings.clusterThreshold) signals.push({ id: 'cluster', label: 'Clustered in one day', detail: `${peak} credentials issued on a single day` });

  const ids = new Set(mine.map((c) => c.id));
  const poor = feedback.filter((f) => f.rating <= POOR_RATING && f.credentialIds.some((id) => ids.has(id))).length;
  if (poor >= 2) signals.push({ id: 'poor_ratings', label: 'Poor employer ratings', detail: `${poor} ratings of ${POOR_RATING}★ or less for apprentices they passed` });

  const open = reports.filter((r) => r.trainerId === trainer.id && r.status !== 'closed').length;
  if (open > 0) signals.push({ id: 'reports', label: 'Apprentice report', detail: `${open} confidential report${open > 1 ? 's' : ''} open` });

  const level = signals.length >= 2 ? 'high' : signals.length === 1 ? 'medium' : 'low';
  return { onProbation: mine.length < settings.probationCount, probationUsed: mine.length, passRate, assessed, signals, level };
}