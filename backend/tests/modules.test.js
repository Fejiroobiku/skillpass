/**
 * Tests for the endpoints the frontend store depends on: bootstrap, passport, feedback, jobs and referrals,
 * skills and trades, the usability survey, and the admin extras. Same real-database setup as api.test.js.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { api, jpeg, login, pool, start, stop, upload } from './helpers.js';

before(start);
after(stop);

const t = {};
const boot = async (token) => {
  const r = await api('GET', '/api/bootstrap', { token });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
};

describe('bootstrap: what each role is allowed to see', () => {
  it('needs a sign-in', async () => {
    assert.equal((await api('GET', '/api/bootstrap')).status, 401);
  });

  it('gives administrators everything, including trust details and risk for every trainer', async () => {
    t.admin = await login('admin@skillpass.ng');
    const b = await boot(t.admin);
    assert.equal(b.credentials.length, 20);
    assert.equal(b.trainers.length, 6);
    assert.equal(b.apprentices.length, 8);
    assert.ok(b.trainers.find((x) => x.id === 't1').phone.startsWith('0803'));
    assert.equal(b.trust.t1.score, 88);
    assert.ok(b.trust.t1.auditAgreement !== null);
    assert.equal(b.risk.t3.level, 'high');
    assert.ok(b.auditLog.some((e) => e.action === 'credential.flagged' && e.actor === 'Folake Hassan')); // unredacted for admins
    assert.ok(b.reports.length >= 1 && b.samples.length >= 1 && b.verifications.length >= 1);
  });

  it('shows a trainer their own people and credentials, and hides other people\'s contact details', async () => {
    t.t1 = await login('babatunde@skillpass.ng');
    const b = await boot(t.t1);
    const self = b.trainers.find((x) => x.id === 't1');
    assert.ok(self.phone && self.membershipNo);
    const colleague = b.trainers.find((x) => x.id === 't4');
    assert.ok(colleague, 'eligible co-signers are listed');
    assert.equal(colleague.phone, '');
    assert.equal(colleague.membershipNo, '');
    assert.ok(b.apprentices.find((x) => x.id === 'a1').phone.startsWith('0810')); // own apprentice: contact allowed
    assert.equal(b.apprentices.find((x) => x.id === 'a8').phone, ''); // another trainer's apprentice (a co-sign request): name only
    assert.ok(b.credentials.every((c) => c.trainerId === 't1' || c.cosignRequestedFrom === 't1' || c.cosignerId === 't1'));
    assert.ok(!b.trainers.some((x) => x.id === 't3'), 'a different trade is not listed');
    assert.equal(b.reports.length, 0);
    assert.deepEqual(Object.keys(b.risk), ['t1']);
  });

  it('redacts the audit timeline and other trainers\' trust details for non-admins', async () => {
    const b = await boot(t.t1);
    const flagged = b.auditLog.find((e) => e.action === 'credential.flagged');
    assert.equal(flagged.actor, 'A verified user');
    assert.ok(!JSON.stringify(b.auditLog).includes('Folake'));
    assert.equal(b.trust.t4.auditAgreement, null); // only the score is shared about other trainers
    assert.equal(typeof b.trust.t4.score, 'number');
    assert.ok(b.trust.t1.auditCount >= 0 && 'auditAgreement' in b.trust.t1);
  });

  it('shows an apprentice only their own record, and their trainer\'s score without details', async () => {
    t.a1 = await login('tobi@skillpass.ng');
    const b = await boot(t.a1);
    assert.ok(b.credentials.length > 0 && b.credentials.every((c) => c.apprenticeId === 'a1'));
    assert.deepEqual(b.apprentices.map((x) => x.id), ['a1']);
    assert.equal(b.trainers.find((x) => x.id === 't1').phone, '');
    assert.equal(b.trust.t1.auditAgreement, null);
    assert.deepEqual(b.risk, {});
    assert.equal(b.susResponses.length, 0);
  });

  it('shows an employer verified apprentices in their trade, without contact details, and only their own jobs', async () => {
    t.e1 = await login('folake@skillpass.ng');
    const b = await boot(t.e1);
    assert.ok(b.apprentices.length > 0 && b.apprentices.every((a) => a.phone === '' && a.trade === 'electrical'));
    assert.ok(b.jobs.length === 2 && b.jobs.every((j) => j.employerId === 'e1'));
    assert.ok(b.credentials.every((c) => c.status === 'valid' || c.cosignRequestedFrom === 'e1' || c.cosignerId === 'e1'));
    assert.ok(b.employers.every((e) => e.phone === '' || e.id === 'e1'));
  });

  it('lists proposed skills only for trainers and administrators', async () => {
    assert.ok((await boot(t.t1)).skills.some((s) => s.status === 'proposed'));
    assert.ok(!(await boot(t.a1)).skills.some((s) => s.status === 'proposed'));
  });
});

describe('public passport', () => {
  it('shows an apprentice\'s skills, trainer and employer ratings without contact details', async () => {
    const r = await api('GET', '/api/passport/a1');
    assert.equal(r.status, 200);
    const p = r.body.passport;
    assert.equal(p.apprentice.name, 'Tobi Ogunleye');
    assert.equal(p.trainer.name, 'Babatunde Adeyemi');
    assert.ok(p.skills.length >= 7);
    assert.ok(p.credentials.some((c) => c.id === 'SP-2BNC-8QPE' && c.status === 'valid'));
    assert.ok(!p.credentials.some((c) => c.status === 'pending_apprentice'));
    assert.equal(p.ratings[0].company, 'Lekki Homes Facility Management');
    assert.equal(typeof p.trainers.t1.trustScore, 'number');
    const text = JSON.stringify(r.body);
    for (const secret of ['0810', 'tobi@skillpass.ng', 'password', '"lat"']) assert.ok(!text.includes(secret), `leaks ${secret}`);
  });

  it('404s for unknown ids and for people who are not apprentices', async () => {
    assert.equal((await api('GET', '/api/passport/nobody')).status, 404);
    assert.equal((await api('GET', '/api/passport/t1')).status, 404);
  });
});

describe('employer ratings', () => {
  it('are tied to a real accepted job, given once, and only for the apprentice\'s own credentials', async () => {
    const rate = (body, token = t.e1) => api('POST', '/api/feedback', { token, body });
    assert.equal((await rate({ referralId: 'r1', rating: 4 })).status, 400); // r1 was only sent, never accepted
    assert.equal((await rate({ referralId: 'r2', rating: 4 }, await login('adaeze@skillpass.ng'))).status, 400); // someone else's job
    assert.equal((await rate({ referralId: 'r2', rating: 4 }, t.a1)).status, 403); // apprentices cannot rate
    assert.equal((await rate({ referralId: 'r2', rating: 9 })).status, 400);
    assert.equal((await rate({ referralId: 'r2', rating: 4, credentialIds: ['SP-4NAT-2XHE'] })).status, 400); // another apprentice's credential

    const before = (await boot(t.admin)).trust.t1.ratingCount;
    const ok = await rate({ referralId: 'r2', rating: 5, comment: 'Solar install done well.', credentialIds: ['SP-7MXV-3JYK'] });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal((await rate({ referralId: 'r2', rating: 5 })).status, 409);
    assert.equal((await boot(t.admin)).trust.t1.ratingCount, before + 1); // it feeds the trainer's trust score
    const notes = await api('GET', '/api/notifications', { token: t.a1 });
    assert.ok(notes.body.notifications.some((n) => n.title === 'New rating'));
  });

  it('are refused for an employer an administrator has not verified', async () => {
    const reg = await api('POST', '/api/auth/register', { body: {
      role: 'employer', name: 'Kemi Ola', email: 'kemi@example.com', phone: '08012345678', password: 'a-good-password', dob: '1990-02-02',
      trade: 'electrical', company: 'Ola Wiring', consent: true, location: { name: 'Yaba', lat: 6.5, lng: 3.37 },
    } });
    assert.equal(reg.status, 201);
    t.newEmployer = reg.body.token;
    assert.equal((await api('POST', '/api/feedback', { token: t.newEmployer, body: { referralId: 'r2', rating: 3 } })).status, 403);
  });
});

describe('jobs and referrals', () => {
  const job = (over = {}) => ({ title: 'Wire a clinic in Ajah', skillIds: ['el-01', 'el-02'], location: { name: 'Ajah', lat: 6.4698, lng: 3.5852 }, pay: '₦150,000 fixed', ...over });

  it('lets an employer post a job in their own trade and tells them how many apprentices match', async () => {
    assert.equal((await api('POST', '/api/jobs', { token: t.e1, body: job({ skillIds: ['me-01'] }) })).status, 400); // mechanic skill
    assert.equal((await api('POST', '/api/jobs', { token: t.e1, body: job({ skillIds: [] }) })).status, 400);
    assert.equal((await api('POST', '/api/jobs', { token: t.t1, body: job() })).status, 403);
    const r = await api('POST', '/api/jobs', { token: t.e1, body: job() });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    t.job = r.body.job;
    assert.equal(r.body.job.trade, 'electrical');
    const n = (await api('GET', '/api/notifications', { token: t.e1 })).body.notifications.find((x) => x.title.endsWith('for your job') && x.body.startsWith('Wire a clinic'));
    assert.match(n.title, /^\d+ matches? for your job/);
    assert.ok((await boot(t.e1)).jobs.some((j) => j.id === t.job.id));
  });

  it('only sends referrals to apprentices with verified skills for the job, once, from a verified employer', async () => {
    const send = (apprenticeId, token = t.e1) => api('POST', `/api/jobs/${t.job.id}/referrals`, { token, body: { apprenticeId } });
    assert.equal((await send('a8')).status, 400); // a8 has no valid skills
    assert.equal((await send('a4')).status, 400); // a different trade
    assert.equal((await api('POST', `/api/jobs/${t.job.id}/referrals`, { token: t.newEmployer, body: { apprenticeId: 'a1' } })).status, 403);
    const ok = await send('a1');
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    t.referral = ok.body.referral;
    assert.equal((await send('a1')).status, 409);
    const notes = await api('GET', '/api/notifications', { token: t.a1 });
    assert.ok(notes.body.notifications.some((n) => n.title === 'New job referral' && n.channel === 'sms'));
  });

  it('lets the apprentice accept once, then the employer mark them contacted', async () => {
    const set = (token, status) => api('PATCH', `/api/referrals/${t.referral.id}`, { token, body: { status } });
    assert.equal((await set(t.e1, 'contacted')).status, 409); // not accepted yet
    assert.equal((await set(await login('emeka@skillpass.ng'), 'accepted')).status, 404); // not theirs
    assert.equal((await set(t.a1, 'accepted')).status, 200);
    assert.equal((await set(t.a1, 'declined')).status, 409);
    assert.equal((await set(t.a1, 'contacted')).status, 409);
    assert.ok((await api('GET', '/api/notifications', { token: t.e1 })).body.notifications.some((n) => n.title === 'Apprentice interested'));
    assert.equal((await set(t.e1, 'contacted')).status, 200);
    const mine = (await boot(t.a1)).referrals.find((r) => r.id === t.referral.id);
    assert.equal(mine.status, 'contacted');
  });
});

describe('skills and trades', () => {
  it('lets an approved trainer propose a skill, and an administrator approve or decline it', async () => {
    assert.equal((await api('POST', '/api/skills/propose', { token: t.a1, body: { name: 'Install a smart meter', level: 'Intermediate' } })).status, 403);
    assert.equal((await api('POST', '/api/skills/propose', { token: await login('funmi@skillpass.ng'), body: { name: 'Anything at all', level: 'Foundation' } })).status, 403); // not approved yet
    assert.equal((await api('POST', '/api/skills/propose', { token: t.t1, body: { name: 'x', level: 'Intermediate' } })).status, 400);
    const r = await api('POST', '/api/skills/propose', { token: t.t1, body: { name: 'Install a smart meter', level: 'Advanced' } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.skill.status, 'proposed');
    assert.equal(r.body.skill.requiresCosign, true); // advanced skills always need a co-signer
    t.skill = r.body.skill;

    assert.equal((await api('POST', `/api/admin/skills/${t.skill.id}/review`, { token: t.t1, body: { approve: true } })).status, 403);
    assert.equal((await api('POST', `/api/admin/skills/${t.skill.id}/review`, { token: t.admin, body: { approve: true } })).status, 200);
    assert.equal((await api('POST', `/api/admin/skills/${t.skill.id}/review`, { token: t.admin, body: { approve: true } })).status, 404); // already reviewed
    assert.ok((await api('GET', '/api/skills?trade=electrical')).body.skills.some((s) => s.id === t.skill.id));
    assert.ok((await api('GET', '/api/notifications', { token: t.t1 })).body.notifications.some((n) => n.title === 'Skill added to checklist'));
  });

  it('lets an administrator add skills and trades, once each', async () => {
    const add = await api('POST', '/api/admin/skills', { token: t.admin, body: { trade: 'tailoring', level: 'Foundation', name: 'Press a finished garment' } });
    assert.equal(add.status, 201);
    assert.equal(add.body.skill.status, 'active');
    assert.equal((await api('POST', '/api/admin/skills', { token: t.admin, body: { trade: 'nope', level: 'Foundation', name: 'Whatever it is' } })).status, 400);
    const trade = await api('POST', '/api/admin/trades', { token: t.admin, body: { name: 'Plumbing & Pipefitting' } });
    assert.equal(trade.status, 201);
    assert.equal(trade.body.trade.id, 'plumbing-pipefitting');
    assert.equal((await api('POST', '/api/admin/trades', { token: t.admin, body: { name: 'Plumbing & Pipefitting' } })).status, 409);
    assert.equal((await api('POST', '/api/admin/trades', { token: t.t1, body: { name: 'Welding' } })).status, 403);
  });
});

describe('usability survey', () => {
  it('scores the System Usability Scale on the server, once per person', async () => {
    assert.equal((await api('POST', '/api/sus', { token: t.a1, body: { answers: [3, 3, 3] } })).status, 400);
    assert.equal((await api('POST', '/api/sus', { token: t.a1, body: { answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 9] } })).status, 400);
    const best = await api('POST', '/api/sus', { token: t.a1, body: { answers: [5, 1, 5, 1, 5, 1, 5, 1, 5, 1] } });
    assert.equal(best.status, 201);
    assert.equal(best.body.score, 100);
    assert.equal((await api('POST', '/api/sus', { token: t.a1, body: { answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] } })).status, 409);
    const neutral = await api('POST', '/api/sus', { token: t.e1, body: { answers: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] } });
    assert.equal(neutral.body.score, 50);
    assert.ok((await boot(t.admin)).susResponses.some((s) => s.userId === 'a1' && s.score === 100));
    assert.equal((await boot(t.a1)).susResponses.length, 1); // people only see their own
  });
});

describe('admin extras', () => {
  it('assigns an assessor to an audit sample', async () => {
    assert.equal((await api('POST', '/api/admin/audit-samples/as4/assign', { token: t.admin, body: { assessorId: 'as-grace' } })).status, 200);
    assert.equal((await api('POST', '/api/admin/audit-samples/as4/assign', { token: t.admin, body: { assessorId: 'nobody' } })).status, 404);
    assert.equal((await api('POST', '/api/admin/audit-samples/as1/assign', { token: t.admin, body: { assessorId: 'as-grace' } })).status, 404); // already complete
    assert.equal((await boot(t.admin)).samples.find((s) => s.id === 'as4').assessorId, 'as-grace');
  });

  it('queues every valid credential of a risky trainer for re-checking, without duplicating pending ones', async () => {
    const first = await api('POST', '/api/admin/trainers/t3/audit', { token: t.admin });
    assert.equal(first.status, 200);
    assert.ok(first.body.selected >= 1);
    assert.equal((await api('POST', '/api/admin/trainers/t3/audit', { token: t.admin })).body.selected, 0);
    assert.equal((await api('POST', '/api/admin/trainers/nobody/audit', { token: t.admin })).status, 404);
  });
});

describe('demo evidence', () => {
  it('is refused unless the server has demo mode switched on', async () => {
    const r = await upload(t.t1, jpeg(), { source: 'demo' });
    assert.equal(r.status, 403);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM evidence WHERE source = 'demo' AND id NOT LIKE 'ev%'`)).rows[0].n, 0);
  });
});
