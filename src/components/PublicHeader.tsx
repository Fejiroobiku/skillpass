import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { homeByRole } from '../data/navigation';
import { Logo } from './Logo';

export function PublicHeader() {
  const { user } = useAuth();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
        <Link to="/verify" aria-label="SkillPass verification"><Logo compact /></Link>
        <nav aria-label="Public" className="flex items-center gap-1 text-sm">
          <Link to="/verify" className="rounded-lg px-3 py-2 font-medium text-ink-muted hover:bg-canvas hover:text-ink">Verify</Link>
          {user ?
          <Link to={homeByRole[user.role]} className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Dashboard</Link> :

          <>
              <Link to="/login" className="rounded-lg px-3 py-2 font-medium text-ink-muted hover:bg-canvas hover:text-ink">Sign in</Link>
              <Link to="/register" className="rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white transition-colors duration-150 hover:bg-brand-700">Join pilot</Link>
            </>
          }
        </nav>
      </div>
    </header>);

}