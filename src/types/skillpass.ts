export type Role = 'trainer' | 'apprentice' | 'employer' | 'admin';

export type TradeId = string;

export type SkillLevel = 'Foundation' | 'Intermediate' | 'Advanced';

export interface Trade {
  id: TradeId;
  name: string;
}

export interface Skill {
  id: string;
  trade: TradeId;
  name: string;
  level: SkillLevel;
  requiresCosign: boolean;
  status: 'active' | 'proposed' | 'rejected';
  proposedBy?: string;
}

export interface Place {
  name: string;
  lat: number;
  lng: number;
}

export interface Association {
  id: string;
  name: string;
  trade: TradeId;
}

export interface Assessor {
  id: string;
  name: string;
  organisation: string;
  nsqId?: string;
  trades: TradeId[];
}

export interface Trainer {
  id: string;
  name: string;
  trade: TradeId;
  workshop: string;
  location: Place;
  phone: string;
  approved: boolean;
  joinedAt: string;
  associationId: string;
  membershipNo: string;
  membershipVerified: boolean;
  misconductAt?: string;
  misconductReason?: string;
}

export interface Apprentice {
  id: string;
  name: string;
  trade: TradeId;
  trainerId: string;
  location: Place;
  phone: string;
  startedAt: string;
}

export interface Employer {
  id: string;
  name: string;
  company: string;
  trade: TradeId;
  location: Place;
  phone: string;
  approved: boolean;
}

export type AccountStatus = 'active' | 'suspended' | 'withdrawn';

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
  consentAt: string;
  dob: string;
}

export type CredentialStatus = 'pending_apprentice' | 'pending_cosign' | 'held_review' | 'valid' | 'flagged' | 'under_review' | 'revoked';

export interface Evidence {
  id: string;
  kind: 'photo' | 'video';
  url: string;
  caption: string;
  capturedAt: string;
  locationLabel: string;
  lat?: number;
  lng?: number;
  hash: string;
  challengeCode?: string;
  durationSec?: number;
  source: 'camera' | 'demo';
  poster?: string;
}

export interface Credential {
  id: string;
  apprenticeId: string;
  trainerId: string;
  skillId: string;
  issuedAt: string;
  evidence: Evidence[];
  status: CredentialStatus;
  criteriaMet: string[];
  needsCosign: boolean;
  cosignReason?: 'advanced' | 'probation';
  cosignerId?: string;
  cosignRequestedFrom?: string;
  apprenticeConfirmedAt?: string;
  heldForReview?: boolean;
  heldCleared?: boolean;
  signature: string;
  note: string;
  revokeReason?: string;
}

export interface Attempt {
  id: string;
  trainerId: string;
  apprenticeId: string;
  skillId: string;
  criteriaMet: string[];
  at: string;
}

export interface Flag {
  id: string;
  credentialId: string;
  raisedBy: string;
  reason: string;
  raisedAt: string;
  status: 'open' | 'upheld' | 'dismissed';
}

export type AuditReason = 'random' | 'risk' | 'probation' | 'misconduct';

export interface AuditSample {
  id: string;
  credentialId: string;
  assessor: string;
  assessorId?: string;
  reason?: AuditReason;
  selectedAt: string;
  result: 'pending' | 'agree' | 'disagree';
}

export type ConcernCategory = 'payment' | 'pressure' | 'false_record' | 'other';

export interface ConcernReport {
  id: string;
  apprenticeId: string;
  trainerId: string;
  category: ConcernCategory;
  details: string;
  at: string;
  status: 'open' | 'investigating' | 'closed';
}

export interface Feedback {
  id: string;
  apprenticeId: string;
  employerId: string;
  credentialIds: string[];
  rating: number;
  comment: string;
  createdAt: string;
  referralId?: string;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  trade: TradeId;
  skillIds: string[];
  location: Place;
  postedAt: string;
  pay: string;
}

export type ReferralStatus = 'sent' | 'accepted' | 'declined' | 'contacted';

export interface Referral {
  id: string;
  jobId: string;
  apprenticeId: string;
  status: ReferralStatus;
  sentAt: string;
}

export type NotificationChannel = 'in_app' | 'sms' | 'email';

export interface AppNotification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  at: string;
  read: boolean;
  link?: string;
}

export interface SusResponse {
  id: string;
  userId: string;
  role: Role;
  score: number;
  at: string;
}

export interface VerificationEvent {
  id: string;
  credentialId: string;
  seconds: number;
  trustRating?: number;
  at: string;
}

export interface Settings {
  dailyLimit: number;
  auditRatePct: number;
  probationCount: number;
  clusterThreshold: number;
  fastMinutes: number;
  smsEnabled: boolean;
  emailEnabled: boolean;
}

export type AuditAction =
'credential.issued' |
'credential.confirmed' |
'credential.disputed' |
'credential.cosigned' |
'credential.held' |
'credential.released' |
'credential.flagged' |
'credential.revoked' |
'credential.under_review' |
'credential.reinstated' |
'assessment.not_yet' |
'evidence.duplicate_blocked' |
'flag.dismissed' |
'audit.selected' |
'audit.assigned' |
'audit.completed' |
'trainer.approved' |
'trainer.rejected' |
'trainer.membership_verified' |
'trainer.misconduct' |
'employer.approved' |
'report.received' |
'report.updated' |
'feedback.added' |
'job.posted' |
'referral.sent' |
'skill.proposed' |
'skill.approved' |
'skill.rejected' |
'skill.added' |
'trade.added' |
'account.registered' |
'account.login' |
'account.suspended' |
'account.reactivated' |
'consent.withdrawn' |
'settings.updated';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  target: string;
  detail: string;
}