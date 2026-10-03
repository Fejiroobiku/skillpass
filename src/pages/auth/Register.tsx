import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BriefcaseIcon, GraduationCapIcon, HardHatIcon } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';
import { useAuth, type RegisterInput } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { places } from '../../data/people';
import { associations } from '../../data/integrity';
import { homeByRole } from '../../data/navigation';

const input = 'mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const roles = [
{ id: 'apprentice' as const, label: 'Apprentice', icon: GraduationCapIcon },
{ id: 'trainer' as const, label: 'Trainer', icon: HardHatIcon },
{ id: 'employer' as const, label: 'Employer', icon: BriefcaseIcon }];


export function Register() {
  const { register } = useAuth();
  const { trades, trainers } = useSkillPass();
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterInput['role']>('apprentice');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', dob: '', trade: trades[0]?.id ?? '', place: 'balogun', trainerId: '', workshop: '', company: '', membershipNo: '' });
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'trade' ? { trainerId: '' } : {}) }));
    setError(null);
  };
  const tradeTrainers = trainers.filter((t) => t.trade === form.trade && t.approved);

  const valid =
  form.name.trim().length > 2 &&
  /\S+@\S+\.\S+/.test(form.email) &&
  form.phone.trim().length >= 10 &&
  form.password.length >= 8 &&
  !!form.dob &&
  adult &&
  consent && (
  role !== 'apprentice' || !!form.trainerId) && (
  role !== 'employer' || form.company.trim().length > 1) && (
  role !== 'trainer' || form.membershipNo.trim().length > 3);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const err = register({ role, name: form.name.trim(), email: form.email, phone: form.phone.trim(), password: form.password, dob: form.dob, trade: form.trade, location: places[form.place], trainerId: form.trainerId, workshop: form.workshop.trim(), company: form.company.trim(), membershipNo: form.membershipNo.trim() });
    if (err) return setError(err);
    navigate(homeByRole[role]);
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Join the SkillPass pilot</h1>
      <p className="mt-1 text-sm text-ink-muted">Open to participants aged 18 and above in Lagos State.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <fieldset>
          <legend className="text-sm font-semibold text-ink">I am a…</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {roles.map((r) =>
            <button key={r.id} type="button" aria-pressed={role === r.id} onClick={() => setRole(r.id)} className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-medium transition-colors duration-150 ${role === r.id ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-line text-ink hover:bg-canvas'}`}>
                <r.icon className="h-5 w-5" /> {r.label}
              </button>
            )}
          </div>
          {role === 'trainer' && <p className="mt-2 text-xs text-ink-muted">An administrator approves new trainers before they can issue credentials.</p>}
        </fieldset>

        <div><label htmlFor="r-name" className="text-sm font-semibold text-ink">Full name</label><input id="r-name" value={form.name} onChange={set('name')} className={input} autoComplete="name" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="r-email" className="text-sm font-semibold text-ink">Email</label><input id="r-email" type="email" value={form.email} onChange={set('email')} className={input} autoComplete="email" /></div>
          <div><label htmlFor="r-phone" className="text-sm font-semibold text-ink">Phone (for SMS)</label><input id="r-phone" type="tel" value={form.phone} onChange={set('phone')} placeholder="0803 000 0000" className={input} autoComplete="tel" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="r-pass" className="text-sm font-semibold text-ink">Password</label><input id="r-pass" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" className={input} autoComplete="new-password" /></div>
          <div><label htmlFor="r-dob" className="text-sm font-semibold text-ink">Date of birth</label><input id="r-dob" type="date" value={form.dob} onChange={set('dob')} className={input} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-trade" className="text-sm font-semibold text-ink">Trade</label>
            <select id="r-trade" value={form.trade} onChange={set('trade')} className={input}>{trades.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </div>
          <div>
            <label htmlFor="r-place" className="text-sm font-semibold text-ink">Location</label>
            <select id="r-place" value={form.place} onChange={set('place')} className={input}>{Object.entries(places).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}</select>
          </div>
        </div>
        {role === 'apprentice' &&
        <div>
            <label htmlFor="r-trainer" className="text-sm font-semibold text-ink">Your trainer</label>
            <select id="r-trainer" value={form.trainerId} onChange={set('trainerId')} className={input}>
              <option value="">{tradeTrainers.length ? 'Choose your master craftsperson' : 'No approved trainers in this trade yet'}</option>
              {tradeTrainers.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.workshop}</option>)}
            </select>
          </div>
        }
        {role === 'trainer' &&
        <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="r-workshop" className="text-sm font-semibold text-ink">Workshop name</label><input id="r-workshop" value={form.workshop} onChange={set('workshop')} className={input} /></div>
            <div>
              <label htmlFor="r-member" className="text-sm font-semibold text-ink">Association membership no.</label>
              <input id="r-member" value={form.membershipNo} onChange={set('membershipNo')} placeholder="e.g. ECAN/LA/0000" className={input} />
            </div>
            <p className="text-xs text-ink-muted sm:col-span-2">Required: {associations.find((a) => a.trade === form.trade)?.name ?? 'your trade association'}. They vouch for you and can discipline misconduct.</p>
          </div>
        }
        {role === 'employer' && <div><label htmlFor="r-company" className="text-sm font-semibold text-ink">Company or business name</label><input id="r-company" value={form.company} onChange={set('company')} className={input} /></div>}

        <div className="space-y-2.5 rounded-xl bg-canvas p-4 text-sm">
          <label className="flex gap-3"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" /><span className="text-ink">I am 18 years or older.</span></label>
          <label className="flex gap-3"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" /><span className="text-ink">I consent to SkillPass processing my name, phone, trade, location and evidence photos for this pilot, under the Nigeria Data Protection Act 2023. I can withdraw at any time from my profile.</span></label>
        </div>

        {error && <p role="alert" className="rounded-xl bg-bad-50 px-3.5 py-2.5 text-sm font-medium text-bad-700">{error}</p>}
        <button type="submit" disabled={!valid} className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-50">Create account</button>
      </form>
      <p className="mt-5 text-center text-sm text-ink-muted">Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link></p>
    </AuthLayout>);

}