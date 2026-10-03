import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { Role } from './types/skillpass';
import { SkillPassProvider } from './contexts/SkillPassContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { homeByRole } from './data/navigation';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { PublicVerify } from './pages/public/PublicVerify';
import { PublicPassport } from './pages/public/PublicPassport';
import { TrainerDashboard } from './pages/trainer/TrainerDashboard';
import { IssueCredential } from './pages/trainer/IssueCredential';
import { TrainerCredentials } from './pages/trainer/TrainerCredentials';
import { TrainerApprentices } from './pages/trainer/TrainerApprentices';
import { TrainerSkills } from './pages/trainer/TrainerSkills';
import { SkillsPassport } from './pages/apprentice/SkillsPassport';
import { JobReferrals } from './pages/apprentice/JobReferrals';
import { ConfirmSkills } from './pages/apprentice/ConfirmSkills';
import { EmployerDashboard } from './pages/employer/EmployerDashboard';
import { EmployerJobs } from './pages/employer/EmployerJobs';
import { EmployerFeedback } from './pages/employer/EmployerFeedback';
import { AdminMetrics } from './pages/admin/AdminMetrics';
import { ReviewQueue } from './pages/admin/ReviewQueue';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminSkills } from './pages/admin/AdminSkills';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AuditLog } from './pages/AuditLog';
import { Profile } from './pages/shared/Profile';
import { Notifications } from './pages/shared/Notifications';
import { UsabilitySurvey } from './pages/shared/UsabilitySurvey';

function RequireAuth() {
  const { user } = useAuth();
  return user ? <DashboardLayout /> : <Navigate to="/login" replace />;
}

function RoleGuard({ role }: {role: Role;}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === role ? <Outlet /> : <Navigate to={homeByRole[user.role]} replace />;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeByRole[user.role] : '/login'} replace />;
}

function GuestOnly({ children }: {children: React.ReactNode;}) {
  const { user } = useAuth();
  return user ? <Navigate to={homeByRole[user.role]} replace /> : <>{children}</>;
}

export function App() {
  return (
    <SkillPassProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/verify" element={<PublicVerify />} />
            <Route path="/verify/:id" element={<PublicVerify />} />
            <Route path="/passport/:id" element={<PublicPassport />} />

            <Route element={<RequireAuth />}>
              <Route path="/trainer" element={<RoleGuard role="trainer" />}>
                <Route index element={<TrainerDashboard />} />
                <Route path="issue" element={<IssueCredential />} />
                <Route path="credentials" element={<TrainerCredentials />} />
                <Route path="apprentices" element={<TrainerApprentices />} />
                <Route path="skills" element={<TrainerSkills />} />
              </Route>
              <Route path="/apprentice" element={<RoleGuard role="apprentice" />}>
                <Route index element={<SkillsPassport />} />
                <Route path="confirm" element={<ConfirmSkills />} />
                <Route path="jobs" element={<JobReferrals />} />
              </Route>
              <Route path="/employer" element={<RoleGuard role="employer" />}>
                <Route index element={<EmployerDashboard />} />
                <Route path="jobs" element={<EmployerJobs />} />
                <Route path="feedback" element={<EmployerFeedback />} />
              </Route>
              <Route path="/admin" element={<RoleGuard role="admin" />}>
                <Route index element={<AdminMetrics />} />
                <Route path="review" element={<ReviewQueue />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="skills" element={<AdminSkills />} />
                <Route path="audit" element={<AuditLog />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/survey" element={<UsabilitySurvey />} />
            </Route>

            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SkillPassProvider>);

}