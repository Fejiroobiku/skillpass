import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth } from '../../contexts/AuthContext';
import { demoMode } from '../../api/client';
import { DEMO_PASSWORD, demoLogins } from '../../data/accounts';

const input = 'mt-1.5 w-full rounded-xl border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async (em: string, pw: string) => {
    setBusy(true);
    const err = await login(em, pw);
    setBusy(false);
    if (err) return setError(err);
    navigate('/'); // the home route sends each role to its own dashboard
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">Welcome back to SkillPass.</p>

      <form onSubmit={(e) => {e.preventDefault();go(email, password);}} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-ink">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => {setEmail(e.target.value);setError(null);}} className={input} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-semibold text-ink">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => {setPassword(e.target.value);setError(null);}} className={`${input} pr-11`} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 rounded-lg p-1.5 text-ink-muted hover:text-ink">
              {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p role="alert" className="rounded-xl bg-bad-50 px-3.5 py-2.5 text-sm font-medium text-bad-700">{error}</p>}
        <button type="submit" disabled={!email || !password || busy} className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-muted">New to the pilot? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create an account</Link></p>

      {demoMode &&
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-sm font-semibold text-ink">Demo accounts</p>
        <p className="text-xs text-ink-muted">Password for all: <span className="font-mono">{DEMO_PASSWORD}</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {demoLogins.map((d) =>
          <button key={d.email} type="button" onClick={() => go(d.email, DEMO_PASSWORD)} className="rounded-xl border border-line px-3 py-2.5 text-left transition-colors duration-150 hover:border-brand-300 hover:bg-brand-50">
              <span className="block text-sm font-semibold text-ink">{d.label}</span>
              <span className="block truncate text-xs text-ink-muted">{d.hint}</span>
            </button>
          )}
        </div>
      </div>
      }
    </AuthLayout>);

}