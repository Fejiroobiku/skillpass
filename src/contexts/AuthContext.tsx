import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Account, AccountStatus, Place, Role } from '../types/skillpass';
import { api, getToken, messageOf, setToken, setUnauthorizedHandler } from '../api/client';
import { useSkillPass } from './SkillPassContext';

export interface RegisterInput {
  role: Exclude<Role, 'admin'>;
  name: string;
  email: string;
  phone: string;
  password: string;
  dob: string;
  trade: string;
  location: Place;
  consent: boolean;
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
  /** Account facts shown on the profile page. The password hash never leaves the server. */
  account: Account;
}

interface AuthState {
  /** Administrators only: every account, for the user-management page. Empty for everyone else. */
  accounts: Account[];
  user: CurrentUser | null;
  /** False while a saved session is being checked with the server. */
  ready: boolean;
  /** Resolves to an error message, or null when sign-in worked. */
  login: (email: string, password: string) => Promise<string | null>;
  /** Resolves to an error message, or null when the account was created. */
  register: (input: RegisterInput) => Promise<string | null>;
  logout: () => void;
  setAccountStatus: (id: string, status: AccountStatus, actor?: string) => Promise<void>;
  withdrawConsent: () => Promise<void>;
}

interface ApiUser extends Omit<CurrentUser, 'account'> {
  account: {createdAt: string;consentAt: string;dob: string;};
}

interface AdminUserRow {
  id: string;
  email: string;
  role: Role;
  status: AccountStatus;
  createdAt: string;
}

const AuthContext = createContext<AuthState | null>(null);

const toUser = (u: ApiUser): CurrentUser => ({ ...u, account: { id: u.id, email: u.email, passwordHash: '', role: u.role, status: 'active', ...u.account } });

export function AuthProvider({ children }: {children: React.ReactNode;}) {
  const sp = useSkillPass();
  // The store object changes on every render, so callbacks reach it through a ref.
  const spRef = useRef(sp);
  spRef.current = sp;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ready, setReady] = useState(!getToken());

  const loadAccounts = useCallback(async (u: CurrentUser | null) => {
    if (u?.role !== 'admin') return setAccounts([]);
    try {
      const r = await api.get<{users: AdminUserRow[];}>('/api/admin/users');
      setAccounts(r.users.map((x) => ({ id: x.id, email: x.email, passwordHash: '', role: x.role, status: x.status, createdAt: x.createdAt, consentAt: x.createdAt, dob: '' })));
    } catch (e) {
      spRef.current.showNotice(messageOf(e));
    }
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setAccounts([]);
    spRef.current.reset();
  }, []);

  // Restore a saved session when the page loads. Signed-out visitors just get the public data.
  useEffect(() => {
    setUnauthorizedHandler(signOut);
    if (!getToken()) {
      void spRef.current.loadPublic();
      return;
    }
    (async () => {
      try {
        const r = await api.get<{user: ApiUser;}>('/api/auth/me');
        const me = toUser(r.user);
        await Promise.all([spRef.current.load(), loadAccounts(me)]);
        setUser(me);
      } catch {
        setToken(null);
        await spRef.current.loadPublic();
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [signOut, loadAccounts]);

  // Pick up other people's actions (a trainer issues, an apprentice confirms) without a manual reload.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const tick = () => {if (!document.hidden) void spRef.current.refresh();};
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', tick);
    };
  }, [userId]);

  const start = useCallback(async (r: {token: string;user: ApiUser;}) => {
    setToken(r.token);
    const me = toUser(r.user);
    await Promise.all([spRef.current.load(), loadAccounts(me)]);
    setUser(me);
  }, [loadAccounts]);

  const login = useCallback(async (email: string, password: string) => {
    setToken(null); // a stale token must not be sent with the sign-in request
    try {
      await start(await api.post('/api/auth/login', { email, password }));
      return null;
    } catch (e) {
      setToken(null);
      return messageOf(e);
    }
  }, [start]);

  const register = useCallback(async (input: RegisterInput) => {
    setToken(null);
    try {
      await start(await api.post('/api/auth/register', input));
      return null;
    } catch (e) {
      setToken(null);
      return messageOf(e);
    }
  }, [start]);

  const setAccountStatus = useCallback(async (id: string, status: AccountStatus) => {
    try {
      await api.post(`/api/admin/users/${id}/status`, { status });
      await Promise.all([loadAccounts(user), spRef.current.refresh()]);
    } catch (e) {
      spRef.current.showNotice(messageOf(e));
    }
  }, [user, loadAccounts]);

  const withdrawConsent = useCallback(async () => {
    try {
      await api.post('/api/auth/withdraw-consent');
      signOut();
    } catch (e) {
      spRef.current.showNotice(messageOf(e));
    }
  }, [signOut]);

  const value = useMemo(
    () => ({ accounts, user, ready, login, register, logout: signOut, setAccountStatus, withdrawConsent }),
    [accounts, user, ready, login, register, signOut, setAccountStatus, withdrawConsent]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
