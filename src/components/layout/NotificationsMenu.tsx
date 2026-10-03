import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, MessageSquareTextIcon, MonitorSmartphoneIcon } from 'lucide-react';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { useDismiss } from '../../hooks/useDismiss';
import { timeAgo } from '../../utils/credentials';

export function NotificationsMenu({ userId }: {userId: string;}) {
  const { notifications, markRead, markAllRead } = useSkillPass();
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const navigate = useNavigate();
  const mine = notifications.filter((n) => n.userId === userId);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        
        <BellIcon className="h-5 w-5" />
        {unread > 0 &&
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">{unread}</span>
        }
      </button>
      <AnimatePresence>
        {open &&
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-12 z-40 w-[min(92vw,380px)] origin-top-right overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-semibold text-ink">Notifications</p>
              {unread > 0 &&
            <button type="button" onClick={() => markAllRead(userId)} className="text-sm font-medium text-brand-700 hover:underline">Mark all read</button>
            }
            </div>
            <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
              {mine.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-muted">You're all caught up.</li>}
              {mine.slice(0, 6).map((n) =>
            <li key={n.id}>
                  <button
                type="button"
                onClick={() => {
                  markRead(n.id);
                  setOpen(false);
                  if (n.link) navigate(n.link);
                }}
                className={`flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-canvas ${n.read ? '' : 'bg-brand-50/60'}`}>
                
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted">
                      {n.channel === 'sms' ? <MessageSquareTextIcon className="h-4 w-4" /> : <MonitorSmartphoneIcon className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{n.title}</span>
                        <span className="shrink-0 text-xs text-ink-subtle">{timeAgo(n.at)}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-ink-muted">{n.body}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
                  </button>
                </li>
            )}
            </ul>
            <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-canvas">
              View all notifications
            </Link>
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}