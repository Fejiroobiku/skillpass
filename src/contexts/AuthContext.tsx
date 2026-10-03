import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Account, AccountStatus, Place, Role } from '../types/skillpass';
import { seedAccounts } from '../data/accounts';
import { useSkillPass } from './SkillPassContext';
import { ageFrom, signPayload } from '../utils/credentials';
import { roleLabel } from '../data/navigation';
import { useScreenInit } from '../useScreenInit.js';
import { associations } from '../data/integrity';

export interface RegisterInput {
  role: Exclude<Role, 'admin'>;
  name: string;
  email: string;
  phone: string;
  password: string;
  dob: string;
  trade: string;
  location: Place;
  trainerId?: string;
  workshop?: string;
  company?: string;
  membershipNo?: string;
}

export interface CurrentUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  title: string;
  account: Account;
}

interface AuthState {
  accounts: Account[];
  user: CurrentUser | null;
  login: (email: string, password: string) => string | null;
  register: (input: RegisterInput) => string | null;
  logout: () => void;
  setAccountStatus: (id: string, status: AccountStatus, actor: string) => void;
  withdrawConsent: () => void;
}

const SESSION_KEY = 'skillpass.session';
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const sp = useSkillPass();
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const screenInit = useScreenInit() as {session?: string | null;};
  const isScreen = 'session' in screenInit;
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (isScreen) return screenInit.session ?? null;
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isScreen) return;
    try {
      if (sessionId) window.localStorage.setItem(SESSION_KEY, sessionId);else
      window.localStorage.removeItem(SESSION_KEY);
    } catch {

      /* storage unavailable */}
  }, [sessionId, isScreen]);

  const account = accounts.find((a) => a.id === sessionId && a.status === 'active') ?? null;

  const user = useMemo<CurrentUser | null>(() => {
    if (!account) return null;
    const tradeName = (id?: string) => sp.trades.find((t) => t.id === id)?.name ?? '';
    let title = roleLabel[account.role];
    if (account.role === 'trainer') title = `Trainer · ${tradeName(sp.trainers.find((t) => t.id === account.id)?.trade)}`;
    if (account.role === 'apprentice') title = `Apprentice · ${tradeName(sp.apprentices.find((a) => a.id === account.id)?.trade)}`;
    if (account.role === 'employer') title = sp.employers.find((e) => e.id === account.id)?.company ?? 'Employer';
    if (account.role === 'admin') title = 'Pilot Administrator';
    return { id: account.id, role: account.role, name: sp.nameOf(account.id), email: account.email, title, account };
  }, [account, sp]);

  const login = useCallback(
    (email: string, password: string) => {
      const acct = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      if (!acct) return 'No account found with that email.';
      if (acct.passwordHash !== signPayload(password)) return 'Incorrect password. Please try again.';
      if (acct.status === 'suspended') return 'This account is suspended. Contact the pilot administrator.';
      if (acct.status === 'withdrawn') return 'Consent was withdrawn for this account, so it has been closed.';
      setSessionId(acct.id);
      sp.log(sp.nameOf(acct.id), 'account.login', acct.email, `Signed in as ${roleLabel[acct.role]}`);
      return null;
    },
    [accounts, sp]
  );

  const register = useCallback(
    (input: RegisterInput) => {
      if (accounts.some((a) => a.email.toLowerCase() === input.email.trim().toLowerCase())) return 'An account with this email already exists.';
      if (ageFrom(input.dob) < 18) return 'SkillPass pilot participants must be 18 or older.';
      const prefix = input.role === 'trainer' ? 't' : input.role === 'apprentice' ? 'a' : 'e';
      const id = `${prefix}${Date.now().toString(36)}`;
      const today = new Date().toISOString();
      if (input.role === 'trainer') {
        sp.addTrainer({ id, name: input.name, trade: input.trade, workshop: input.workshop || `${input.name.split(' ')[0]}'s Workshop`, location: input.location, phone: input.phone, approved: false, joinedAt: today, associationId: associations.find((a) => a.trade === input.trade)?.id ?? '', membershipNo: input.membershipNo ?? '', membershipVerified: false });
      } else if (input.role === 'apprentice') {
        sp.addApprentice({ id, name: input.name, trade: input.trade, trainerId: input.trainerId ?? '', location: input.location, phone: input.phone, startedAt: today });
      } else {
        sp.addEmployer({ id, name: input.name, company: input.company || input.name, trade: input.trade, location: input.location, phone: input.phone, approved: false });
      }
      setAccounts((prev) => [...prev, { id, email: input.email.trim(), passwordHash: signPayload(input.password), role: input.role, status: 'active', createdAt: today, consentAt: today, dob: input.dob }]);
      sp.log(input.name, 'account.registered', input.email, `${roleLabel[input.role]} · consent recorded (NDPA 2023)`);
      setSessionId(id);
      return null;
    },
    [accounts, sp]
  );

  const logout = useCallback(() => setSessionId(null), []);

  const setAccountStatus = useCallback(
    (id: string, status: AccountStatus, actor: string) => {
      setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
      sp.log(actor, status === 'suspended' ? 'account.suspended' : 'account.reactivated', sp.nameOf(id), status === 'suspended' ? 'Account suspended' : 'Account reactivated');
      if (status === 'active') sp.notify(id, 'Account reactivated', 'Your SkillPass account is active again.', undefined, ['sms']);
    },
    [sp]
  );

  const withdrawConsent = useCallback(() => {
    if (!account) return;
    setAccounts((prev) => prev.map((a) => a.id === account.id ? { ...a, status: 'withdrawn' } : a));
    sp.log(sp.nameOf(account.id), 'consent.withdrawn', account.email, 'Participant withdrew consent; personal data scheduled for deletion');
    setSessionId(null);
  }, [account, sp]);

  const value = useMemo(() => ({ accounts, user, login, register, logout, setAccountStatus, withdrawConsent }), [accounts, user, login, register, logout, setAccountStatus, withdrawConsent]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}