import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  AppNotification,
  Apprentice,
  Attempt,
  AuditEntry,
  AuditSample,
  ConcernCategory,
  ConcernReport,
  Credential,
  Employer,
  Evidence,
  Feedback,
  Flag,
  Job,
  Referral,
  ReferralStatus,
  Settings,
  Skill,
  SkillLevel,
  SusResponse,
  Trade,
  Trainer,
  VerificationEvent } from
'../types/skillpass';
import { api, messageOf } from '../api/client';
import { assessors } from '../data/integrity';
import { isSameDay } from '../utils/credentials';
import type { TrustBreakdown } from '../utils/credentials';
import type { TrainerRisk } from '../utils/risk';

/**
 * The app's data store.
 *
 * Everything here is loaded from the SkillPass API (GET /api/bootstrap) and scoped by the server to what the
 * signed-in person may see. Actions call the API and then reload, so the screen always shows what the server
 * accepted. Integrity rules (daily limit, probation, duplicate evidence, signing, scoring) live on the server.
 */

interface IssueInput {
  trainerId: string;
  apprenticeId: string;
  skillId: string;
  evidence: Evidence[];
  criteriaMet: string[];
  note: string;
  cosignRequestedFrom?: string;
}

interface Bootstrap {
  trades: Trade[];
  skills: Skill[];
  settings: Settings;
  trainers: Trainer[];
  apprentices: Apprentice[];
  employers: Employer[];
  admins: {id: string;name: string;}[];
  credentials: Credential[];
  flags: Flag[];
  samples: AuditSample[];
  reports: ConcernReport[];
  feedback: Feedback[];
  jobs: Job[];
  referrals: Referral[];
  auditLog: AuditEntry[];
  notifications: AppNotification[];
  susResponses: SusResponse[];
  verifications: VerificationEvent[];
  trust: Record<string, TrustBreakdown>;
  risk: Record<string, TrainerRisk>;
}

const DEFAULT_SETTINGS: Settings = { dailyLimit: 5, auditRatePct: 10, probationCount: 5, clusterThreshold: 4, fastMinutes: 15, smsEnabled: true, emailEnabled: true };

const EMPTY: Bootstrap = {
  trades: [], skills: [], settings: DEFAULT_SETTINGS, trainers: [], apprentices: [], employers: [], admins: [], credentials: [],
  flags: [], samples: [], reports: [], feedback: [], jobs: [], referrals: [], auditLog: [], notifications: [],
  susResponses: [], verifications: [], trust: {}, risk: {}
};

const NO_TRUST: TrustBreakdown = {
  score: 0, auditAgreement: null, auditCount: 0, avgRating: null, ratingCount: 0, flaggedShare: 0, issuedCount: 0,
  evidenceShare: 1, poorRatings: 0, ratingPenalty: 0, misconduct: false
};

function useSkillPassStore() {
  const [data, setData] = useState<Bootstrap>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const signedIn = useRef(false);

  /** Public data that sign-in and registration pages need before anyone is signed in. */
  const loadPublic = useCallback(async () => {
    signedIn.current = false;
    try {
      const [t, s, tr] = await Promise.all([
      api.get<{trades: Trade[];}>('/api/trades'),
      api.get<{skills: Skill[];}>('/api/skills'),
      api.get<{trainers: {id: string;name: string;trade: string;workshop: string;location: string | null;}[];}>('/api/trainers')]
      );
      const trainers: Trainer[] = tr.trainers.map((x) => ({
        id: x.id, name: x.name, trade: x.trade, workshop: x.workshop, location: { name: x.location ?? '', lat: 0, lng: 0 }, phone: '',
        approved: true, joinedAt: '', associationId: '', membershipNo: '', membershipVerified: true
      }));
      setData({ ...EMPTY, trades: t.trades, skills: s.skills, trainers });
    } catch (e) {
      setNotice(messageOf(e));
    }
  }, []);

  /** Everything the signed-in person's screens need. */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<Bootstrap>('/api/bootstrap'));
      signedIn.current = true;
    } catch (e) {
      setNotice(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (signedIn.current) await load();
  }, [load]);

  const reset = useCallback(() => {
    setData(EMPTY);
    setNotice(null);
    void loadPublic();
  }, [loadPublic]);

  /** Run an API call, reload, and show the server's message if it was refused. Returns undefined on failure. */
  const act = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      const out = await fn();
      await refresh();
      return out;
    } catch (e) {
      setNotice(messageOf(e));
      return undefined;
    }
  }, [refresh]);

  /** Like act, but hands the error message back to the caller instead of the banner. */
  const attempt = useCallback(async <T,>(fn: () => Promise<T>): Promise<{value?: T;error?: string;}> => {
    try {
      const value = await fn();
      await refresh();
      return { value };
    } catch (e) {
      return { error: messageOf(e) };
    }
  }, [refresh]);

  // ---- lookups ----------------------------------------------------------------------------------------------

  const { trainers, apprentices, employers, admins, credentials, skills, settings } = data;

  const nameOf = useCallback((id?: string) => {
    if (!id) return '';
    return (
      trainers.find((t) => t.id === id)?.name ??
      apprentices.find((a) => a.id === id)?.name ??
      employers.find((e) => e.id === id)?.name ??
      admins.find((a) => a.id === id)?.name ??
      assessors.find((a) => a.id === id)?.name ??
      id);
  }, [trainers, apprentices, employers, admins]);

  const evidenceHashes = useMemo(() => new Set(credentials.flatMap((c) => c.evidence.map((e) => e.hash))), [credentials]);
  const trustOf = useCallback((trainerId: string): TrustBreakdown => data.trust[trainerId] ?? NO_TRUST, [data.trust]);
  const riskOf = useCallback((trainerId: string): TrainerRisk | null => data.risk[trainerId] ?? null, [data.risk]);
  const issuedToday = useCallback(
    (trainerId: string) => credentials.filter((c) => c.trainerId === trainerId && isSameDay(new Date(c.issuedAt), new Date())).length,
    [credentials]
  );

  // ---- credentials --------------------------------------------------------------------------------------------

  const issueCredential = async (input: IssueInput, _actor?: string): Promise<{credential?: Credential;error?: string;}> => {
    const r = await attempt(() => api.post<{credential: Credential;}>('/api/credentials', {
      apprenticeId: input.apprenticeId, skillId: input.skillId, evidenceIds: input.evidence.map((e) => e.id),
      criteriaMet: input.criteriaMet, note: input.note, cosignRequestedFrom: input.cosignRequestedFrom
    }));
    return r.error ? { error: r.error } : { credential: r.value?.credential };
  };

  const confirmCredential = (id: string) => act(() => api.post(`/api/credentials/${id}/confirm`));
  const disputeCredential = (id: string, reason: string) => act(() => api.post(`/api/credentials/${id}/dispute`, { reason }));
  const recordAttempt = (_trainerId: string, apprenticeId: string, skillId: string, criteriaMet: string[]) =>
  act(() => api.post('/api/attempts', { apprenticeId, skillId, criteriaMet }));
  const cosign = (credentialId: string, _cosignerId?: string) => act(() => api.post(`/api/credentials/${credentialId}/cosign`));
  const revoke = (credentialId: string, reason: string, _actor?: string) => act(() => api.post(`/api/credentials/${credentialId}/revoke`, { reason }));
  const raiseFlag = (credentialId: string, reason: string, _raisedBy?: string) => act(() => api.post(`/api/credentials/${credentialId}/flag`, { reason }));

  // ---- administrator actions ----------------------------------------------------------------------------------

  const markMisconduct = (trainerId: string, reason: string, _actor?: string) => act(() => api.post(`/api/admin/trainers/${trainerId}/misconduct`, { reason }));
  const reinstate = (credentialId: string, _actor?: string) => act(() => api.post(`/api/admin/credentials/${credentialId}/reinstate`));
  const resolveFlag = (flagId: string, outcome: 'dismiss' | 'revoke' | 'misconduct', _actor?: string) => act(() => api.post(`/api/admin/flags/${flagId}/resolve`, { outcome }));
  const completeSample = (sampleId: string, outcome: 'agree' | 'disagree' | 'misconduct', _actor?: string) => act(() => api.post(`/api/admin/audit-samples/${sampleId}/complete`, { outcome }));
  const assignAssessor = (sampleId: string, assessorId: string, _actor?: string) => act(() => api.post(`/api/admin/audit-samples/${sampleId}/assign`, { assessorId }));
  const runAuditSampling = async (_actor?: string): Promise<number> => (await act(() => api.post<{selected: number;}>('/api/admin/audit-samples/run')))?.selected ?? 0;
  const auditTrainer = async (trainerId: string, _actor?: string): Promise<number> => (await act(() => api.post<{selected: number;}>(`/api/admin/trainers/${trainerId}/audit`)))?.selected ?? 0;
  const releaseHeld = (credentialId: string, approve: boolean, _actor?: string) => act(() => api.post(`/api/admin/credentials/${credentialId}/release`, { approve }));
  const verifyMembership = (trainerId: string, _actor?: string) => act(() => api.post(`/api/admin/trainers/${trainerId}/verify-membership`));
  const approveProfile = (id: string, _actor?: string) => act(() => api.post(`/api/admin/users/${id}/approve`));
  const updateReport = (id: string, status: ConcernReport['status'], _actor?: string) => act(() => api.patch(`/api/admin/reports/${id}`, { status }));
  const updateSettings = (patch: Partial<Settings>, _actor?: string) => act(() => api.patch('/api/admin/settings', patch));
  const reviewSkill = (skillId: string, approve: boolean, _actor?: string) => act(() => api.post(`/api/admin/skills/${skillId}/review`, { approve }));
  const addSkill = (trade: string, name: string, level: SkillLevel, _actor?: string) => act(() => api.post('/api/admin/skills', { trade, name, level }));
  const addTrade = async (name: string, _actor?: string): Promise<string> => (await act(() => api.post<{trade: Trade;}>('/api/admin/trades', { name })))?.trade.id ?? '';

  // ---- apprentices, trainers, employers -----------------------------------------------------------------------

  const reportConcern = (_apprenticeId: string, category: ConcernCategory, details: string) => act(() => api.post('/api/reports', { category, details }));
  const proposeSkill = (_trainerId: string, _trade: string, name: string, level: SkillLevel) => act(() => api.post('/api/skills/propose', { name, level }));

  const addFeedback = async (fb: Omit<Feedback, 'id' | 'createdAt'>): Promise<string | null> => {
    const r = await attempt(() => api.post('/api/feedback', { referralId: fb.referralId, rating: fb.rating, comment: fb.comment, credentialIds: fb.credentialIds }));
    return r.error ?? null;
  };

  const postJob = async (job: Omit<Job, 'id' | 'postedAt'>): Promise<Job | undefined> =>
  (await act(() => api.post<{job: Job;}>('/api/jobs', { title: job.title, skillIds: job.skillIds, location: job.location, pay: job.pay })))?.job;

  const sendReferral = (jobId: string, apprenticeId: string, _employerId?: string) => act(() => api.post(`/api/jobs/${jobId}/referrals`, { apprenticeId }));
  const setReferralStatus = (referralId: string, status: ReferralStatus) => act(() => api.patch(`/api/referrals/${referralId}`, { status }));

  // ---- notifications, survey, verification timing ------------------------------------------------------------

  const markRead = (id: string) => {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
    void api.post(`/api/notifications/${id}/read`).catch(() => undefined);
  };
  const markAllRead = (userId: string) => {
    setData((d) => ({ ...d, notifications: d.notifications.map((n) => n.userId === userId ? { ...n, read: true } : n) }));
    void api.post('/api/notifications/read-all').catch(() => undefined);
  };

  /** Send the ten answers. The server works out the score, so it cannot be changed from the browser. */
  const submitSus = async (answers: number[]): Promise<number | undefined> => (await act(() => api.post<{score: number;}>('/api/sus', { answers })))?.score;

  const recordVerification = async (credentialId: string, seconds: number): Promise<string> => {
    try {
      return (await api.post<{id: string;}>(`/api/verify/${credentialId}/events`, { seconds })).id;
    } catch {
      return '';
    }
  };
  const rateVerification = async (id: string, trustRating: number) => {
    if (id) await api.patch(`/api/verify/events/${id}`, { trustRating }).catch(() => undefined);
  };

  return {
    trainers, apprentices, employers, trades: data.trades, skills, credentials, flags: data.flags, samples: data.samples, reports: data.reports,
    feedback: data.feedback, jobs: data.jobs, referrals: data.referrals, auditLog: data.auditLog, notifications: data.notifications,
    susResponses: data.susResponses, verifications: data.verifications, settings, evidenceHashes,
    attempts: [] as Attempt[],
    loading, notice, clearNotice: () => setNotice(null), showNotice: setNotice,
    load, loadPublic, refresh, reset,
    nameOf, trustOf, riskOf, issuedToday,
    issueCredential, confirmCredential, disputeCredential, recordAttempt, cosign, revoke, raiseFlag,
    markMisconduct, reinstate, resolveFlag, completeSample, assignAssessor, runAuditSampling, auditTrainer, releaseHeld,
    verifyMembership, approveProfile, reportConcern, updateReport, addFeedback, postJob, sendReferral, setReferralStatus,
    proposeSkill, reviewSkill, addSkill, addTrade, markRead, markAllRead, updateSettings, submitSus, recordVerification, rateVerification
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
