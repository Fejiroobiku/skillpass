import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Credential, Evidence } from '../types/skillpass';
import { useSkillPass } from '../contexts/SkillPassContext';
import { useAuth } from '../contexts/AuthContext';
import { rubricFor } from '../data/integrity';
import { messageOf } from '../api/client';
import { requestChallengeCode } from '../api/evidence';
import { isDuplicate } from '../components/evidence/EvidenceCapture';

export function useIssueCredential(initialApprenticeId?: string | null) {
  const sp = useSkillPass();
  const { credentials, trainers, employers, apprentices, skills, trades, settings, evidenceHashes, issuedToday, issueCredential, recordAttempt, riskOf, trustOf } = sp;
  const { user } = useAuth();
  const me = trainers.find((t) => t.id === user?.id)!;
  const myApprentices = apprentices.filter((a) => a.trainerId === me.id);

  const [apprenticeId, setApprenticeId] = useState(
    initialApprenticeId && myApprentices.some((a) => a.id === initialApprenticeId) ? initialApprenticeId : myApprentices[0]?.id ?? ''
  );
  const [skillId, setSkillIdState] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<string[]>([]);
  const [evidence, setEvidenceState] = useState<Evidence[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [observed, setObserved] = useState(false);
  const [cosignerId, setCosignerId] = useState('');
  const [issued, setIssued] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptSaved, setAttemptSaved] = useState(false);

  const tradeName = trades.find((t) => t.id === me.trade)?.name ?? '';
  const tradeSkills = skills.filter((s) => s.trade === me.trade && s.status === 'active');
  const skill = skills.find((s) => s.id === skillId) ?? null;
  const rubric = skill ? rubricFor(skill.id) : [];
  const apprentice = myApprentices.find((a) => a.id === apprenticeId) ?? null;

  const heldByApprentice = useMemo(() => {
    const map = new Map<string, Credential>();
    credentials.filter((c) => c.apprenticeId === apprenticeId && c.status !== 'revoked').forEach((c) => map.set(c.skillId, c));
    return map;
  }, [credentials, apprenticeId]);

  const mineCount = credentials.filter((c) => c.trainerId === me.id).length;
  const onProbation = mineCount < settings.probationCount;
  const needsCosign = !!skill && (skill.requiresCosign || onProbation);
  const cosignTrainers = trainers.filter((t) => t.approved && t.trade === me.trade && t.id !== me.id && !t.misconductAt);
  const cosignEmployers = employers.filter((e) => e.approved && e.trade === me.trade);
  const todayCount = issuedToday(me.id);
  const overLimit = todayCount >= settings.dailyLimit;
  const risk = riskOf(me.id);
  const trust = trustOf(me.id);

  const checks = {
    skill: !!skill,
    rubric: !!skill && rubric.every((r) => criteria.includes(r)),
    video: evidence.some((e) => e.kind === 'video' && !!e.challengeCode),
    unique: evidence.length > 0 && !evidence.some((e) => isDuplicate(e, evidence, evidenceHashes)),
    observed,
    cosign: !needsCosign || !!cosignerId
  };
  const canIssue = me.approved && me.membershipVerified && !me.misconductAt;
  const ready = canIssue && Object.values(checks).every(Boolean);

  // The code comes from the server and works for one video. Fetch a new one whenever it has been used.
  const newCode = useCallback(async () => {
    try {
      setCode(await requestChallengeCode());
    } catch (e) {
      setCode('');
      setError(messageOf(e));
    }
  }, []);
  useEffect(() => {if (canIssue) void newCode();}, [canIssue, newCode]);

  const setEvidence = (list: Evidence[]) => {
    const addedVideo = list.some((e) => e.kind === 'video' && !evidence.some((x) => x.id === e.id));
    setEvidenceState(list);
    if (addedVideo) void newCode();
  };
  const canRecordNotYet = !!skill && criteria.length < rubric.length && canIssue;

  const setSkillId = (id: string) => {
    setSkillIdState(id);
    setCriteria([]);
    setAttemptSaved(false);
  };
  const toggleCriterion = (c: string) => setCriteria((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  const selectApprentice = (id: string) => {
    setApprenticeId(id);
    setSkillIdState(null);
    setCriteria([]);
    setIssued(null);
    setObserved(false);
    setError(null);
  };

  const submit = async () => {
    if (!ready || !skill || busy) return;
    setBusy(true);
    const res = await issueCredential({ trainerId: me.id, apprenticeId, skillId: skill.id, evidence, criteriaMet: criteria, note, cosignRequestedFrom: needsCosign ? cosignerId : undefined }, me.name);
    setBusy(false);
    if (res.error) return setError(res.error);
    setError(null);
    setIssued(res.credential ?? null);
  };

  const saveNotYet = () => {
    if (!skill) return;
    recordAttempt(me.id, apprenticeId, skill.id, criteria);
    setAttemptSaved(true);
    setSkillIdState(null);
    setCriteria([]);
  };

  const reset = () => {
    setSkillIdState(null);
    setCriteria([]);
    setEvidenceState([]);
    setNote('');
    setObserved(false);
    setCosignerId('');
    setIssued(null);
    setError(null);
    void newCode();
  };

  return {
    me, tradeName, myApprentices, apprentice, apprenticeId, selectApprentice,
    tradeSkills, skill, skillId, setSkillId, heldByApprentice, rubric, criteria, toggleCriterion,
    evidence, setEvidence, code, evidenceHashes, note, setNote, observed, setObserved,
    needsCosign, onProbation, mineCount, cosignTrainers, cosignEmployers, cosignerId, setCosignerId,
    dailyLimit: settings.dailyLimit, probationCount: settings.probationCount, todayCount, overLimit, risk, trust,
    checks, canIssue, ready, busy, submit, issued, reset, error, canRecordNotYet, saveNotYet, attemptSaved
  };
}