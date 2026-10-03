import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailIcon, MessageSquareTextIcon, MonitorSmartphoneIcon } from 'lucide-react';
import type { NotificationChannel } from '../../types/skillpass';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useSkillPass } from '../../contexts/SkillPassContext';
import { formatDateTime } from '../../utils/credentials';

const icons = { in_app: MonitorSmartphoneIcon, sms: MessageSquareTextIcon, email: MailIcon };
const channelLabel = { in_app: 'In-app', sms: 'SMS', email: 'E-mail' };

export function Notifications() {
  const { user } = useAuth();
  const { notifications, markRead, markAllRead } = useSkillPass();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | NotificationChannel>('all');
  if (!user) return null;
  const mine = notifications.filter((n) => n.userId === user.id);
  const rows = mine.filter((n) => filter === 'all' || n.channel === filter);
  const unread = mine.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="In-app alerts and the SMS messages sent to your phone."
        actions={unread > 0 && <button type="button" onClick={() => markAllRead(user.id)} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas">Mark all read</button>} />
      
      <div role="tablist" aria-label="Channel" className="mb-4 flex gap-1 overflow-x-auto">
        {(['all', 'in_app', 'sms', 'email'] as const).map((f) =>
        <button key={f} role="tab" aria-selected={filter === f} type="button" onClick={() => setFilter(f)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${filter === f ? 'bg-ink text-white' : 'bg-white text-ink-muted ring-1 ring-inset ring-line hover:text-ink'}`}>
            {f === 'all' ? 'All' : channelLabel[f]}
          </button>
        )}
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {rows.length === 0 && <li className="p-10 text-center text-sm text-ink-muted">No notifications here.</li>}
        {rows.map((n) => {
          const Icon = icons[n.channel];
          return (
            <li key={n.id}>
              <button type="button" onClick={() => {markRead(n.id);if (n.link) navigate(n.link);}} className={`flex w-full gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-canvas ${n.read ? '' : 'bg-brand-50/50'}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{n.title}</span>
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">{channelLabel[n.channel]}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{n.body}</span>
                  <span className="mt-1 block text-xs text-ink-subtle">{formatDateTime(n.at)}</span>
                </span>
                {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />}
              </button>
            </li>);

        })}
      </ul>
    </>);

}