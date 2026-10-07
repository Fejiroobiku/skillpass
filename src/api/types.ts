import type { CredentialStatus, Evidence, SkillLevel } from '../types/skillpass';

/** What GET /api/verify/:id returns: the public view of a credential. No contact details, file hashes or GPS points. */
export interface PublicCredential {
  id: string;
  status: CredentialStatus;
  issuedAt: string;
  skill: {id: string;name: string;level: SkillLevel;trade: string;tradeName: string;};
  apprentice: {id: string;name: string;};
  trainer: {id: string;name: string;workshop: string;association: string | null;membershipVerified: boolean;trustScore: number;underReview: boolean;};
  apprenticeConfirmedAt?: string;
  needsCosign: boolean;
  cosignReason?: 'advanced' | 'probation';
  cosigner: {id: string;name: string;} | null;
  criteriaMet: string[];
  rubric: string[];
  note: string;
  revokeReason?: string;
  signature: string;
  /** False means the stored record no longer matches what the server signed. */
  signatureValid: boolean;
  evidence: Omit<Evidence, 'hash' | 'lat' | 'lng'>[];
  history: {at: string;actor: string;action: string;detail: string;}[];
}

/** What GET /api/passport/:id returns: an apprentice's shareable skills passport. */
export interface PublicPassportData {
  apprentice: {id: string;name: string;location: string;trade: string;tradeName: string;startedAt: string;};
  trainer: {id: string;name: string;workshop: string;trustScore: number;underReview: boolean;} | null;
  skills: {id: string;name: string;level: SkillLevel;}[];
  credentials: {id: string;skillId: string;trainerId: string;status: CredentialStatus;issuedAt: string;}[];
  trainers: Record<string, {id: string;name: string;trustScore: number;underReview: boolean;}>;
  ratings: {id: string;rating: number;comment: string;company: string;createdAt: string;}[];
}
