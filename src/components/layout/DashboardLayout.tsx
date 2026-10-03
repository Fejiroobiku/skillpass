import React from 'react';
import { Outlet } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

export function DashboardLayout() {
  return (
    <div className="min-h-full w-full bg-canvas">
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 md:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
        <footer className="no-print hidden border-t border-line bg-white px-8 py-4 text-xs text-ink-muted lg:flex lg:items-center lg:justify-between">
          <p className="flex items-center gap-2"><LockIcon className="h-3.5 w-3.5" aria-hidden="true" /> Credentials are server-signed. Every issue, flag and revoke is written to an append-only audit log.</p>
          <p>SkillPass pilot · Lagos 2026 · NDPA 2023 compliant</p>
        </footer>
      </div>
      <BottomNav />
    </div>);

}