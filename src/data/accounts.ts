import type { Account, Role } from '../types/skillpass';
import { signPayload } from '../utils/credentials';

export const DEMO_PASSWORD = 'demo1234';

const mk = (id: string, email: string, role: Role, createdAt: string): Account => ({
  id,
  email,
  passwordHash: signPayload(DEMO_PASSWORD),
  role,
  status: 'active',
  createdAt,
  consentAt: createdAt,
  dob: '1996-05-14'
});

export const seedAccounts: Account[] = [
mk('ad1', 'admin@skillpass.ng', 'admin', '2026-08-01'),
mk('t1', 'babatunde@skillpass.ng', 'trainer', '2026-08-04'),
mk('t2', 'ngozi@skillpass.ng', 'trainer', '2026-08-05'),
mk('t3', 'ibrahim@skillpass.ng', 'trainer', '2026-08-06'),
mk('t4', 'chinedu@skillpass.ng', 'trainer', '2026-08-07'),
mk('t5', 'funmi@skillpass.ng', 'trainer', '2026-09-28'),
mk('t6', 'kunle@skillpass.ng', 'trainer', '2026-09-29'),
mk('a1', 'tobi@skillpass.ng', 'apprentice', '2026-08-10'),
mk('a2', 'emeka@skillpass.ng', 'apprentice', '2026-08-10'),
mk('a3', 'kelechi@skillpass.ng', 'apprentice', '2026-08-11'),
mk('a4', 'aisha@skillpass.ng', 'apprentice', '2026-08-12'),
mk('a5', 'blessing@skillpass.ng', 'apprentice', '2026-08-12'),
mk('a6', 'yusuf@skillpass.ng', 'apprentice', '2026-08-13'),
mk('a7', 'samuel@skillpass.ng', 'apprentice', '2026-08-13'),
mk('a8', 'segun@skillpass.ng', 'apprentice', '2026-08-14'),
mk('e1', 'folake@skillpass.ng', 'employer', '2026-08-15'),
mk('e2', 'adaeze@skillpass.ng', 'employer', '2026-08-16'),
mk('e3', 'tunde@skillpass.ng', 'employer', '2026-09-20')];


export const demoLogins: {role: Role;label: string;email: string;hint: string;}[] = [
{ role: 'trainer', label: 'Trainer', email: 'babatunde@skillpass.ng', hint: 'Babatunde · Electrical' },
{ role: 'apprentice', label: 'Apprentice', email: 'tobi@skillpass.ng', hint: 'Tobi · Electrical' },
{ role: 'employer', label: 'Employer', email: 'folake@skillpass.ng', hint: 'Folake · Lekki Homes' },
{ role: 'admin', label: 'Admin', email: 'admin@skillpass.ng', hint: 'Fejiro · Pilot admin' }];