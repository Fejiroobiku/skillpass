import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type {
  AppNotification,
  Apprentice,
  Attempt,
  AuditAction,
  AuditEntry,
  AuditReason,
  AuditSample,
  ConcernCategory,
  ConcernReport,
  Credential,
  CredentialStatus,
  Employer,
  Evidence,
  Feedback,
  Flag,
  Job,
  NotificationChannel,
  Referral,
  ReferralStatus,
  Role,
  Settings,
  Skill,
  SkillLevel,
  SusResponse,
  Trade,
  Trainer,
  VerificationEvent } from
'../types/skillpass';
import { admins, apprentices as seedApprentices, employers as seedEmployers, trainers as seedTrainers } from '../data/people';
import { skills as seedSkills, trades as seedTrades } from '../data/skills';
import { seedAuditLog, seedAuditSamples, seedCredentials, seedFeedback, seedFlags, seedJobs, seedReferrals } from '../data/records';
import { seedNotifications, seedSus, seedVerifications } from '../data/pilot';
import { assessors, rubricFor, seedAttempts, seedReports } from '../data/integrity';
import { computeTrust, generateCredentialId, isSameDay, signPayload } from '../utils/credentials';
import { computeRisk } from '../utils/risk';
import { rankMatches } from '../utils/matching';

interface IssueInput {
  trainerId: string;
  apprenticeId: string;
  skillId: string;
  evidence: Evidence[];
  criteriaMet: string[];
  note: string;
  cosignRequestedFrom?: string;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
const LOCKED: CredentialStatus[] = ['revoked', 'under_review', 'flagged'];

/** Where a credential sits in the issue → confirm → co-sign pipeline. */
function flowStatus(c: Credential): CredentialStatus {
  if (c.heldForReview && !c.heldCleared) return 'held_review';
  if (!c.apprenticeConfirmedAt) return 'pending_apprentice';
  if (c.needsCosign && !c.cosignerId) return 'pending_cosign';
  return 'valid';
}

function useSkillPassStore() {
  const [trainers, setTrainers] = useState<Trainer[]>(seedTrainers);
  const [apprentices, setApprentices] = useState<Apprentice[]>(seedApprentices);
  const [employers, setEmployers] = useState<Employer[]>(seedEmployers);
  const [trades, setTrades] = useState<Trade[]>(seedTrades);
  const [skills, setSkills] = useState<Skill[]>(seedSkills);
  const [credentials, setCredentials] = useState<Credential[]>(seedCredentials);
  const [attempts, setAttempts] = useState<Attempt[]>(seedAttempts);
  const [flags, setFlags] = useState<Flag[]>(seedFlags);
  const [samples, setSamples] = useState<AuditSample[]>(seedAuditSamples);
  const [reports, setReports] = useState<ConcernReport[]>(seedReports);
  const [feedback, setFeedback] = useState<Feedback[]>(seedFeedback);
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [referrals, setReferrals] = useState<Referral[]>(seedReferrals);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(seedAuditLog);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [susResponses, setSusResponses] = useState<SusResponse[]>(seedSus);
  const [verifications, setVerifications] = useState<VerificationEvent[]>(seedVerifications);
  const [settings, setSettings] = useState<Settings>({ dailyLimit: 5, auditRatePct: 10, probationCount: 5, clusterThreshold: 4, fastMinutes: 15, smsEnabled: true, emailEnabled: true });

  const nameOf = useCallback(
    (id?: string) => {
      if (!id) return '';
      return (
        trainers.find((t) => t.id === id)?.name ??
        apprentices.find((a) => a.id === id)?.name ??
        employers.find((e) => e.id === id)?.name ??
        admins.find((a) => a.id === id)?.name ??
        assessors.find((a) => a.id === id)?.name ??
        id);

    },
    [trainers, apprentices, employers]
  );

  const log = useCallback((actor: string, action: AuditAction, target: string, detail: string) => {
    setAuditLog((prev) => [{ id: uid('al'), at: now(), actor, action, target, detail }, ...prev]);
  }, []);

  const notify = useCallback(
    (userId: string, title: string, body: string, link?: string, channels: NotificationChannel[] = ['in_app']) => {
      const active = channels.filter((c) => c === 'sms' ? settings.smsEnabled : c === 'email' ? settings.emailEnabled : true);
      setNotifications((prev) => [...active.map((channel) => ({ id: uid('n'), userId, channel, title, body, at: now(), read: false, link })), ...prev]);
    },
    [settings.smsEnabled, settings.emailEnabled]
  );

  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;
  const evidenceHashes = useMemo(() => new Set(credentials.flatMap((c) => c.evidence.map((e) => e.hash))), [credentials]);

  const trustOf = useCallback(
    (trainerId: string) => computeTrust(trainerId, credentials, flags, feedback, samples, !!trainers.find((t) => t.id === trainerId)?.misconductAt),
    [credentials, flags, feedback, samples, trainers]
  );
  const riskOf = useCallback(
    (trainerId: string) => {
      const t = trainers.find((x) => x.id === trainerId);
      return t ? computeRisk(t, credentials, attempts, feedback, reports, settings) : null;
    },
    [trainers, credentials, attempts, feedback, reports, settings]
  );

  const issuedToday = useCallback(
    (trainerId: string) => credentials.filter((c) => c.trainerId === trainerId && isSameDay(new Date(c.issuedAt), new Date())).length,
    [credentials]
  );

  const assessorFor = (trade: string) => assessors.find((a) => a.nsqId && a.trades.includes(trade))?.id ?? assessors.find((a) => a.trades.includes(trade))?.id;

  const addSamples = (creds: Credential[], reason: AuditReason, actor: string) => {
    if (!creds.length) return;
    setSamples((prev) => [
    ...creds.map((c) => ({ id: uid('as'), credentialId: c.id, assessor: 'ad1', assessorId: assessorFor(skills.find((s) => s.id === c.skillId)?.trade ?? ''), reason, selectedAt: now(), result: 'pending' as const })),
    ...prev]
    );
    creds.forEach((c) => log(actor, 'audit.selected', c.id, `${reason === 'risk' ? 'Risk-based' : reason === 'probation' ? 'Probation' : 'Random'} audit sample`));
  };

  /** Apply a patch and move the credential to its next pipeline stage, notifying the right people. */
  const transition = (c: Credential, patch: Partial<Credential>) => {
    const next = { ...c, ...patch };
    const status = LOCKED.includes(c.status) && !patch.status ? c.status : patch.status ?? flowStatus(next);
    const updated = { ...next, status };
    setCredentials((prev) => prev.map((x) => x.id === c.id ? updated : x));
    if (status === c.status) return updated;
    if (status === 'pending_cosign' && updated.cosignRequestedFrom) {
      notify(updated.cosignRequestedFrom, 'Co-sign request', `${nameOf(c.trainerId)} asked you to co-sign “${skillName(c.skillId)}” for ${nameOf(c.apprenticeId)}.`, updated.cosignRequestedFrom.startsWith('e') ? '/employer' : '/trainer', ['in_app', 'sms']);
    }
    if (status === 'valid') {
      notify(c.apprenticeId, 'Skill verified', `“${skillName(c.skillId)}” is now valid. ID ${c.id}.`, `/verify/${c.id}`, ['in_app', 'sms']);
      notify(c.trainerId, 'Credential valid', `${c.id} for ${nameOf(c.apprenticeId)} is now valid.`, '/trainer/credentials');
    }
    return updated;
  };

  const issueCredential = (input: IssueInput, actor: string): {credential?: Credential;error?: string;} => {
    const trainer = trainers.find((t) => t.id === input.trainerId);
    const skill = skills.find((s) => s.id === input.skillId);
    if (!trainer?.approved || !trainer.membershipVerified) return { error: 'Your trainer account is not approved to issue.' };
    if (trainer.misconductAt) return { error: 'Issuing is suspended while your credentials are under review.' };
    if (!skill) return { error: 'Choose a skill.' };
    if (!input.evidence.some((e) => e.kind === 'video' && e.challengeCode)) return { error: 'A live video showing the challenge code is required.' };
    const dup = input.evidence.find((e) => evidenceHashes.has(e.hash));
    if (dup) {
      log('System', 'evidence.duplicate_blocked', dup.hash.slice(0, 12), `${trainer.name} tried to reuse evidence already attached to another credential`);
      return { error: 'One file matches evidence already used on another credential.' };
    }
    const rubric = rubricFor(skill.id);
    if (!rubric.every((r) => input.criteriaMet.includes(r))) return { error: 'Every rubric criterion must be observed to issue.' };

    const mineCount = credentials.filter((c) => c.trainerId === trainer.id).length;
    const onProbation = mineCount < settings.probationCount;
    const needsCosign = skill.requiresCosign || onProbation;
    const overLimit = issuedToday(trainer.id) >= settings.dailyLimit;
    const risk = riskOf(trainer.id);
    const id = generateCredentialId();
    const issuedAt = now();
    const base: Credential = {
      id,
      apprenticeId: input.apprenticeId,
      trainerId: trainer.id,
      skillId: skill.id,
      issuedAt,
      evidence: input.evidence,
      status: 'pending_apprentice',
      criteriaMet: input.criteriaMet,
      needsCosign,
      cosignReason: skill.requiresCosign ? 'advanced' : onProbation ? 'probation' : undefined,
      cosignRequestedFrom: needsCosign ? input.cosignRequestedFrom : undefined,
      heldForReview: overLimit,
      signature: signPayload(`${id}|${input.apprenticeId}|${skill.id}|${trainer.id}|${issuedAt}|${input.evidence.map((e) => e.hash).join(',')}`),
      note: input.note
    };
    const credential = { ...base, status: flowStatus(base) };
    setCredentials((prev) => [credential, ...prev]);
    log(actor, 'credential.issued', id, `${nameOf(input.apprenticeId)} · ${skill.name} · ${input.criteriaMet.length}/${rubric.length} criteria`);
    notify(input.apprenticeId, 'Please confirm your skill', `${trainer.name} recorded “${skill.name}”. Confirm you did this task, or tell us if you didn't.`, '/apprentice/confirm', ['in_app', 'sms']);
    if (overLimit) {
      log('System', 'credential.held', id, `Daily issuing limit (${settings.dailyLimit}) exceeded`);
      notify('ad1', 'Credential held for review', `${trainer.name} passed the daily limit. ${id} needs review.`, '/admin/review');
    }
    if (risk?.level === 'high') addSamples([credential], 'risk', 'System');
    return { credential };
  };

  const confirmCredential = (credentialId: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    if (!c) return;
    transition(c, { apprenticeConfirmedAt: now() });
    log(nameOf(c.apprenticeId), 'credential.confirmed', c.id, 'Apprentice confirmed they performed the task');
  };

  const disputeCredential = (credentialId: string, reason: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    if (!c) return;
    setFlags((prev) => [{ id: uid('fl'), credentialId, raisedBy: c.apprenticeId, reason: `Apprentice dispute: ${reason}`, raisedAt: now(), status: 'open' }, ...prev]);
    transition(c, { status: 'flagged' });
    log(nameOf(c.apprenticeId), 'credential.disputed', c.id, 'Apprentice says they did not perform this task');
    notify('ad1', 'Apprentice disputed a credential', `${nameOf(c.apprenticeId)} says they did not do “${skillName(c.skillId)}”.`, '/admin/review');
  };

  const recordAttempt = (trainerId: string, apprenticeId: string, skillId: string, criteriaMet: string[]) => {
    setAttempts((prev) => [{ id: uid('at'), trainerId, apprenticeId, skillId, criteriaMet, at: now() }, ...prev]);
    log(nameOf(trainerId), 'assessment.not_yet', nameOf(apprenticeId), `${skillName(skillId)} · ${criteriaMet.length}/${rubricFor(skillId).length} criteria`);
    notify(apprenticeId, 'Keep practising', `“${skillName(skillId)}” was assessed as not yet competent. Your trainer can assess you again.`, '/apprentice');
  };

  const cosign = (credentialId: string, cosignerId: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    if (!c) return;
    transition(c, { cosignerId });
    log(nameOf(cosignerId), 'credential.cosigned', credentialId, c.cosignReason === 'probation' ? 'Probation co-signature' : 'Advanced skill co-signed');
  };

  const revoke = (credentialId: string, reason: string, actor: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    setCredentials((prev) => prev.map((x) => x.id === credentialId ? { ...x, status: 'revoked', revokeReason: reason } : x));
    log(actor, 'credential.revoked', credentialId, reason);
    if (c) notify(c.apprenticeId, 'Credential revoked', `${c.id} (“${skillName(c.skillId)}”) was revoked: ${reason}`, `/verify/${c.id}`, ['in_app', 'sms']);
  };

  const markMisconduct = (trainerId: string, reason: string, actor: string) => {
    const t = trainers.find((x) => x.id === trainerId);
    if (!t) return;
    setTrainers((prev) => prev.map((x) => x.id === trainerId ? { ...x, misconductAt: now(), misconductReason: reason } : x));
    const affected = credentials.filter((c) => c.trainerId === trainerId && c.status !== 'revoked');
    setCredentials((prev) => prev.map((c) => c.trainerId === trainerId && c.status !== 'revoked' ? { ...c, status: 'under_review' } : c));
    log(actor, 'trainer.misconduct', t.name, `${reason} · ${affected.length} earlier credentials moved to under review · association notified`);
    affected.forEach((c) => log('System', 'credential.under_review', c.id, 'Issuing trainer found cheating'));
    new Set(affected.map((c) => c.apprenticeId)).forEach((aid) => notify(aid, 'Credential under review', `Credentials signed by ${t.name} are being re-checked. You may be asked to show the skill to an assessor.`, '/apprentice', ['in_app', 'sms']));
    notify(trainerId, 'Issuing suspended', `Your credentials are under review: ${reason}. Your trade association has been informed.`, '/trainer', ['in_app', 'sms', 'email']);
  };

  const reinstate = (credentialId: string, actor: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    if (!c) return;
    const status = flowStatus(c);
    setCredentials((prev) => prev.map((x) => x.id === credentialId ? { ...x, status } : x));
    log(actor, 'credential.reinstated', credentialId, 'Re-checked and reinstated');
  };

  const raiseFlag = (credentialId: string, reason: string, raisedBy: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    setFlags((prev) => [{ id: uid('fl'), credentialId, raisedBy, reason, raisedAt: now(), status: 'open' }, ...prev]);
    setCredentials((prev) => prev.map((x) => x.id === credentialId && x.status === 'valid' ? { ...x, status: 'flagged' } : x));
    log(nameOf(raisedBy), 'credential.flagged', credentialId, reason);
    notify('ad1', 'New flag', `${credentialId} was flagged by ${nameOf(raisedBy)}.`, '/admin/review');
    if (c) notify(c.trainerId, 'Credential flagged', `${nameOf(raisedBy)} flagged ${credentialId}: “${reason}”`, `/verify/${credentialId}`);
  };

  const resolveFlag = (flagId: string, outcome: 'dismiss' | 'revoke' | 'misconduct', actor: string) => {
    const flag = flags.find((f) => f.id === flagId);
    if (!flag) return;
    setFlags((prev) => prev.map((f) => f.id === flagId ? { ...f, status: outcome === 'dismiss' ? 'dismissed' : 'upheld' } : f));
    const c = credentials.find((x) => x.id === flag.credentialId);
    if (outcome === 'dismiss') {
      if (c) setCredentials((prev) => prev.map((x) => x.id === c.id ? { ...x, status: flowStatus(x) } : x));
      log(actor, 'flag.dismissed', flag.credentialId, 'Flag reviewed and dismissed');
      return;
    }
    revoke(flag.credentialId, `Flag upheld: ${flag.reason}`, actor);
    if (outcome === 'misconduct' && c) markMisconduct(c.trainerId, `Flag upheld on ${c.id}`, actor);
  };

  const completeSample = (sampleId: string, outcome: 'agree' | 'disagree' | 'misconduct', actor: string) => {
    const s = samples.find((x) => x.id === sampleId);
    setSamples((prev) => prev.map((x) => x.id === sampleId ? { ...x, result: outcome === 'agree' ? 'agree' : 'disagree' } : x));
    if (!s) return;
    log(actor, 'audit.completed', s.credentialId, outcome === 'agree' ? 'Re-check agrees with trainer' : 'Re-check disagrees with trainer');
    const c = credentials.find((x) => x.id === s.credentialId);
    if (!c) return;
    notify(c.trainerId, 'Audit result', `Spot-check of ${c.id} ${outcome === 'agree' ? 'agreed' : 'did not agree'} with your assessment.`, '/trainer');
    if (outcome !== 'agree') revoke(c.id, 'Independent re-check found the skill was not demonstrated', actor);
    if (outcome === 'misconduct') markMisconduct(c.trainerId, `Audit of ${c.id} found a false claim`, actor);
  };

  const assignAssessor = (sampleId: string, assessorId: string, actor: string) => {
    const s = samples.find((x) => x.id === sampleId);
    setSamples((prev) => prev.map((x) => x.id === sampleId ? { ...x, assessorId } : x));
    if (s) log(actor, 'audit.assigned', s.credentialId, `Assigned to ${nameOf(assessorId)}`);
  };

  const runAuditSampling = (actor: string): number => {
    const sampled = new Set(samples.map((s) => s.credentialId));
    const pool = credentials.filter((c) => c.status === 'valid' && !sampled.has(c.id));
    const n = Math.min(pool.length, Math.max(1, Math.round(credentials.filter((c) => c.status === 'valid').length * settings.auditRatePct / 100)));
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
    addSamples(picked, 'random', actor);
    picked.forEach((c) => notify(c.trainerId, 'Audit sample selected', `${c.id} was picked for a random spot-check.`));
    return picked.length;
  };

  const auditTrainer = (trainerId: string, actor: string): number => {
    const sampled = new Set(samples.filter((s) => s.result === 'pending').map((s) => s.credentialId));
    const picked = credentials.filter((c) => c.trainerId === trainerId && c.status === 'valid' && !sampled.has(c.id));
    addSamples(picked, 'risk', actor);
    if (picked.length) notify(trainerId, 'Risk-based audit', `${picked.length} of your credentials will be re-checked by an independent assessor.`, '/trainer');
    return picked.length;
  };

  const releaseHeld = (credentialId: string, approve: boolean, actor: string) => {
    const c = credentials.find((x) => x.id === credentialId);
    if (!c) return;
    if (approve) {
      transition(c, { heldCleared: true });
      log(actor, 'credential.released', credentialId, 'Released after administrator review');
    } else revoke(credentialId, 'Rejected during issuing-limit review', actor);
  };

  const verifyMembership = (trainerId: string, actor: string) => {
    setTrainers((prev) => prev.map((t) => t.id === trainerId ? { ...t, membershipVerified: true } : t));
    log(actor, 'trainer.membership_verified', nameOf(trainerId), 'Trade association confirmed membership');
  };

  const approveProfile = (id: string, actor: string) => {
    if (id.startsWith('t')) {
      if (!trainers.find((t) => t.id === id)?.membershipVerified) return;
      setTrainers((prev) => prev.map((t) => t.id === id ? { ...t, approved: true } : t));
      log(actor, 'trainer.approved', nameOf(id), `Approved · probation for first ${settings.probationCount} credentials`);
      notify(id, 'You are approved', `You can now issue credentials. Your first ${settings.probationCount} each need a co-signer.`, '/trainer/issue', ['in_app', 'sms']);
    } else {
      setEmployers((prev) => prev.map((e) => e.id === id ? { ...e, approved: true } : e));
      log(actor, 'employer.approved', nameOf(id), 'Verified employer');
      notify(id, 'Employer verified', 'You can now rate apprentices after jobs and co-sign skills.', '/employer');
    }
  };

  const reportConcern = (apprenticeId: string, category: ConcernCategory, details: string) => {
    const a = apprentices.find((x) => x.id === apprenticeId);
    if (!a) return;
    setReports((prev) => [{ id: uid('cr'), apprenticeId, trainerId: a.trainerId, category, details, at: now(), status: 'open' }, ...prev]);
    log('Confidential', 'report.received', 'Confidential report', 'Apprentice report received (identity visible to administrators only)');
    notify('ad1', 'Confidential apprentice report', 'A new report needs review. The trainer has not been told.', '/admin/review');
  };

  const updateReport = (id: string, status: ConcernReport['status'], actor: string) => {
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    log(actor, 'report.updated', 'Confidential report', `Status → ${status}`);
  };

  const addFeedback = (fb: Omit<Feedback, 'id' | 'createdAt'>): string | null => {
    const emp = employers.find((e) => e.id === fb.employerId);
    if (!emp?.approved) return 'Only verified employers can leave ratings.';
    const ref = referrals.find((r) => r.id === fb.referralId);
    const job = jobs.find((j) => j.id === ref?.jobId);
    if (!ref || !job || job.employerId !== fb.employerId || !['accepted', 'contacted'].includes(ref.status)) return 'Ratings must be tied to a real job the apprentice took on.';
    if (feedback.some((f) => f.referralId === ref.id)) return 'You have already rated this job.';
    setFeedback((prev) => [{ ...fb, id: uid('fb'), createdAt: now() }, ...prev]);
    log(nameOf(fb.employerId), 'feedback.added', nameOf(fb.apprenticeId), `Rated ${fb.rating}/5 for ${job.title}`);
    notify(fb.apprenticeId, 'New rating', `${nameOf(fb.employerId)} rated your work ${fb.rating}/5.`, '/apprentice');
    return null;
  };

  const postJob = (job: Omit<Job, 'id' | 'postedAt'>): Job => {
    const created: Job = { ...job, id: uid('j'), postedAt: now() };
    setJobs((prev) => [created, ...prev]);
    log(nameOf(job.employerId), 'job.posted', created.title, `${created.skillIds.length} required skills · ${created.location.name}`);
    const n = rankMatches(created, apprentices, credentials).length;
    notify(job.employerId, `${n} match${n === 1 ? '' : 'es'} for your job`, `${created.title} has ${n} verified apprentice${n === 1 ? '' : 's'}.`, '/employer/jobs');
    return created;
  };

  const sendReferral = (jobId: string, apprenticeId: string, employerId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    setReferrals((prev) => [{ id: uid('r'), jobId, apprenticeId, status: 'sent', sentAt: now() }, ...prev]);
    log(nameOf(employerId), 'referral.sent', nameOf(apprenticeId), job?.title ?? jobId);
    notify(apprenticeId, 'New job referral', `${job?.title} in ${job?.location.name} (${job?.pay}).`, '/apprentice/jobs', ['in_app', 'sms']);
  };

  const setReferralStatus = (referralId: string, status: ReferralStatus) => {
    const r = referrals.find((x) => x.id === referralId);
    setReferrals((prev) => prev.map((x) => x.id === referralId ? { ...x, status } : x));
    const job = jobs.find((j) => j.id === r?.jobId);
    if (r && job && status === 'accepted') notify(job.employerId, 'Apprentice interested', `${nameOf(r.apprenticeId)} is interested in ${job.title}.`, '/employer/feedback');
  };

  const proposeSkill = (trainerId: string, trade: string, name: string, level: SkillLevel) => {
    setSkills((prev) => [...prev, { id: uid('sk'), trade, name, level, requiresCosign: level === 'Advanced', status: 'proposed', proposedBy: trainerId }]);
    log(nameOf(trainerId), 'skill.proposed', name, `${level} · ${trade}`);
    notify('ad1', 'Skill proposed', `${nameOf(trainerId)} proposed “${name}”.`, '/admin/skills');
  };

  const reviewSkill = (skillId: string, approve: boolean, actor: string) => {
    const s = skills.find((x) => x.id === skillId);
    setSkills((prev) => prev.map((x) => x.id === skillId ? { ...x, status: approve ? 'active' : 'rejected' } : x));
    log(actor, approve ? 'skill.approved' : 'skill.rejected', s?.name ?? skillId, s?.level ?? '');
    if (s?.proposedBy) notify(s.proposedBy, approve ? 'Skill added to checklist' : 'Skill proposal declined', `“${s.name}” was ${approve ? 'approved' : 'declined'}.`, '/trainer/skills');
  };

  const addSkill = (trade: string, name: string, level: SkillLevel, actor: string) => {
    setSkills((prev) => [...prev, { id: uid('sk'), trade, name, level, requiresCosign: level === 'Advanced', status: 'active' }]);
    log(actor, 'skill.added', name, `${level} · ${trade}`);
  };

  const addTrade = (name: string, actor: string): string => {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setTrades((prev) => prev.some((t) => t.id === id) ? prev : [...prev, { id, name }]);
    log(actor, 'trade.added', name, 'New trade checklist created');
    return id;
  };

  const addTrainer = (t: Trainer) => {
    setTrainers((prev) => [...prev, t]);
    notify('ad1', 'Trainer awaiting approval', `${t.name} (${t.location.name}) registered. Verify association membership ${t.membershipNo}.`, '/admin/users');
  };
  const addApprentice = (a: Apprentice) => {
    setApprentices((prev) => [...prev, a]);
    notify(a.trainerId, 'New apprentice linked', `${a.name} joined SkillPass as your apprentice.`, '/trainer/apprentices');
  };
  const addEmployer = (e: Employer) => setEmployers((prev) => [...prev, e]);

  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  const markAllRead = (userId: string) => setNotifications((prev) => prev.map((n) => n.userId === userId ? { ...n, read: true } : n));

  const updateSettings = (patch: Partial<Settings>, actor: string) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    log(actor, 'settings.updated', 'Integrity rules', Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(', '));
  };

  const submitSus = (userId: string, role: Role, score: number) => setSusResponses((prev) => [{ id: uid('sus'), userId, role, score, at: now() }, ...prev]);

  const recordVerification = (credentialId: string, seconds: number) => {
    const id = uid('v');
    setVerifications((prev) => [{ id, credentialId, seconds, at: now() }, ...prev]);
    return id;
  };
  const rateVerification = (id: string, trustRating: number) => setVerifications((prev) => prev.map((v) => v.id === id ? { ...v, trustRating } : v));

  return {
    trainers, apprentices, employers, trades, skills, credentials, attempts, flags, samples, reports, feedback, jobs, referrals,
    auditLog, notifications, susResponses, verifications, settings, evidenceHashes,
    nameOf, log, notify, trustOf, riskOf, issuedToday, issueCredential, confirmCredential, disputeCredential, recordAttempt,
    cosign, revoke, markMisconduct, reinstate, raiseFlag, resolveFlag, completeSample, assignAssessor, runAuditSampling, auditTrainer,
    releaseHeld, verifyMembership, approveProfile, reportConcern, updateReport, addFeedback, postJob, sendReferral, setReferralStatus,
    proposeSkill, reviewSkill, addSkill, addTrade, addTrainer, addApprentice, addEmployer,
    markRead, markAllRead, updateSettings, submitSus, recordVerification, rateVerification
  };
}

type SkillPassState = ReturnType<typeof useSkillPassStore>;

const SkillPassContext = createContext<SkillPassState | null>(null);

export function SkillPassProvider({ children }: {children: React.ReactNode;}) {
  const store = useSkillPassStore();
  return <SkillPassContext.Provider value={store}>{children}</SkillPassContext.Provider>;
}

export function useSkillPass(): SkillPassState {
  const ctx = useContext(SkillPassContext);
  if (!ctx) throw new Error('useSkillPass must be used inside SkillPassProvider');
  return ctx;
}