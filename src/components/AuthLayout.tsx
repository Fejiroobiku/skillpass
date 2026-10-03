import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheckIcon, SearchCheckIcon, ShieldCheckIcon } from 'lucide-react';
import { Logo } from './Logo';
import { evidencePhotos } from '../data/evidence';

const points = [
{ icon: BadgeCheckIcon, text: 'Trainers sign skills they watched, with photo or video evidence.' },
{ icon: ShieldCheckIcon, text: 'Co-signatures, audits and flags keep every credential honest.' },
{ icon: SearchCheckIcon, text: 'Employers verify a skill in under a minute — no login needed.' }];


export function AuthLayout({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex min-h-full w-full bg-white">
      <aside className="relative hidden w-[44%] max-w-[560px] flex-col justify-between overflow-hidden bg-brand-800 p-10 text-white lg:flex">
        <Logo inverted />
        <div>
          <img src={evidencePhotos.electrical} alt="An apprentice electrician wiring a distribution board" className="mb-8 aspect-[4/3] w-full rounded-2xl object-cover" />
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">A skills passport for Nigeria's informal apprentices.</h2>
          <ul className="mt-6 space-y-3">
            {points.map((p) =>
            <li key={p.text} className="flex gap-3 text-sm text-brand-100"><p.icon className="h-5 w-5 shrink-0 text-white" />{p.text}</li>
            )}
          </ul>
        </div>
        <p className="text-xs text-brand-100">Lagos pilot · Balogun, Agungi, Ladipo · 2026</p>
      </aside>
      <main className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-between px-5 md:px-8">
          <span className="lg:hidden"><Logo compact /></span>
          <Link to="/verify" className="ml-auto text-sm font-medium text-ink-muted hover:text-ink">Verify a credential →</Link>
        </div>
        <div className="flex flex-1 items-start justify-center px-5 pb-12 pt-4 md:items-center md:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>);

}