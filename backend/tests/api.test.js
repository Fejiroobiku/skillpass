/**
 * End-to-end tests against a real PostgreSQL database.
 *
 *   createdb skillpass_test            (or: psql -c "CREATE DATABASE skillpass_test")
 *   npm test
 *
 * Set TEST_DATABASE_URL to use a different database. The database is WIPED and re-seeded on every run,
 * so the URL must contain "test".
 */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgres://skillpass:skillpass@localhost:5432/skillpass_test';
process.env.JWT_SECRET = 'test-jwt-secret-test-jwt-secret-test-jwt-secret';
process.env.SIGNING_KEY = 'test-signing-key-test-signing-key-test-signing-key';
process.env.BCRYPT_ROUNDS = '4';
process.env.PUBLIC_URL = 'http://api.test';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `skillpass-test-uploads-${process.pid}`);
assert.match(process.env.DATABASE_URL, /test/, 'Refusing to wipe a database whose URL does not contain "test".');

const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');
const { reset } = await import('../scripts/db.js');

let server;
let base;

before(async () => {
  await reset();
  server = (await createApp()).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
  await rm(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(base + url, { method, headers, body: payload });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function login(email, password = 'demo1234') {
  const r = await api('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token;
}

const jpeg = (seed = randomBytes(48)) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), seed]);
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), randomBytes(48)]);

function upload(token, buffer, fields = {}) {
  const form = new FormData();
  form.append('file', new Blob([buffer]), 'evidence.bin');
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  return api('POST', '/api/evidence', { token, form });
}

/** A live video backed by a fresh server-issued challenge, ready to attach to a credential. */
async function freshVideo(token) {
  const ch = await api('POST', '/api/evidence/challenges', { token });
  assert.equal(ch.status, 201, JSON.stringify(ch.body));
  const up = await upload(token, mp4(), { challengeCode: ch.body.code, durationSec: 20, caption: 'Live video', locationLabel: 'Agungi, Lekki' });
  assert.equal(up.status, 201, JSON.stringify(up.body));
  return up.body.evidence;
}

const allCriteria = async (skillId) => {
  const r = await api('GET', '/api/skills');
  return r.body.skills.find((s) => s.id === skillId).rubric;
};

async function issue(token, { apprenticeId, skillId, evidenceIds, cosignRequestedFrom, note = '' }) {
  return api('POST', '/api/credentials', {
    token,
    body: { apprenticeId, skillId, evidenceIds, criteriaMet: await allCriteria(skillId), cosignRequestedFrom, note },
  });
}

const auditCount = async (action, target) =>
  (await pool.query('SELECT count(*)::int AS n FROM audit_log WHERE action = $1 AND ($2::text IS NULL OR target = $2)', [action, target ?? null])).rows[0].n;

const tokens = {};
const state = {};

// ---------------------------------------------------------------------------
// authentication and accounts
// ---------------------------------------------------------------------------

describe('authentication', () => {
  it('signs in each demo role and returns the right profile', async () => {
    tokens.admin = await login('admin@skillpass.ng');
    tokens.t1 = await login('babatunde@skillpass.ng');
    tokens.t4 = await login('chinedu@skillpass.ng');
    tokens.t3 = await login('ibrahim@skillpass.ng');
    tokens.a1 = await login('tobi@skillpass.ng');
    tokens.a2 = await login('emeka@skillpass.ng');
    tokens.a3 = await login('kelechi@skillpass.ng');
    tokens.e1 = await login('folake@skillpass.ng');
    const me = await api('GET', '/api/auth/me', { token: tokens.t1 });
    assert.equal(me.body.user.role, 'trainer');
    assert.equal(me.body.user.title, 'Trainer · Electrical Installation');
    assert.equal(me.body.user.profile.approved, true);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrong = await api('POST', '/api/auth/login', { body: { email: 'tobi@skillpass.ng', password: 'nope-nope' } });
    const unknown = await api('POST', '/api/auth/login', { body: { email: 'nobody@skillpass.ng', password: 'nope-nope' } });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, unknown.body.error);
  });

  it('requires a token, and rejects a forged one', async () => {
    assert.equal((await api('GET', '/api/credentials')).status, 401);
    assert.equal((await api('GET', '/api/credentials', { token: 'not.a.token' })).status, 401);
  });

  it('registers an apprentice, but not an under-18 or one without consent', async () => {
    const person = (over = {}) => ({
      role: 'apprentice', name: 'Ada Nwankwo', email: 'ada@example.com', phone: '08031234567', password: 'a-good-password',
      dob: '2000-01-15', trade: 'electrical', trainerId: 't1', consent: true,
      location: { name: 'Ajah', lat: 6.4698, lng: 3.5852 }, ...over,
    });
    assert.equal((await api('POST', '/api/auth/register', { body: person({ dob: '2015-01-15' }) })).status, 400);
    assert.equal((await api('POST', '/api/auth/register', { body: person({ consent: false }) })).status, 400);
    assert.equal((await api('POST', '/api/auth/register', { body: person({ password: 'short' }) })).status, 400);
    assert.equal((await api('POST', '/api/auth/register', { body: person({ trainerId: undefined, email: 'no-trainer@example.com' }) })).status, 400); // every apprentice is linked to a trainer
    const ok = await api('POST', '/api/auth/register', { body: person() });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.user.profile.trainerId, 't1');
    assert.equal((await api('POST', '/api/auth/register', { body: person({ email: 'ADA@example.com' }) })).status, 409);
    tokens.ada = ok.body.token;
  });

  it('a suspended account loses access immediately, even with a valid token', async () => {
    const before = await api('GET', '/api/credentials', { token: tokens.ada });
    assert.equal(before.status, 200);
    const adaId = (await api('GET', '/api/auth/me', { token: tokens.ada })).body.user.id;
    assert.equal((await api('POST', `/api/admin/users/${adaId}/status`, { token: tokens.admin, body: { status: 'suspended' } })).status, 200);
    assert.equal((await api('GET', '/api/credentials', { token: tokens.ada })).status, 401);
    assert.equal((await api('POST', '/api/auth/login', { body: { email: 'ada@example.com', password: 'a-good-password' } })).status, 403);
  });

  it('only administrators can reach admin routes', async () => {
    assert.equal((await api('GET', '/api/admin/review', { token: tokens.a1 })).status, 403);
    assert.equal((await api('GET', '/api/admin/review', { token: tokens.t1 })).status, 403);
    assert.equal((await api('GET', '/api/admin/review', { token: tokens.admin })).status, 200);
  });
});

// ---------------------------------------------------------------------------
// public verification
// ---------------------------------------------------------------------------

describe('public verification', () => {
  it('verifies a seeded credential without a login, with a valid server signature', async () => {
    const r = await api('GET', '/api/verify/sp-2bnc-8qpe');
    assert.equal(r.status, 200);
    assert.equal(r.body.credential.status, 'valid');
    assert.equal(r.body.credential.signatureValid, true);
    assert.equal(r.body.credential.skill.name, 'Wire a consumer unit (distribution board)');
  });

  it('keeps contact details, file hashes and GPS points off the public page', async () => {
    const text = JSON.stringify((await api('GET', '/api/verify/SP-2BNC-8QPE')).body);
    for (const secret of ['0803 412 7781', '0810 223 9901', 'babatunde@skillpass.ng', 'tobi@skillpass.ng', '"hash"', '"lat"', '"lng"', 'password']) {
      assert.ok(!text.includes(secret), `public response leaks ${secret}`);
    }
  });

  it('matches the trust score the frontend computes for the same data', async () => {
    assert.equal((await api('GET', '/api/verify/SP-2BNC-8QPE')).body.credential.trainer.trustScore, 88);
    assert.equal((await api('GET', '/api/verify/SP-4NAT-2XHE')).body.credential.trainer.trustScore, 64);
    assert.equal((await api('GET', '/api/verify/SP-8KMA-3TRE')).body.credential.trainer.trustScore, 55);
  });

  it('hides who raised a flag and what they wrote', async () => {
    const r = await api('GET', '/api/verify/SP-3WLA-9KDS');
    const flagged = r.body.credential.history.find((h) => h.action === 'credential.flagged');
    assert.equal(flagged.actor, 'A verified user');
    assert.ok(!JSON.stringify(r.body).includes('Folake'));
    assert.ok(!JSON.stringify(r.body).includes('had to be redone'));
  });

  it('shows revoked credentials with their reason, and 404s on unknown or malformed ids', async () => {
    const revoked = await api('GET', '/api/verify/SP-2DVS-8LQJ');
    assert.equal(revoked.body.credential.status, 'revoked');
    assert.match(revoked.body.credential.revokeReason, /thread the machine/);
    assert.equal((await api('GET', '/api/verify/SP-AAAA-BBBB')).status, 404);
    assert.equal((await api('GET', '/api/verify/not-an-id')).status, 404);
  });

  it('detects tampering: changing a signed field makes the signature invalid', async () => {
    await pool.query(`UPDATE credentials SET trainer_id = 't4' WHERE id = 'SP-2BNC-8QPE'`);
    try {
      assert.equal((await api('GET', '/api/verify/SP-2BNC-8QPE')).body.credential.signatureValid, false);
    } finally {
      await pool.query(`UPDATE credentials SET trainer_id = 't1' WHERE id = 'SP-2BNC-8QPE'`);
    }
    assert.equal((await api('GET', '/api/verify/SP-2BNC-8QPE')).body.credential.signatureValid, true);
  });
});

// ---------------------------------------------------------------------------
// evidence
// ---------------------------------------------------------------------------

describe('evidence', () => {
  it('rejects files that are not photos or videos, whatever the browser claims', async () => {
    const r = await upload(tokens.t1, Buffer.from('<?php echo "hi"; ?>'));
    assert.equal(r.status, 415);
  });

  it('requires a server-issued, unused, unexpired code for video', async () => {
    assert.equal((await upload(tokens.t1, mp4(), {})).status, 400); // no code
    assert.equal((await upload(tokens.t1, mp4(), { challengeCode: '0000' })).status, 400); // never issued
    const ch = await api('POST', '/api/evidence/challenges', { token: tokens.t1 });
    const first = await upload(tokens.t1, mp4(), { challengeCode: ch.body.code });
    assert.equal(first.status, 201);
    const reuse = await upload(tokens.t1, mp4(), { challengeCode: ch.body.code });
    assert.equal(reuse.status, 400); // a code works once
  });

  it('stores the file, hashes it on the server, and serves it back', async () => {
    const bytes = jpeg();
    const r = await upload(tokens.t1, bytes, { caption: 'Finished work' });
    assert.equal(r.status, 201);
    assert.equal(r.body.evidence.hash.length, 64);
    assert.ok(r.body.evidence.url.startsWith('http://api.test/uploads/'));
    const file = await fetch(base + new URL(r.body.evidence.url).pathname);
    assert.equal(file.status, 200);
    assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(Buffer.compare(Buffer.from(await file.arrayBuffer()), bytes), 0);
  });

  it('treats the same trainer re-sending an unused file as a retry, not a duplicate', async () => {
    const bytes = jpeg();
    const a = await upload(tokens.t1, bytes);
    const b = await upload(tokens.t1, bytes);
    assert.equal(a.status, 201);
    assert.equal(b.status, 200);
    assert.equal(a.body.evidence.id, b.body.evidence.id);
  });

  it('only trainers can upload', async () => {
    assert.equal((await upload(tokens.a1, jpeg())).status, 403);
  });
});

// ---------------------------------------------------------------------------
// issuing: the integrity rules
// ---------------------------------------------------------------------------

describe('issuing a credential', () => {
  it('refuses apprentices, missing video, incomplete rubric, other trainers\' apprentices and other trades', async () => {
    const video = await freshVideo(tokens.t1);
    const base = { apprenticeId: 'a3', skillId: 'el-01', evidenceIds: [video.id], criteriaMet: await allCriteria('el-01') };

    assert.equal((await api('POST', '/api/credentials', { token: tokens.a1, body: base })).status, 403);

    const photo = (await upload(tokens.t1, jpeg())).body.evidence;
    const noVideo = await api('POST', '/api/credentials', { token: tokens.t1, body: { ...base, evidenceIds: [photo.id] } });
    assert.equal(noVideo.status, 400);
    assert.match(noVideo.body.error, /live video/);

    const partial = await api('POST', '/api/credentials', { token: tokens.t1, body: { ...base, criteriaMet: (await allCriteria('el-01')).slice(0, 2) } });
    assert.equal(partial.status, 400);
    assert.match(partial.body.error, /rubric criterion/);

    assert.equal((await api('POST', '/api/credentials', { token: tokens.t1, body: { ...base, apprenticeId: 'a8' } })).status, 403);
    assert.equal((await api('POST', '/api/credentials', { token: tokens.t1, body: { ...base, skillId: 'ta-01' } })).status, 400);
    assert.equal((await api('POST', '/api/credentials', { token: tokens.t1, body: { ...base, evidenceIds: ['ev-does-not-exist'] } })).status, 400);
    state.spareVideo = video;
  });

  it('issues a signed credential and attaches the evidence', async () => {
    const photo = (await upload(tokens.t1, jpeg(), { caption: 'Cables sorted' })).body.evidence;
    const r = await issue(tokens.t1, { apprenticeId: 'a3', skillId: 'el-01', evidenceIds: [state.spareVideo.id, photo.id], note: 'Got it first time.' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const c = r.body.credential;
    assert.match(c.id, /^SP-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal(c.status, 'pending_apprentice');
    assert.equal(c.needsCosign, false);
    assert.equal(c.evidence.length, 2);
    assert.match(c.signature, /^[0-9a-f]{64}$/);
    state.first = c;
    state.firstEvidence = [state.spareVideo.id, photo.id];
  });

  it('records the issue in the audit log and asks the apprentice to confirm', async () => {
    assert.equal(await auditCount('credential.issued', state.first.id), 1);
    const n = await api('GET', '/api/notifications', { token: tokens.a3 });
    assert.ok(n.body.notifications.some((x) => x.title === 'Please confirm your skill' && x.channel === 'in_app'));
    assert.ok(n.body.notifications.some((x) => x.title === 'Please confirm your skill' && x.channel === 'sms'));
  });

  it('will not reuse evidence on a second credential, or let the same skill be held twice', async () => {
    const reuse = await issue(tokens.t1, { apprenticeId: 'a1', skillId: 'el-04', evidenceIds: state.firstEvidence });
    assert.equal(reuse.status, 409);
    const again = await issue(tokens.t1, { apprenticeId: 'a3', skillId: 'el-01', evidenceIds: [(await freshVideo(tokens.t1)).id] });
    assert.equal(again.status, 409);
    assert.match(again.body.error, /already holds/);
  });

  it('blocks and logs an attempt to upload a file already used as evidence', async () => {
    const used = (await pool.query('SELECT url FROM evidence WHERE id = $1', [state.firstEvidence[1]])).rows[0].url;
    const bytes = Buffer.from(await (await fetch(base + used)).arrayBuffer());
    const before = await auditCount('evidence.duplicate_blocked');
    const r = await upload(tokens.t4, bytes); // a different trainer tries to reuse it
    assert.equal(r.status, 409);
    assert.equal(await auditCount('evidence.duplicate_blocked'), before + 1); // the log entry survives the failed request
  });

  it('only the named apprentice can confirm, and confirming makes it valid', async () => {
    assert.equal((await api('POST', `/api/credentials/${state.first.id}/confirm`, { token: tokens.a1 })).status, 404);
    const r = await api('POST', `/api/credentials/${state.first.id}/confirm`, { token: tokens.a3 });
    assert.equal(r.status, 200);
    assert.equal(r.body.credential.status, 'valid');
    assert.ok(r.body.credential.apprenticeConfirmedAt);
    const pub = await api('GET', `/api/verify/${state.first.id}`);
    assert.equal(pub.body.credential.status, 'valid');
    assert.equal(pub.body.credential.signatureValid, true);
    const trainerNotes = await api('GET', '/api/notifications', { token: tokens.t1 });
    assert.ok(trainerNotes.body.notifications.some((x) => x.title === 'Credential valid' && x.body.includes(state.first.id)));
  });
});

// ---------------------------------------------------------------------------
// co-signing
// ---------------------------------------------------------------------------

describe('co-signing an advanced skill', () => {
  it('needs an eligible co-signer', async () => {
    const video = await freshVideo(tokens.t1);
    const none = await issue(tokens.t1, { apprenticeId: 'a2', skillId: 'el-06', evidenceIds: [video.id] });
    assert.equal(none.status, 400);
    assert.match(none.body.error, /co-signer/);
    const self = await issue(tokens.t1, { apprenticeId: 'a2', skillId: 'el-06', evidenceIds: [video.id], cosignRequestedFrom: 't1' });
    assert.equal(self.status, 400);
    const wrongTrade = await issue(tokens.t1, { apprenticeId: 'a2', skillId: 'el-06', evidenceIds: [video.id], cosignRequestedFrom: 't2' });
    assert.equal(wrongTrade.status, 400);
    const ok = await issue(tokens.t1, { apprenticeId: 'a2', skillId: 'el-06', evidenceIds: [video.id], cosignRequestedFrom: 't4' });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.credential.needsCosign, true);
    assert.equal(ok.body.credential.cosignReason, 'advanced');
    state.advanced = ok.body.credential;
  });

  it('becomes pending co-sign after the apprentice confirms, and only the requested person can co-sign', async () => {
    const confirmed = await api('POST', `/api/credentials/${state.advanced.id}/confirm`, { token: tokens.a2 });
    assert.equal(confirmed.body.credential.status, 'pending_cosign');
    const note = await api('GET', '/api/notifications', { token: tokens.t4 });
    assert.ok(note.body.notifications.some((x) => x.title === 'Co-sign request'));
    assert.equal((await api('POST', `/api/credentials/${state.advanced.id}/cosign`, { token: tokens.t3 })).status, 403);
    assert.equal((await api('POST', `/api/credentials/${state.advanced.id}/cosign`, { token: tokens.t1 })).status, 403); // issuer cannot co-sign their own
    const signed = await api('POST', `/api/credentials/${state.advanced.id}/cosign`, { token: tokens.t4 });
    assert.equal(signed.status, 200);
    assert.equal(signed.body.credential.status, 'valid');
    assert.equal(signed.body.credential.cosignerId, 't4');
  });
});

// ---------------------------------------------------------------------------
// daily limit
// ---------------------------------------------------------------------------

describe('daily issuing limit', () => {
  it('holds a credential for administrator review once the limit is reached', async () => {
    const set = await api('PATCH', '/api/admin/settings', { token: tokens.admin, body: { dailyLimit: 2 } });
    assert.equal(set.body.settings.dailyLimit, 2);
    try {
      const video = await freshVideo(tokens.t1);
      const r = await issue(tokens.t1, { apprenticeId: 'a1', skillId: 'el-04', evidenceIds: [video.id] });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.credential.status, 'held_review');
      assert.equal(r.body.credential.heldForReview, true);
      assert.equal(await auditCount('credential.held', r.body.credential.id), 1);
      state.held = r.body.credential;

      const review = await api('GET', '/api/admin/review', { token: tokens.admin });
      assert.ok(review.body.held.some((c) => c.id === state.held.id));
      assert.ok(review.body.held.some((c) => c.id === 'SP-3PZN-1VKR')); // the seeded one
    } finally {
      await api('PATCH', '/api/admin/settings', { token: tokens.admin, body: { dailyLimit: 5 } });
    }
  });

  it('an administrator can release a held credential, which goes back into the normal flow', async () => {
    const r = await api('POST', `/api/admin/credentials/${state.held.id}/release`, { token: tokens.admin, body: { approve: true } });
    assert.equal(r.status, 200);
    const mine = await api('GET', '/api/credentials', { token: tokens.a1 });
    assert.equal(mine.body.credentials.find((c) => c.id === state.held.id).status, 'pending_apprentice');
    assert.equal((await api('POST', `/api/admin/credentials/${state.held.id}/release`, { token: tokens.admin, body: { approve: true } })).status, 409);
  });

  it('simultaneous issues cannot all slip under the limit', async () => {
    // Babatunde has issued 3 today and the limit is 5, so exactly two of these four requests may go through.
    const jobs = [['a2', 'el-02'], ['a2', 'el-03'], ['a3', 'el-03'], ['a3', 'el-05']];
    const videos = [];
    for (let i = 0; i < jobs.length; i++) videos.push(await freshVideo(tokens.t1));
    const results = await Promise.all(jobs.map(([apprenticeId, skillId], i) => issue(tokens.t1, { apprenticeId, skillId, evidenceIds: [videos[i].id] })));
    assert.deepEqual(results.map((r) => r.status), [201, 201, 201, 201], JSON.stringify(results.map((r) => r.body)));
    const counts = {};
    results.forEach((r) => { counts[r.body.credential.status] = (counts[r.body.credential.status] ?? 0) + 1; });
    assert.deepEqual(counts, { pending_apprentice: 2, held_review: 2 });
  });
});

// ---------------------------------------------------------------------------
// probation
// ---------------------------------------------------------------------------

describe('a new trainer on probation', () => {
  it('registers, is approved by an administrator, and then needs a co-signer on every credential', async () => {
    const reg = await api('POST', '/api/auth/register', { body: {
      role: 'trainer', name: 'Segun Ojo', email: 'segun.ojo@example.com', phone: '08055550000', password: 'a-good-password',
      dob: '1985-03-02', trade: 'electrical', consent: true, membershipNo: 'ECAN/LA/9999', workshop: 'Ojo Wiring',
      location: { name: 'Yaba', lat: 6.5095, lng: 3.3711 },
    } });
    assert.equal(reg.status, 201, JSON.stringify(reg.body));
    const trainerId = reg.body.user.id;
    tokens.newTrainer = reg.body.token;

    // not approved yet: cannot even ask for a challenge code
    assert.equal((await api('POST', '/api/evidence/challenges', { token: tokens.newTrainer })).status, 403);
    // cannot be approved before the association confirms membership
    assert.equal((await api('POST', `/api/admin/users/${trainerId}/approve`, { token: tokens.admin })).status, 409);
    assert.equal((await api('POST', `/api/admin/trainers/${trainerId}/verify-membership`, { token: tokens.admin })).status, 200);
    assert.equal((await api('POST', `/api/admin/users/${trainerId}/approve`, { token: tokens.admin })).status, 200);

    // an apprentice joins them
    const app = await api('POST', '/api/auth/register', { body: {
      role: 'apprentice', name: 'Bola Ade', email: 'bola.ade@example.com', phone: '08066660000', password: 'a-good-password',
      dob: '2001-07-09', trade: 'electrical', consent: true, trainerId, location: { name: 'Yaba', lat: 6.5095, lng: 3.3711 },
    } });
    assert.equal(app.status, 201, JSON.stringify(app.body));

    const video = await freshVideo(tokens.newTrainer);
    const noCosigner = await issue(tokens.newTrainer, { apprenticeId: app.body.user.id, skillId: 'el-01', evidenceIds: [video.id] });
    assert.equal(noCosigner.status, 400);
    const withCosigner = await issue(tokens.newTrainer, { apprenticeId: app.body.user.id, skillId: 'el-01', evidenceIds: [video.id], cosignRequestedFrom: 't1' });
    assert.equal(withCosigner.status, 201, JSON.stringify(withCosigner.body));
    assert.equal(withCosigner.body.credential.cosignReason, 'probation');
  });
});

// ---------------------------------------------------------------------------
// flags and disputes
// ---------------------------------------------------------------------------

describe('flags and disputes', () => {
  it('an employer can flag a valid credential, but a trainer cannot flag their own', async () => {
    assert.equal((await api('POST', `/api/credentials/${state.first.id}/flag`, { token: tokens.t1, body: { reason: 'Testing my own' } })).status, 403);
    assert.equal((await api('POST', `/api/credentials/${state.first.id}/flag`, { token: tokens.e1, body: { reason: 'no' } })).status, 400); // reason too short
    const r = await api('POST', `/api/credentials/${state.first.id}/flag`, { token: tokens.e1, body: { reason: 'Apprentice could not repeat this on site.' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.credential.status, 'flagged');
    assert.equal((await api('POST', `/api/credentials/${state.first.id}/flag`, { token: tokens.e1, body: { reason: 'Second flag attempt.' } })).status, 409); // only valid ones
  });

  it('dismissing the flag restores the credential; upholding it revokes it', async () => {
    const open = (await api('GET', '/api/admin/review', { token: tokens.admin })).body.flags.find((f) => f.credentialId === state.first.id);
    assert.ok(open);
    assert.equal((await api('POST', `/api/admin/flags/${open.id}/resolve`, { token: tokens.admin, body: { outcome: 'dismiss' } })).status, 200);
    assert.equal((await api('GET', `/api/verify/${state.first.id}`)).body.credential.status, 'valid');
    assert.equal((await api('POST', `/api/admin/flags/${open.id}/resolve`, { token: tokens.admin, body: { outcome: 'dismiss' } })).status, 409);

    await api('POST', `/api/credentials/${state.first.id}/flag`, { token: tokens.e1, body: { reason: 'Seen again, still not competent.' } });
    const second = (await api('GET', '/api/admin/review', { token: tokens.admin })).body.flags.find((f) => f.credentialId === state.first.id);
    assert.equal((await api('POST', `/api/admin/flags/${second.id}/resolve`, { token: tokens.admin, body: { outcome: 'revoke' } })).status, 200);
    const pub = (await api('GET', `/api/verify/${state.first.id}`)).body.credential;
    assert.equal(pub.status, 'revoked');
    assert.match(pub.revokeReason, /Flag upheld/);
  });

  it('a revoked skill can be assessed and issued again', async () => {
    const video = await freshVideo(tokens.t1);
    const r = await issue(tokens.t1, { apprenticeId: 'a3', skillId: 'el-01', evidenceIds: [video.id] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  });

  it('an apprentice can dispute a credential they did not earn', async () => {
    assert.equal((await api('POST', '/api/credentials/SP-5ZTQ-2WEN/dispute', { token: tokens.a2, body: { reason: 'This is not mine at all.' } })).status, 404); // not theirs
    const r = await api('POST', '/api/credentials/SP-5ZTQ-2WEN/dispute', { token: tokens.a1, body: { reason: 'I never did this test.' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.credential.status, 'flagged');
    assert.equal((await api('POST', '/api/credentials/SP-5ZTQ-2WEN/confirm', { token: tokens.a1 })).status, 409); // cannot confirm what you disputed
    const adminNotes = await api('GET', '/api/notifications', { token: tokens.admin });
    assert.ok(adminNotes.body.notifications.some((n) => n.title === 'Apprentice disputed a credential'));
  });

  it('the issuing trainer can revoke their own credential, but not someone else\'s', async () => {
    assert.equal((await api('POST', '/api/credentials/SP-1RKD-6PLW/revoke', { token: tokens.t1, body: { reason: 'Not mine to revoke.' } })).status, 404);
    const r = await api('POST', '/api/credentials/SP-5YJU-7CVM/revoke', { token: tokens.t1, body: { reason: 'Recorded against the wrong apprentice.' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.credential.status, 'revoked');
  });
});

// ---------------------------------------------------------------------------
// risk, misconduct, audits, reports
// ---------------------------------------------------------------------------

describe('risk and misconduct', () => {
  it('reports the risk signals the frontend computes for a trainer', async () => {
    const r = await api('GET', '/api/trainer/standing', { token: tokens.t3 });
    assert.equal(r.body.risk.level, 'high');
    assert.deepEqual(r.body.risk.signals.map((s) => s.id).sort(), ['cluster', 'fast', 'pass_all', 'poor_ratings', 'reports']);
    assert.equal(r.body.trust.score, 55);
  });

  it('records an honest "not yet competent" assessment, and refuses one where every criterion was met', async () => {
    const rubric = await allCriteria('el-03');
    const not = await api('POST', '/api/attempts', { token: tokens.t1, body: { apprenticeId: 'a3', skillId: 'el-03', criteriaMet: rubric.slice(0, 2) } });
    assert.equal(not.status, 201);
    const all = await api('POST', '/api/attempts', { token: tokens.t1, body: { apprenticeId: 'a3', skillId: 'el-03', criteriaMet: rubric } });
    assert.equal(all.status, 400);
  });

  it('misconduct freezes issuing and puts every credential the trainer signed under review', async () => {
    const r = await api('POST', '/api/admin/trainers/t3/misconduct', { token: tokens.admin, body: { reason: 'Charged apprentices for records' } });
    assert.equal(r.status, 200);
    assert.ok(r.body.credentialsUnderReview >= 4);
    assert.equal((await api('GET', '/api/verify/SP-8KMA-3TRE')).body.credential.status, 'under_review');
    assert.equal((await api('POST', '/api/evidence/challenges', { token: tokens.t3 })).status, 403);
    assert.ok((await api('GET', '/api/verify/SP-8KMA-3TRE')).body.credential.trainer.trustScore <= 10);
  });

  it('a failed audit re-check revokes the credential', async () => {
    const run = await api('POST', '/api/admin/audit-samples/run', { token: tokens.admin });
    assert.equal(run.status, 200);
    assert.ok(run.body.selected >= 1);
    const sample = (await api('GET', '/api/admin/review', { token: tokens.admin })).body.samples.find((s) => s.credential?.status === 'valid');
    assert.ok(sample, 'expected a pending sample on a valid credential');
    assert.equal((await api('POST', `/api/admin/audit-samples/${sample.id}/complete`, { token: tokens.admin, body: { outcome: 'disagree' } })).status, 200);
    assert.equal((await api('GET', `/api/verify/${sample.credentialId}`)).body.credential.status, 'revoked');
    assert.equal((await api('POST', `/api/admin/audit-samples/${sample.id}/complete`, { token: tokens.admin, body: { outcome: 'agree' } })).status, 409);
  });
});

describe('confidential reports and the audit log', () => {
  it('files an apprentice report without recording who filed it, and only admins can read it', async () => {
    const a6 = await login('yusuf@skillpass.ng');
    const r = await api('POST', '/api/reports', { token: a6, body: { category: 'payment', details: 'He asked me for money before recording my skill.' } });
    assert.equal(r.status, 201);
    const entry = (await pool.query(`SELECT actor_id, actor_name FROM audit_log WHERE action = 'report.received' ORDER BY at DESC LIMIT 1`)).rows[0];
    assert.equal(entry.actor_name, 'Confidential');
    assert.equal(entry.actor_id, null);
    assert.equal((await api('GET', '/api/reports', { token: tokens.t3 })).status, 403);
    const all = await api('GET', '/api/reports', { token: tokens.admin });
    assert.ok(all.body.reports.length >= 2);
    assert.ok(all.body.reports[0].apprenticeName);
    const mine = await api('GET', '/api/reports', { token: a6 });
    assert.ok(mine.body.reports.every((x) => x.trainerName === undefined)); // apprentices do not get the trainer back
  });

  it('the audit log is append-only, even for the database owner', async () => {
    await assert.rejects(pool.query(`UPDATE audit_log SET detail = 'edited' WHERE id = 'al1'`), /append-only/);
    await assert.rejects(pool.query(`DELETE FROM audit_log WHERE id = 'al1'`), /append-only/);
    await assert.rejects(pool.query('TRUNCATE audit_log'), /append-only/);
  });

  it('administrators can page through the log', async () => {
    const r = await api('GET', '/api/admin/audit-log?limit=5', { token: tokens.admin });
    assert.equal(r.body.entries.length, 5);
    assert.ok(r.body.total > 30);
    assert.ok(new Date(r.body.entries[0].at) >= new Date(r.body.entries[4].at));
  });
});
