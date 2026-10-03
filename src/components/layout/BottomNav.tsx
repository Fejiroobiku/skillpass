import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, ClipboardListIcon, MoreHorizontalIcon, UserRoundIcon, XIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { navByRole } from '../../data/navigation';
import { navLinkClass } from './Sidebar';

const MAX_TABS = 4;

export function BottomNav() {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  if (!user) return null;

  const nav = navByRole[user.role];
  const tabs = nav.slice(0, MAX_TABS);
  const extra = [
  ...nav.slice(MAX_TABS),
  ...[
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/profile', label: 'My profile', icon: UserRoundIcon },
  { to: '/survey', label: 'Usability survey', icon: ClipboardListIcon }].
  filter((a) => !nav.some((n) => n.to === a.to))];

  const moreActive = extra.some((e) => e.to === pathname);

  return (
    <>
      <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="mx-auto grid max-w-2xl" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((t) =>
          <li key={t.to}>
              <NavLink to={t.to} end className={({ isActive }) => `flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium transition-colors duration-150 ${isActive ? 'text-brand-700' : 'text-ink-muted'}`}>
                {({ isActive }) =>
              <>
                    <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150 ${isActive ? 'bg-brand-100' : ''}`}>
                      <t.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="max-w-full truncate">{t.short ?? t.label}</span>
                  </>
              }
              </NavLink>
            </li>
          )}
          <li>
            <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className={`flex w-full flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-medium ${moreActive ? 'text-brand-700' : 'text-ink-muted'}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-brand-100' : ''}`}>
                <MoreHorizontalIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen &&
        <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={() => setMoreOpen(false)}>
            <motion.div
            role="dialog"
            aria-label="More"
            className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            onClick={(e) => e.stopPropagation()}>
            
              <div className="mb-2 flex items-center justify-between px-2">
                <p className="font-semibold text-ink">More</p>
                <button type="button" aria-label="Close" onClick={() => setMoreOpen(false)} className="rounded-full p-2 text-ink-muted hover:bg-canvas"><XIcon className="h-5 w-5" /></button>
              </div>
              <div className="flex flex-col gap-0.5">
                {extra.map((item) =>
              <NavLink key={item.to} to={item.to} end onClick={() => setMoreOpen(false)} className={navLinkClass}>
                    <item.icon className="h-5 w-5" aria-hidden="true" /> {item.label}
                  </NavLink>
              )}
              </div>
            </motion.div>
          </motion.div>
        }
      </AnimatePresence>
    </>);

}