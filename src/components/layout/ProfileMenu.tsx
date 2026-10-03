import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, ChevronDownIcon, ClipboardListIcon, IdCardIcon, LogOutIcon, SearchCheckIcon, UserRoundIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDismiss } from '../../hooks/useDismiss';
import { initials } from '../../utils/credentials';
import { roleLabel } from '../../data/navigation';

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const navigate = useNavigate();
  if (!user) return null;

  const items = [
  { to: '/profile', label: 'My profile', icon: UserRoundIcon },
  ...(user.role === 'apprentice' ? [{ to: `/passport/${user.id}`, label: 'Public passport', icon: IdCardIcon }] : []),
  { to: '/notifications', label: 'Notifications', icon: BellIcon },
  { to: '/survey', label: 'Usability survey', icon: ClipboardListIcon },
  { to: '/verify', label: 'Public verification', icon: SearchCheckIcon }];


  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initials(user.name)}</span>
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-semibold leading-tight text-ink">{user.name}</span>
          <span className="block text-xs leading-tight text-ink-muted">{roleLabel[user.role]}</span>
        </span>
        <ChevronDownIcon className={`hidden h-4 w-4 text-ink-muted transition-transform duration-150 md:block ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-12 z-40 w-64 origin-top-right overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          
            <div className="border-b border-line px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
              <p className="mt-1 truncate text-xs text-ink-subtle">{user.title}</p>
            </div>
            <div className="py-1.5">
              {items.map((i) =>
            <Link key={i.to} role="menuitem" to={i.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-ink transition-colors duration-150 hover:bg-canvas">
                  <i.icon className="h-4 w-4 text-ink-muted" /> {i.label}
                </Link>
            )}
            </div>
            <div className="border-t border-line py-1.5">
              <button
              role="menuitem"
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm font-medium text-bad-700 transition-colors duration-150 hover:bg-bad-50">
              
                <LogOutIcon className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}