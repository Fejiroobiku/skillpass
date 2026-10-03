import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BellIcon, ClipboardListIcon, UserRoundIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { homeByRole, navByRole } from '../../data/navigation';
import { Logo } from '../Logo';
import { SidebarMeter } from './SidebarMeter';

export const navLinkClass = ({ isActive }: {isActive: boolean;}) =>
`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
isActive ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`;


export function Sidebar() {
  const { user } = useAuth();
  const { notifications } = useSkillPass();
  if (!user) return null;
  const nav = navByRole[user.role];
  const unread = notifications.filter((n) => n.userId === user.id && !n.read).length;
  const account = [
  { to: '/notifications', label: 'Notifications', icon: BellIcon, badge: unread },
  { to: '/profile', label: 'My profile', icon: UserRoundIcon, badge: 0 },
  { to: '/survey', label: 'Usability survey', icon: ClipboardListIcon, badge: 0 }].
  filter((a) => !nav.some((n) => n.to === a.to));

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-white lg:flex">
      <Link to={homeByRole[user.role]} className="flex h-16 items-center border-b border-line px-5">
        <Logo />
      </Link>
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-5">
        <p className="px-3 text-xs font-medium text-ink-subtle">Workspace</p>
        <nav aria-label="Main" className="mt-2 flex flex-col gap-0.5">
          {nav.map((item) =>
          <NavLink key={item.to} to={item.to} end className={navLinkClass}>
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          )}
        </nav>
        <p className="mt-7 px-3 text-xs font-medium text-ink-subtle">Account</p>
        <nav aria-label="Account" className="mt-2 flex flex-col gap-0.5">
          {account.map((item) =>
          <NavLink key={item.to} to={item.to} end className={navLinkClass}>
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && <span className="rounded-full bg-brand-100 px-2 text-xs font-semibold text-brand-800">{item.badge}</span>}
            </NavLink>
          )}
        </nav>
        <div className="mt-auto pt-6">
          <SidebarMeter />
        </div>
      </div>
    </aside>);

}