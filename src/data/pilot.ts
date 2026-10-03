import type { AppNotification, SusResponse, VerificationEvent } from '../types/skillpass';

export const dataCollection = [
{ label: 'Requirements interviews', value: 18, detail: '5 trainers · 9 apprentices · 4 employers' },
{ label: 'Baseline questionnaires', value: 31, detail: 'Collected in weeks 2–3' },
{ label: 'Spot-check assessments', value: 5, detail: 'Independent re-checks this pilot' }];


export const seedSus: SusResponse[] = [
{ id: 'sus1', userId: 't2', role: 'trainer', score: 72.5, at: '2026-09-25T10:00:00' },
{ id: 'sus2', userId: 't3', role: 'trainer', score: 65, at: '2026-09-25T11:00:00' },
{ id: 'sus3', userId: 'a4', role: 'apprentice', score: 80, at: '2026-09-26T09:00:00' },
{ id: 'sus4', userId: 'a6', role: 'apprentice', score: 77.5, at: '2026-09-26T12:00:00' },
{ id: 'sus5', userId: 'a7', role: 'apprentice', score: 62.5, at: '2026-09-27T15:00:00' },
{ id: 'sus6', userId: 'e2', role: 'employer', score: 85, at: '2026-09-27T16:00:00' }];


export const seedVerifications: VerificationEvent[] = [
{ id: 'v1', credentialId: 'SP-2BNC-8QPE', seconds: 34, trustRating: 5, at: '2026-09-25T17:40:00' },
{ id: 'v2', credentialId: 'SP-3WLA-9KDS', seconds: 52, trustRating: 3, at: '2026-09-27T16:55:00' },
{ id: 'v3', credentialId: 'SP-9CEB-3MUF', seconds: 41, trustRating: 4, at: '2026-09-23T11:30:00' },
{ id: 'v4', credentialId: 'SP-6HWK-5GAY', seconds: 28, trustRating: 4, at: '2026-09-24T09:10:00' },
{ id: 'v5', credentialId: 'SP-7MXV-3JYK', seconds: 47, trustRating: 5, at: '2026-09-29T13:20:00' }];


export const seedNotifications: AppNotification[] = [
{ id: 'n1', userId: 't1', channel: 'in_app', title: 'Co-sign request', body: 'Chinedu Okafor asked you to co-sign “Install and commission a three-phase supply” for Segun Alabi.', at: '2026-09-29T13:01:00', read: false, link: '/trainer' },
{ id: 'n2', userId: 't1', channel: 'in_app', title: 'Credential flagged', body: 'Folake Hassan flagged SP-3WLA-9KDS (Emeka Nwosu). An administrator will review it.', at: '2026-09-27T17:06:00', read: false, link: '/verify/SP-3WLA-9KDS' },
{ id: 'n3', userId: 't1', channel: 'in_app', title: 'Audit sample selected', body: 'SP-6FHP-1ZRT was picked for a random spot-check.', at: '2026-09-29T08:00:00', read: true },
{ id: 'n4', userId: 'a1', channel: 'sms', title: 'New job referral', body: 'SkillPass: Lekki Homes needs an electrician in Lekki Phase 1 (₦180,000). Reply 1 if interested.', at: '2026-09-28T09:05:00', read: false, link: '/apprentice/jobs' },
{ id: 'n5', userId: 'a1', channel: 'in_app', title: 'New job referral', body: 'Rewire two flats in a Lekki estate — 67% skill match.', at: '2026-09-28T09:05:00', read: false, link: '/apprentice/jobs' },
{ id: 'n6', userId: 'a1', channel: 'sms', title: 'Skill verified', body: 'SkillPass: Babatunde Adeyemi verified “Install a solar inverter with battery backup”. ID SP-7MXV-3JYK.', at: '2026-09-26T16:21:00', read: true, link: '/verify/SP-7MXV-3JYK' },
{ id: 'n7', userId: 'e1', channel: 'in_app', title: '3 matches for your job', body: 'Rewire two flats in a Lekki estate has 3 verified apprentices nearby.', at: '2026-09-28T09:01:00', read: false, link: '/employer/jobs' },
{ id: 'n8', userId: 'ad1', channel: 'in_app', title: 'Trainer awaiting approval', body: 'Kunle Bakare (Auto Mechanics, Surulere) registered as a trainer.', at: '2026-09-29T10:00:00', read: false, link: '/admin/users' },
{ id: 'n9', userId: 'ad1', channel: 'in_app', title: 'New flag', body: 'SP-3WLA-9KDS was flagged by an employer.', at: '2026-09-27T17:06:00', read: false, link: '/admin/review' }];


export const susStatements = [
'I think that I would like to use SkillPass frequently.',
'I found SkillPass unnecessarily complex.',
'I thought SkillPass was easy to use.',
'I think that I would need the support of a technical person to be able to use SkillPass.',
'I found the various functions in SkillPass were well integrated.',
'I thought there was too much inconsistency in SkillPass.',
'I would imagine that most people would learn to use SkillPass very quickly.',
'I found SkillPass very cumbersome to use.',
'I felt very confident using SkillPass.',
'I needed to learn a lot of things before I could get going with SkillPass.'];


export const outOfScope = ['Payments', 'NIN integration', 'Native mobile apps', 'Blockchain anchoring', 'Integration with the official NSQ database'];