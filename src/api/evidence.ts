import type { Evidence } from '../types/skillpass';
import { api } from './client';

export interface EvidenceMeta {
  kind: 'photo' | 'video';
  caption: string;
  locationLabel: string;
  lat?: number;
  lng?: number;
  /** Required for video: the code the server issued for this recording. */
  challengeCode?: string;
  durationSec?: number;
  /** "demo" only works when both the build and the server are in demo mode. */
  source?: 'camera' | 'demo';
}

/**
 * Send one captured photo or video to the server. The server works out the file type and the SHA-256 itself,
 * rejects a file that was already used as evidence, and checks that a video's code is fresh and unused.
 */
export async function uploadEvidence(blob: Blob, meta: EvidenceMeta): Promise<Evidence> {
  const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('webm') ? 'webm' : blob.type.includes('png') ? 'png' : 'jpg';
  const form = new FormData();
  form.append('file', blob, `evidence.${ext}`);
  form.append('caption', meta.caption);
  form.append('locationLabel', meta.locationLabel);
  if (meta.lat !== undefined) form.append('lat', String(meta.lat));
  if (meta.lng !== undefined) form.append('lng', String(meta.lng));
  if (meta.challengeCode) form.append('challengeCode', meta.challengeCode);
  if (meta.durationSec !== undefined) form.append('durationSec', String(meta.durationSec));
  if (meta.source) form.append('source', meta.source);
  return (await api.upload<{evidence: Evidence;}>('/api/evidence', form)).evidence;
}

/** Ask the server for a fresh four-digit code to show in the next video. It works once and expires after 15 minutes. */
export async function requestChallengeCode(): Promise<string> {
  return (await api.post<{code: string;}>('/api/evidence/challenges')).code;
}
