import type { Apprentice, Credential, Job } from '../types/skillpass';
import { distanceKm } from './credentials';

export interface Match {
  apprentice: Apprentice;
  matchedSkillIds: string[];
  missingSkillIds: string[];
  distance: number;
  score: number;
}

export function verifiedSkillIds(apprenticeId: string, credentials: Credential[]): Set<string> {
  return new Set(credentials.filter((c) => c.apprenticeId === apprenticeId && c.status === 'valid').map((c) => c.skillId));
}

export function scoreMatch(job: Job, apprentice: Apprentice, credentials: Credential[]): Match {
  const verified = verifiedSkillIds(apprentice.id, credentials);
  const matchedSkillIds = job.skillIds.filter((s) => verified.has(s));
  const missingSkillIds = job.skillIds.filter((s) => !verified.has(s));
  const distance = distanceKm(job.location, apprentice.location);
  const skillScore = job.skillIds.length ? matchedSkillIds.length / job.skillIds.length : 0;
  const distScore = Math.max(0, 1 - distance / 30);
  const score = Math.round((0.7 * skillScore + 0.3 * distScore) * 100);
  return { apprentice, matchedSkillIds, missingSkillIds, distance, score };
}

export function rankMatches(job: Job, apprentices: Apprentice[], credentials: Credential[]): Match[] {
  return apprentices.
  filter((a) => a.trade === job.trade).
  map((a) => scoreMatch(job, a, credentials)).
  filter((m) => m.matchedSkillIds.length > 0).
  sort((a, b) => b.score - a.score);
}