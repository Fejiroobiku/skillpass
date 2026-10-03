import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { navByRole, homeByRole, roleLabel } from '../../data/navigation';
import { Logo } from '../Logo';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';

const sharedTitles: Record<string, string> = { '/notifications': 'Notifications', '/profile': 'My Profile', '/survey': 'Usability Survey' };

export function Topbar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  if (!user) return null;

  const current = navByRole[user.role].find((n) => n.to === pathname)?.label ?? sharedTitles[pathname] ?? '';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = q.trim().toUpperCase();
    if (id) {
      navigate(`/verify/${id}`);
      setQ('');
    }
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6 lg:px-8">
        <Link to={homeByRole[user.role]} className="lg:hidden" aria-label="SkillPass home">
          <Logo compact />
        </Link>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 lg:block">
          <ol className="flex items-center gap-2 text-sm">
            <li><Link to={homeByRole[user.role]} className="text-ink-muted hover:text-ink">{roleLabel[user.role]}</Link></li>
            {current &&
            <>
                <li aria-hidden="true" className="text-ink-subtle">/</li>
                <li className="truncate font-semibold text-ink" aria-current="page">{current}</li>
              </>
            }
          </ol>
        </nav>

        <form onSubmit={submit} role="search" className="ml-auto hidden w-full max-w-xs md:block lg:mx-auto lg:max-w-sm">
          <label htmlFor="topbar-verify" className="sr-only">Verify a credential ID</label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <input
              id="topbar-verify"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Verify credential ID, e.g. SP-2BNC-8QPE"
              className="h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100" />
            
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link to="/verify" aria-label="Verify a credential" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink md:hidden">
            <SearchIcon className="h-5 w-5" />
          </Link>
          <NotificationsMenu userId={user.id} />
          <span className="mx-1 hidden h-6 w-px bg-line md:block" aria-hidden="true" />
          <ProfileMenu />
        </div>
      </div>
    </header>);

}