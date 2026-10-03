import type { Apprentice, Employer, Place, Trainer } from '../types/skillpass';

export const places: Record<string, Place> = {
  agungi: { name: 'Agungi, Lekki', lat: 6.4389, lng: 3.5105 },
  balogun: { name: 'Balogun Market, Lagos Island', lat: 6.4549, lng: 3.3896 },
  ladipo: { name: 'Ladipo, Mushin', lat: 6.5352, lng: 3.3531 },
  ikeja: { name: 'Computer Village, Ikeja', lat: 6.5966, lng: 3.3421 },
  yaba: { name: 'Yaba', lat: 6.5095, lng: 3.3711 },
  surulere: { name: 'Surulere', lat: 6.4969, lng: 3.3538 },
  lekki: { name: 'Lekki Phase 1', lat: 6.4474, lng: 3.4727 },
  ajah: { name: 'Ajah', lat: 6.4698, lng: 3.5852 },
  ikoyi: { name: 'Ikoyi', lat: 6.4541, lng: 3.4347 }
};

export const trainers: Trainer[] = [
{ id: 't1', name: 'Babatunde Adeyemi', trade: 'electrical', workshop: 'Adeyemi Electricals', location: places.agungi, phone: '0803 412 7781', approved: true, joinedAt: '2026-08-04', associationId: 'ecan', membershipNo: 'ECAN/LA/2211', membershipVerified: true },
{ id: 't2', name: 'Ngozi Eze', trade: 'tailoring', workshop: 'Ngozi Stitches', location: places.balogun, phone: '0806 220 4193', approved: true, joinedAt: '2026-08-05', associationId: 'fadan', membershipNo: 'FADAN/LA/0784', membershipVerified: true },
{ id: 't3', name: 'Ibrahim Musa', trade: 'mechanic', workshop: 'Musa & Sons Autos', location: places.ladipo, phone: '0809 771 0346', approved: true, joinedAt: '2026-08-06', associationId: 'nata', membershipNo: 'NATA/LA/5530', membershipVerified: true },
{ id: 't4', name: 'Chinedu Okafor', trade: 'electrical', workshop: 'Okafor Power Systems', location: places.ikeja, phone: '0812 559 0027', approved: true, joinedAt: '2026-08-07', associationId: 'ecan', membershipNo: 'ECAN/LA/1907', membershipVerified: true },
{ id: 't5', name: 'Funmilayo Adebayo', trade: 'tailoring', workshop: 'Funmi Couture', location: places.yaba, phone: '0816 004 8812', approved: false, joinedAt: '2026-09-28', associationId: 'fadan', membershipNo: 'FADAN/LA/1142', membershipVerified: false },
{ id: 't6', name: 'Kunle Bakare', trade: 'mechanic', workshop: 'Bakare Motors', location: places.surulere, phone: '0701 339 2280', approved: false, joinedAt: '2026-09-29', associationId: 'nata', membershipNo: 'NATA/LA/6021', membershipVerified: true }];


export const apprentices: Apprentice[] = [
{ id: 'a1', name: 'Tobi Ogunleye', trade: 'electrical', trainerId: 't1', location: places.ajah, phone: '0810 223 9901', startedAt: '2024-02-12' },
{ id: 'a2', name: 'Emeka Nwosu', trade: 'electrical', trainerId: 't1', location: places.lekki, phone: '0703 118 4420', startedAt: '2023-11-01' },
{ id: 'a3', name: 'Kelechi Obi', trade: 'electrical', trainerId: 't1', location: places.agungi, phone: '0905 776 3312', startedAt: '2025-01-20' },
{ id: 'a8', name: 'Segun Alabi', trade: 'electrical', trainerId: 't4', location: places.ikeja, phone: '0814 330 7765', startedAt: '2024-06-03' },
{ id: 'a4', name: 'Aisha Bello', trade: 'tailoring', trainerId: 't2', location: places.balogun, phone: '0802 991 5570', startedAt: '2024-04-08' },
{ id: 'a5', name: 'Blessing Etim', trade: 'tailoring', trainerId: 't2', location: places.surulere, phone: '0817 402 1188', startedAt: '2024-09-15' },
{ id: 'a6', name: 'Yusuf Danjuma', trade: 'mechanic', trainerId: 't3', location: places.ladipo, phone: '0706 540 2291', startedAt: '2023-07-10' },
{ id: 'a7', name: 'Samuel Ojo', trade: 'mechanic', trainerId: 't3', location: places.yaba, phone: '0813 667 0045', startedAt: '2024-10-01' }];


export const employers: Employer[] = [
{ id: 'e1', name: 'Folake Hassan', company: 'Lekki Homes Facility Management', trade: 'electrical', location: places.lekki, phone: '0802 118 6634', approved: true },
{ id: 'e2', name: 'Adaeze Nnaji', company: 'Adaeze Couture House', trade: 'tailoring', location: places.ikoyi, phone: '0809 443 2210', approved: true },
{ id: 'e3', name: 'Tunde Bakare', company: 'QuickFix Autos', trade: 'mechanic', location: places.surulere, phone: '0703 552 9087', approved: true }];


export const admins = [{ id: 'ad1', name: 'Fejiro Obiku' }];