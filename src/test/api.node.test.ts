/**
 * The frontend's API layer against the real backend: sign-in, the bulk load the store depends on, and the
 * evidence upload and issue flow that the camera screen uses.
 */
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ApiError, api, setToken, setUnauthorizedHandler } from '../api/client';
import { requestChallengeCode, uploadEvidence } from '../api/evidence';
import { rubricFor } from '../data/integrity';
import type { Credential } from '../types/skillpass';

const signIn = async (email: string) => {
  const r = await api.post<{token: string;}>('/api/auth/login', { email, password: 'demo1234' });
  setToken(r.token);
};
const mp4 = () => new Blob([Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), randomBytes(48)])], { type: 'video/mp4' });
const jpeg = () => new Blob([Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), randomBytes(48)])], { type: 'image/jpeg' });

describe('sign-in and the bulk load', () => {
  it('turns a wrong password into the server\'s message', async () => {
    await expect(api.post('/api/auth/login', { email: 'tobi@skillpass.ng', password: 'wrong-password' })).rejects.toMatchObject({ status: 401, message: 'Incorrect email or password.' });
  });

  it('loads the slices the store expects, scoped to the role', async () => {
    await signIn('babatunde@skillpass.ng');
    const b = await api.get<Record<string, any>>('/api/bootstrap');
    for (const key of ['trades', 'skills', 'settings', 'trainers', 'apprentices', 'employers', 'credentials', 'flags', 'samples', 'reports', 'feedback', 'jobs', 'referrals', 'auditLog', 'notifications', 'susResponses', 'verifications', 'trust', 'risk']) {
      expect(b, `missing ${key}`).toHaveProperty(key);
    }
    expect(b.settings.dailyLimit).toBe(5);
    expect(b.trust.t1.score).toBe(88);
    const credential = b.credentials.find((c: Credential) => c.id === 'SP-2BNC-8QPE');
    expect(credential.evidence[0]).toHaveProperty('hash'); // the shape the UI's Credential type expects
  });

  it('signs the person out when the server rejects their token', async () => {
    let signedOut = 0;
    setUnauthorizedHandler(() => {signedOut++;});
    setToken('not-a-real-token');
    await expect(api.get('/api/bootstrap')).rejects.toBeInstanceOf(ApiError);
    expect(signedOut).toBe(1);
    setUnauthorizedHandler(null);
  });

  it('explains a network failure in plain words', async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new TypeError('fetch failed'))) as typeof fetch;
    await expect(api.get('/api/trades')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Cannot reach the SkillPass server') });
    globalThis.fetch = real;
  });
});

describe('the evidence and issue flow the camera screen uses', () => {
  let credential: Credential;

  it('uploads a video with a server-issued code and a photo, and the server fingerprints them', async () => {
    await signIn('babatunde@skillpass.ng');
    const code = await requestChallengeCode();
    expect(code).toMatch(/^\d{4}$/);
    const video = await uploadEvidence(mp4(), { kind: 'video', caption: 'Live video', locationLabel: 'Agungi, Lekki', challengeCode: code, durationSec: 12 });
    expect(video.kind).toBe('video');
    expect(video.challengeCode).toBe(code);
    expect(video.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(video.url).toMatch(/^http:\/\/127\.0\.0\.1:4100\/uploads\//);
    const photo = await uploadEvidence(jpeg(), { kind: 'photo', caption: 'Finished work', locationLabel: 'Agungi, Lekki' });
    expect(photo.kind).toBe('photo');

    // the same code cannot back a second video
    await expect(uploadEvidence(mp4(), { kind: 'video', caption: 'Again', locationLabel: 'x', challengeCode: code })).rejects.toThrow(/expired or was already used/);

    // issue with the frontend's own rubric: this also proves the UI's rubric matches the server's
    const r = await api.post<{credential: Credential;}>('/api/credentials', {
      apprenticeId: 'a3', skillId: 'el-01', evidenceIds: [video.id, photo.id], criteriaMet: rubricFor('el-01'), note: ''
    });
    credential = r.credential;
    expect(credential.status).toBe('pending_apprentice');
    expect(credential.evidence).toHaveLength(2);
    expect(credential.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a file that is already evidence on a credential, with a message the camera screen can show', async () => {
    await signIn('chinedu@skillpass.ng'); // a different trainer tries to reuse t1's photo
    const used = credential.evidence.find((e) => e.kind === 'photo')!;
    const bytes = await (await fetch(used.url)).blob();
    await expect(uploadEvidence(bytes, { kind: 'photo', caption: 'Reused', locationLabel: 'x' })).rejects.toThrow('One file matches evidence already used on another credential.');
  });

  it('lets the apprentice confirm it, and the public page then shows it valid', async () => {
    await signIn('kelechi@skillpass.ng');
    await api.post(`/api/credentials/${credential.id}/confirm`);
    setToken(null);
    const pub = await api.get<{credential: {status: string;signatureValid: boolean;};}>(`/api/verify/${credential.id}`);
    expect(pub.credential.status).toBe('valid');
    expect(pub.credential.signatureValid).toBe(true);
  });
});
