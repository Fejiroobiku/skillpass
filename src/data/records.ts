import type { AuditEntry, AuditSample, Credential, Evidence, Feedback, Flag, Job, Referral } from '../types/skillpass';
import { evidencePhotos } from './evidence';
import { places, trainers } from './people';
import { skills } from './skills';
import { rubricFor } from './integrity';
import { signPayload } from '../utils/credentials';

type SeedEvidence = Pick<Evidence, 'id' | 'kind' | 'url' | 'caption'> & Partial<Evidence>;
type SeedCredential = Omit<Credential, 'criteriaMet' | 'needsCosign' | 'evidence'> & {evidence: SeedEvidence[];};

const ev = (id: string, url: string, caption: string): SeedEvidence => ({ id, kind: 'photo', url, caption });

const baseCredentials: SeedCredential[] = [
{ id: 'SP-5ZTQ-2WEN', apprenticeId: 'a1', trainerId: 't1', skillId: 'el-05', issuedAt: '2026-09-29T15:30:00', evidence: [{ id: 'ev16', kind: 'video', url: evidencePhotos.electrical, poster: evidencePhotos.electrical, caption: 'Insulation resistance test on estate circuit', challengeCode: '4827', durationSec: 22, source: 'demo' }], status: 'pending_apprentice', signature: 'e9a1c3f5b7d20046', note: 'Recorded readings on test sheet.' },
{ id: 'SP-8KMA-3TRE', apprenticeId: 'a6', trainerId: 't3', skillId: 'me-01', issuedAt: '2026-09-21T13:50:00', evidence: [ev('ev17', evidencePhotos.mechanic, 'Oil change, Honda Accord')], status: 'valid', signature: 'a2b4c6d8e0f13579', note: '' },
{ id: 'SP-4QPL-7NVB', apprenticeId: 'a6', trainerId: 't3', skillId: 'me-04', issuedAt: '2026-09-21T13:58:00', evidence: [ev('ev18', evidencePhotos.mechanic, 'Clutch replacement')], status: 'valid', signature: 'b3c5d7e9f1a24680', note: '' },
{ id: 'SP-9WXC-2HJK', apprenticeId: 'a7', trainerId: 't3', skillId: 'me-02', issuedAt: '2026-09-21T14:03:00', evidence: [ev('ev19', evidencePhotos.mechanic, 'Brake pads, Toyota Camry')], status: 'valid', signature: 'c4d6e8f0a2b35791', note: '' },
{ id: 'SP-6TYU-8BNM', apprenticeId: 'a7', trainerId: 't3', skillId: 'me-03', issuedAt: '2026-09-21T14:09:00', evidence: [ev('ev20', evidencePhotos.mechanic, 'OBD-II scan')], status: 'valid', signature: 'd5e7f9a1b3c46802', note: '' },
{ id: 'SP-4KQ7-L2MX', apprenticeId: 'a1', trainerId: 't1', skillId: 'el-01', issuedAt: '2026-09-03T10:12:00', evidence: [ev('ev1', evidencePhotos.electrical, 'Sorting 1.5mm² and 2.5mm² cables by colour code')], status: 'valid', signature: 'a91f3c07e2d84b16', note: 'Correctly identified all cable sizes on first attempt.' },
{ id: 'SP-9TRD-5HWA', apprenticeId: 'a1', trainerId: 't1', skillId: 'el-02', issuedAt: '2026-09-10T14:40:00', evidence: [ev('ev2', evidencePhotos.electrical, 'Switch and socket installed in client flat, Ajah')], status: 'valid', signature: 'c5e8d2a1b09f7743', note: 'Neat terminations, tested before handover.' },
{ id: 'SP-2BNC-8QPE', apprenticeId: 'a1', trainerId: 't1', skillId: 'el-03', issuedAt: '2026-09-22T11:05:00', evidence: [ev('ev3', evidencePhotos.electrical, 'Completed 12-way distribution board')], status: 'valid', signature: 'f0a6b3e9c1d25584', note: 'Wired board unaided; labelled every circuit.' },
{ id: 'SP-7MXV-3JYK', apprenticeId: 'a1', trainerId: 't1', skillId: 'el-07', issuedAt: '2026-09-26T16:20:00', evidence: [ev('ev4', evidencePhotos.solar, '3.5kVA inverter with two lithium batteries')], status: 'valid', cosignerId: 't4', signature: 'b7d1e4f0a3c96628', note: 'Commissioned system at Lekki residence.' },
{ id: 'SP-6FHP-1ZRT', apprenticeId: 'a2', trainerId: 't1', skillId: 'el-01', issuedAt: '2026-09-02T09:30:00', evidence: [ev('ev5', evidencePhotos.electrical, 'Cable identification exercise')], status: 'valid', signature: 'd3c9a0e7f1b46612', note: '' },
{ id: 'SP-3WLA-9KDS', apprenticeId: 'a2', trainerId: 't1', skillId: 'el-04', issuedAt: '2026-09-18T15:10:00', evidence: [ev('ev6', evidencePhotos.electrical, 'Surface conduit run, bedroom')], status: 'flagged', signature: 'e2b8f6c4a0d17739', note: '' },
{ id: 'SP-8QGE-4TNB', apprenticeId: 'a2', trainerId: 't1', skillId: 'el-05', issuedAt: '2026-09-30T09:15:00', evidence: [ev('ev7', evidencePhotos.electrical, 'Insulation resistance test readings')], status: 'valid', signature: 'a4f7c1d9e3b08825', note: '' },
{ id: 'SP-5YJU-7CVM', apprenticeId: 'a3', trainerId: 't1', skillId: 'el-02', issuedAt: '2026-09-30T11:45:00', evidence: [ev('ev8', evidencePhotos.electrical, 'Socket outlet install, Agungi workshop')], status: 'valid', signature: 'c8e0a5b2f6d31147', note: '' },
{ id: 'SP-1RKD-6PLW', apprenticeId: 'a8', trainerId: 't4', skillId: 'el-06', issuedAt: '2026-09-29T13:00:00', evidence: [ev('ev9', evidencePhotos.electrical, 'Three-phase changeover panel, Ikeja')], status: 'pending_cosign', cosignRequestedFrom: 't1', signature: 'f9b2d7e1c4a06653', note: 'Commissioned 3-phase supply for a small factory.' },
{ id: 'SP-4NAT-2XHE', apprenticeId: 'a4', trainerId: 't2', skillId: 'ta-01', issuedAt: '2026-09-05T10:00:00', evidence: [ev('ev10', evidencePhotos.tailoring, 'Measurement card for a client')], status: 'valid', signature: 'b1a9e6d3f0c27784', note: '' },
{ id: 'SP-9CEB-3MUF', apprenticeId: 'a4', trainerId: 't2', skillId: 'ta-04', issuedAt: '2026-09-19T12:30:00', evidence: [ev('ev11', evidencePhotos.tailoring, 'Finished buba and sokoto in Ankara')], status: 'valid', signature: 'e7c3f0a8b2d59916', note: '' },
{ id: 'SP-2DVS-8LQJ', apprenticeId: 'a5', trainerId: 't2', skillId: 'ta-02', issuedAt: '2026-09-12T11:20:00', evidence: [ev('ev12', evidencePhotos.tailoring, 'Threading industrial machine')], status: 'revoked', signature: 'd0f6b4a1e8c37725', note: '', revokeReason: 'Audit re-check found the apprentice could not thread the machine unaided.' },
{ id: 'SP-6HWK-5GAY', apprenticeId: 'a6', trainerId: 't3', skillId: 'me-02', issuedAt: '2026-09-08T09:50:00', evidence: [ev('ev13', evidencePhotos.mechanic, 'Brake pad replacement, Toyota Corolla')], status: 'valid', signature: 'a6d2c9f3b0e18847', note: '' },
{ id: 'SP-3PZN-1VKR', apprenticeId: 'a6', trainerId: 't3', skillId: 'me-03', issuedAt: '2026-09-21T14:15:00', evidence: [ev('ev14', evidencePhotos.mechanic, 'OBD-II scan and fault report')], status: 'held_review', signature: 'c2e7a0f5d9b36618', note: '' },
{ id: 'SP-7LBX-4SDC', apprenticeId: 'a7', trainerId: 't3', skillId: 'me-01', issuedAt: '2026-09-14T10:40:00', evidence: [ev('ev15', evidencePhotos.mechanic, 'Oil and filter change')], status: 'valid', signature: 'f4b8d1e6a2c07739', note: '' }];


export const seedCredentials: Credential[] = baseCredentials.map((c) => {
  const skill = skills.find((s) => s.id === c.skillId);
  const trainer = trainers.find((t) => t.id === c.trainerId);
  return {
    ...c,
    criteriaMet: rubricFor(c.skillId),
    needsCosign: !!skill?.requiresCosign,
    cosignReason: skill?.requiresCosign ? 'advanced' : undefined,
    apprenticeConfirmedAt: c.status === 'pending_apprentice' ? undefined : c.issuedAt,
    heldForReview: c.status === 'held_review',
    evidence: c.evidence.map((e) => ({
      capturedAt: c.issuedAt,
      locationLabel: trainer?.location.name ?? 'Lagos',
      lat: trainer?.location.lat,
      lng: trainer?.location.lng,
      hash: signPayload(`${e.id}|${e.caption}`) + signPayload(e.id),
      source: 'camera' as const,
      ...e
    }))
  };
});

export const seedFlags: Flag[] = [
{ id: 'fl1', credentialId: 'SP-3WLA-9KDS', raisedBy: 'e1', reason: 'Conduit run on our site was uneven and had to be redone by another electrician.', raisedAt: '2026-09-27T17:05:00', status: 'open' }];


export const seedAuditSamples: AuditSample[] = [
{ id: 'as1', credentialId: 'SP-9TRD-5HWA', assessor: 'ad1', selectedAt: '2026-09-24T08:00:00', result: 'agree' },
{ id: 'as2', credentialId: 'SP-9CEB-3MUF', assessor: 'ad1', selectedAt: '2026-09-24T08:00:00', result: 'agree' },
{ id: 'as3', credentialId: 'SP-2DVS-8LQJ', assessor: 'ad1', selectedAt: '2026-09-24T08:00:00', result: 'disagree' },
{ id: 'as4', credentialId: 'SP-6FHP-1ZRT', assessor: 'ad1', selectedAt: '2026-09-29T08:00:00', result: 'pending' },
{ id: 'as5', credentialId: 'SP-6HWK-5GAY', assessor: 'ad1', assessorId: 'as-musa', reason: 'risk', selectedAt: '2026-09-29T08:00:00', result: 'pending' }];


export const seedFeedback: Feedback[] = [
{ id: 'fb1', apprenticeId: 'a1', employerId: 'e1', credentialIds: ['SP-2BNC-8QPE'], rating: 5, comment: 'Rewired the estate gatehouse board cleanly and on time.', createdAt: '2026-09-25T18:00:00' },
{ id: 'fb2', apprenticeId: 'a2', employerId: 'e1', credentialIds: ['SP-3WLA-9KDS'], rating: 2, comment: 'Conduit work needed rework.', createdAt: '2026-09-27T17:00:00', referralId: 'r3' },
{ id: 'fb4', apprenticeId: 'a6', employerId: 'e3', credentialIds: ['SP-4QPL-7NVB'], rating: 1, comment: 'Clutch slipped after two days. Had to redo it.', createdAt: '2026-09-26T10:00:00' },
{ id: 'fb5', apprenticeId: 'a7', employerId: 'e3', credentialIds: ['SP-9WXC-2HJK'], rating: 2, comment: 'Brakes squealing; pads not seated properly.', createdAt: '2026-09-28T10:00:00' },
{ id: 'fb3', apprenticeId: 'a4', employerId: 'e2', credentialIds: ['SP-9CEB-3MUF'], rating: 4, comment: 'Good finishing, slightly late delivery.', createdAt: '2026-09-23T12:00:00' }];


export const seedJobs: Job[] = [
{ id: 'j1', employerId: 'e1', title: 'Rewire two flats in a Lekki estate', trade: 'electrical', skillIds: ['el-03', 'el-04', 'el-05'], location: places.lekki, postedAt: '2026-09-28T09:00:00', pay: '₦180,000 fixed' },
{ id: 'j2', employerId: 'e1', title: 'Solar backup install for estate clubhouse', trade: 'electrical', skillIds: ['el-07', 'el-03'], location: places.ajah, postedAt: '2026-09-29T12:00:00', pay: '₦250,000 fixed' },
{ id: 'j3', employerId: 'e2', title: 'Seasonal tailor for wedding orders', trade: 'tailoring', skillIds: ['ta-01', 'ta-04'], location: places.ikoyi, postedAt: '2026-09-26T10:00:00', pay: '₦12,000 per day' },
{ id: 'j4', employerId: 'e3', title: 'Junior mechanic, brake and service bay', trade: 'mechanic', skillIds: ['me-01', 'me-02'], location: places.surulere, postedAt: '2026-09-27T08:30:00', pay: '₦90,000 monthly' }];


export const seedReferrals: Referral[] = [
{ id: 'r1', jobId: 'j1', apprenticeId: 'a1', status: 'sent', sentAt: '2026-09-28T09:05:00' },
{ id: 'r2', jobId: 'j2', apprenticeId: 'a1', status: 'accepted', sentAt: '2026-09-29T12:10:00' },
{ id: 'r3', jobId: 'j1', apprenticeId: 'a2', status: 'contacted', sentAt: '2026-09-28T09:05:00' }];


export const seedAuditLog: AuditEntry[] = [
{ id: 'al15', at: '2026-09-30T11:45:00', actor: 'Babatunde Adeyemi', action: 'credential.issued', target: 'SP-5YJU-7CVM', detail: 'Kelechi Obi · Install a single-gang switch and socket outlet' },
{ id: 'al14', at: '2026-09-30T09:15:00', actor: 'Babatunde Adeyemi', action: 'credential.issued', target: 'SP-8QGE-4TNB', detail: 'Emeka Nwosu · Test continuity and insulation resistance' },
{ id: 'al13', at: '2026-09-29T13:00:00', actor: 'Chinedu Okafor', action: 'credential.issued', target: 'SP-1RKD-6PLW', detail: 'Advanced skill — co-signature requested from Babatunde Adeyemi' },
{ id: 'al12', at: '2026-09-29T08:00:00', actor: 'System', action: 'audit.selected', target: 'SP-6FHP-1ZRT', detail: 'Random audit sample (weekly, 5%)' },
{ id: 'al11', at: '2026-09-29T08:00:00', actor: 'System', action: 'audit.selected', target: 'SP-6HWK-5GAY', detail: 'Random audit sample (weekly, 5%)' },
{ id: 'al10', at: '2026-09-27T17:05:00', actor: 'Folake Hassan', action: 'credential.flagged', target: 'SP-3WLA-9KDS', detail: 'Conduit run had to be redone' },
{ id: 'al9', at: '2026-09-26T16:20:00', actor: 'Chinedu Okafor', action: 'credential.cosigned', target: 'SP-7MXV-3JYK', detail: 'Co-signed advanced skill for Tobi Ogunleye' },
{ id: 'al8', at: '2026-09-25T18:00:00', actor: 'Folake Hassan', action: 'feedback.added', target: 'Tobi Ogunleye', detail: 'Rated 5/5' },
{ id: 'al7', at: '2026-09-25T10:00:00', actor: 'Fejiro Obiku', action: 'credential.revoked', target: 'SP-2DVS-8LQJ', detail: 'Audit re-check disagreed with trainer assessment' },
{ id: 'al6', at: '2026-09-22T11:05:00', actor: 'Babatunde Adeyemi', action: 'credential.issued', target: 'SP-2BNC-8QPE', detail: 'Tobi Ogunleye · Wire a consumer unit (distribution board)' },
{ id: 'al5', at: '2026-09-21T14:16:00', actor: 'System', action: 'credential.held', target: 'SP-3PZN-1VKR', detail: 'Daily issuing limit (5) exceeded by Ibrahim Musa' },
{ id: 'al4', at: '2026-09-10T14:40:00', actor: 'Babatunde Adeyemi', action: 'credential.issued', target: 'SP-9TRD-5HWA', detail: 'Tobi Ogunleye · Install a single-gang switch and socket outlet' },
{ id: 'al3', at: '2026-09-03T10:12:00', actor: 'Babatunde Adeyemi', action: 'credential.issued', target: 'SP-4KQ7-L2MX', detail: 'Tobi Ogunleye · Identify cable sizes and colour codes' },
{ id: 'al2', at: '2026-08-07T09:00:00', actor: 'Fejiro Obiku', action: 'trainer.approved', target: 'Chinedu Okafor', detail: 'Workshop visit completed' },
{ id: 'al1', at: '2026-08-04T09:00:00', actor: 'Fejiro Obiku', action: 'trainer.approved', target: 'Babatunde Adeyemi', detail: 'Workshop visit completed' }];