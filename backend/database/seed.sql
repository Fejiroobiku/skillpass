-- SkillPass demo seed data
--
-- Generated from the frontend demo data (src/data/*.ts) so the API and the UI show the same people.
-- All demo accounts use the password "demo1234".
--
-- DEMO ONLY. Never load this into a database that holds real users.
--
-- Credential signatures are filled in by "npm run db:seed" (or "npm run db:resign") using your SIGNING_KEY.
-- If you load this file with psql instead, run "npm run db:resign" afterwards.

INSERT INTO trades (id, name) VALUES
  ('electrical', 'Electrical Installation'),
  ('mechanic', 'Auto Mechanics'),
  ('tailoring', 'Tailoring');

INSERT INTO associations (id, name, trade_id) VALUES
  ('ecan', 'Electrical Contractors Association of Nigeria — Lagos', 'electrical'),
  ('nata', 'National Automobile Technicians Association — Lagos', 'mechanic'),
  ('fadan', 'Fashion Designers Association of Nigeria — Lagos', 'tailoring');

INSERT INTO assessors (id, name, organisation, nsq_id) VALUES
  ('as-grace', 'Grace Olatunji', 'NBTE NSQ assessor · IDEAS', 'NSQ-LA-0412'),
  ('as-musa', 'Musa Abdullahi', 'NBTE NSQ assessor · IDEAS', 'NSQ-LA-0877'),
  ('as-ifeoma', 'Ifeoma Chukwu', 'NBTE NSQ assessor · IDEAS', 'NSQ-LA-1093'),
  ('as-pilot', 'Dayo Akande', 'SkillPass pilot assessor', NULL);

INSERT INTO assessor_trades (assessor_id, trade_id) VALUES
  ('as-grace', 'electrical'),
  ('as-musa', 'mechanic'),
  ('as-ifeoma', 'tailoring'),
  ('as-pilot', 'electrical'),
  ('as-pilot', 'mechanic'),
  ('as-pilot', 'tailoring');

INSERT INTO users (id, email, password_hash, role, status, name, phone, dob, location_name, lat, lng, consent_at, created_at) VALUES
  ('ad1', 'admin@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'admin', 'active', 'Fejiro Obiku', NULL, '1996-05-14', NULL, NULL, NULL, '2026-08-01T00:00:00+01:00', '2026-08-01T00:00:00+01:00'),
  ('t1', 'babatunde@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Babatunde Adeyemi', '0803 412 7781', '1996-05-14', 'Agungi, Lekki', 6.4389, 3.5105, '2026-08-04T00:00:00+01:00', '2026-08-04T00:00:00+01:00'),
  ('t2', 'ngozi@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Ngozi Eze', '0806 220 4193', '1996-05-14', 'Balogun Market, Lagos Island', 6.4549, 3.3896, '2026-08-05T00:00:00+01:00', '2026-08-05T00:00:00+01:00'),
  ('t3', 'ibrahim@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Ibrahim Musa', '0809 771 0346', '1996-05-14', 'Ladipo, Mushin', 6.5352, 3.3531, '2026-08-06T00:00:00+01:00', '2026-08-06T00:00:00+01:00'),
  ('t4', 'chinedu@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Chinedu Okafor', '0812 559 0027', '1996-05-14', 'Computer Village, Ikeja', 6.5966, 3.3421, '2026-08-07T00:00:00+01:00', '2026-08-07T00:00:00+01:00'),
  ('t5', 'funmi@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Funmilayo Adebayo', '0816 004 8812', '1996-05-14', 'Yaba', 6.5095, 3.3711, '2026-09-28T00:00:00+01:00', '2026-09-28T00:00:00+01:00'),
  ('t6', 'kunle@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'trainer', 'active', 'Kunle Bakare', '0701 339 2280', '1996-05-14', 'Surulere', 6.4969, 3.3538, '2026-09-29T00:00:00+01:00', '2026-09-29T00:00:00+01:00'),
  ('a1', 'tobi@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Tobi Ogunleye', '0810 223 9901', '1996-05-14', 'Ajah', 6.4698, 3.5852, '2026-08-10T00:00:00+01:00', '2026-08-10T00:00:00+01:00'),
  ('a2', 'emeka@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Emeka Nwosu', '0703 118 4420', '1996-05-14', 'Lekki Phase 1', 6.4474, 3.4727, '2026-08-10T00:00:00+01:00', '2026-08-10T00:00:00+01:00'),
  ('a3', 'kelechi@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Kelechi Obi', '0905 776 3312', '1996-05-14', 'Agungi, Lekki', 6.4389, 3.5105, '2026-08-11T00:00:00+01:00', '2026-08-11T00:00:00+01:00'),
  ('a4', 'aisha@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Aisha Bello', '0802 991 5570', '1996-05-14', 'Balogun Market, Lagos Island', 6.4549, 3.3896, '2026-08-12T00:00:00+01:00', '2026-08-12T00:00:00+01:00'),
  ('a5', 'blessing@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Blessing Etim', '0817 402 1188', '1996-05-14', 'Surulere', 6.4969, 3.3538, '2026-08-12T00:00:00+01:00', '2026-08-12T00:00:00+01:00'),
  ('a6', 'yusuf@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Yusuf Danjuma', '0706 540 2291', '1996-05-14', 'Ladipo, Mushin', 6.5352, 3.3531, '2026-08-13T00:00:00+01:00', '2026-08-13T00:00:00+01:00'),
  ('a7', 'samuel@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Samuel Ojo', '0813 667 0045', '1996-05-14', 'Yaba', 6.5095, 3.3711, '2026-08-13T00:00:00+01:00', '2026-08-13T00:00:00+01:00'),
  ('a8', 'segun@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'apprentice', 'active', 'Segun Alabi', '0814 330 7765', '1996-05-14', 'Computer Village, Ikeja', 6.5966, 3.3421, '2026-08-14T00:00:00+01:00', '2026-08-14T00:00:00+01:00'),
  ('e1', 'folake@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'employer', 'active', 'Folake Hassan', '0802 118 6634', '1996-05-14', 'Lekki Phase 1', 6.4474, 3.4727, '2026-08-15T00:00:00+01:00', '2026-08-15T00:00:00+01:00'),
  ('e2', 'adaeze@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'employer', 'active', 'Adaeze Nnaji', '0809 443 2210', '1996-05-14', 'Ikoyi', 6.4541, 3.4347, '2026-08-16T00:00:00+01:00', '2026-08-16T00:00:00+01:00'),
  ('e3', 'tunde@skillpass.ng', '$2b$10$Y/qZ.OBSvE0T.GcX2xa8pepPFkB/p1yUlkoyk7jMVh3KgHkEIrTCW', 'employer', 'active', 'Tunde Bakare', '0703 552 9087', '1996-05-14', 'Surulere', 6.4969, 3.3538, '2026-09-20T00:00:00+01:00', '2026-09-20T00:00:00+01:00');

INSERT INTO trainer_profiles (user_id, trade_id, workshop, association_id, membership_no, membership_verified, approved, joined_at, misconduct_at, misconduct_reason) VALUES
  ('t1', 'electrical', 'Adeyemi Electricals', 'ecan', 'ECAN/LA/2211', true, true, '2026-08-04T00:00:00+01:00', NULL, NULL),
  ('t2', 'tailoring', 'Ngozi Stitches', 'fadan', 'FADAN/LA/0784', true, true, '2026-08-05T00:00:00+01:00', NULL, NULL),
  ('t3', 'mechanic', 'Musa & Sons Autos', 'nata', 'NATA/LA/5530', true, true, '2026-08-06T00:00:00+01:00', NULL, NULL),
  ('t4', 'electrical', 'Okafor Power Systems', 'ecan', 'ECAN/LA/1907', true, true, '2026-08-07T00:00:00+01:00', NULL, NULL),
  ('t5', 'tailoring', 'Funmi Couture', 'fadan', 'FADAN/LA/1142', false, false, '2026-09-28T00:00:00+01:00', NULL, NULL),
  ('t6', 'mechanic', 'Bakare Motors', 'nata', 'NATA/LA/6021', true, false, '2026-09-29T00:00:00+01:00', NULL, NULL);

INSERT INTO apprentice_profiles (user_id, trade_id, trainer_id, started_at) VALUES
  ('a1', 'electrical', 't1', '2024-02-12T00:00:00+01:00'),
  ('a2', 'electrical', 't1', '2023-11-01T00:00:00+01:00'),
  ('a3', 'electrical', 't1', '2025-01-20T00:00:00+01:00'),
  ('a8', 'electrical', 't4', '2024-06-03T00:00:00+01:00'),
  ('a4', 'tailoring', 't2', '2024-04-08T00:00:00+01:00'),
  ('a5', 'tailoring', 't2', '2024-09-15T00:00:00+01:00'),
  ('a6', 'mechanic', 't3', '2023-07-10T00:00:00+01:00'),
  ('a7', 'mechanic', 't3', '2024-10-01T00:00:00+01:00');

INSERT INTO employer_profiles (user_id, company, trade_id, approved) VALUES
  ('e1', 'Lekki Homes Facility Management', 'electrical', true),
  ('e2', 'Adaeze Couture House', 'tailoring', true),
  ('e3', 'QuickFix Autos', 'mechanic', true);

INSERT INTO skills (id, trade_id, name, level, requires_cosign, status, proposed_by) VALUES
  ('el-01', 'electrical', 'Identify cable sizes and colour codes', 'Foundation', false, 'active', NULL),
  ('el-02', 'electrical', 'Install a single-gang switch and socket outlet', 'Foundation', false, 'active', NULL),
  ('el-03', 'electrical', 'Wire a consumer unit (distribution board)', 'Intermediate', false, 'active', NULL),
  ('el-04', 'electrical', 'Run conduit and surface wiring for a room', 'Intermediate', false, 'active', NULL),
  ('el-05', 'electrical', 'Test continuity and insulation resistance', 'Intermediate', false, 'active', NULL),
  ('el-06', 'electrical', 'Install and commission a three-phase supply', 'Advanced', true, 'active', NULL),
  ('el-07', 'electrical', 'Install a solar inverter with battery backup', 'Advanced', true, 'active', NULL),
  ('el-08', 'electrical', 'Install an automatic changeover switch', 'Intermediate', false, 'proposed', 't1'),
  ('me-01', 'mechanic', 'Change engine oil and filters', 'Foundation', false, 'active', NULL),
  ('me-02', 'mechanic', 'Replace front brake pads and discs', 'Foundation', false, 'active', NULL),
  ('me-03', 'mechanic', 'Diagnose faults with an OBD-II scanner', 'Intermediate', false, 'active', NULL),
  ('me-04', 'mechanic', 'Service and replace a clutch assembly', 'Intermediate', false, 'active', NULL),
  ('me-05', 'mechanic', 'Overhaul a petrol engine cylinder head', 'Advanced', true, 'active', NULL),
  ('me-06', 'mechanic', 'Trace and repair ECU wiring faults', 'Advanced', true, 'active', NULL),
  ('ta-01', 'tailoring', 'Take accurate body measurements', 'Foundation', false, 'active', NULL),
  ('ta-02', 'tailoring', 'Thread and operate an industrial sewing machine', 'Foundation', false, 'active', NULL),
  ('ta-03', 'tailoring', 'Draft a pattern for a fitted shirt', 'Intermediate', false, 'active', NULL),
  ('ta-04', 'tailoring', 'Sew and finish a buba and sokoto', 'Intermediate', false, 'active', NULL),
  ('ta-05', 'tailoring', 'Tailor a fully lined two-piece suit', 'Advanced', true, 'active', NULL),
  ('ta-06', 'tailoring', 'Draft and sew an embroidered agbada', 'Advanced', true, 'active', NULL),
  ('ta-07', 'tailoring', 'Attach an invisible zip to a gown', 'Intermediate', false, 'proposed', 't2');

INSERT INTO skill_criteria (skill_id, position, text) VALUES
  ('el-01', 1, 'Names cable sizes (1.0, 1.5, 2.5, 4.0 mm²) correctly'),
  ('el-01', 2, 'Identifies live, neutral and earth by colour'),
  ('el-01', 3, 'Matches cable size to circuit load'),
  ('el-02', 1, 'Isolates supply and proves dead before work'),
  ('el-02', 2, 'Wire colours terminated correctly'),
  ('el-02', 3, 'Earth continuity tested'),
  ('el-02', 4, 'Faceplate level and secure'),
  ('el-03', 1, 'Isolates supply and proves dead'),
  ('el-03', 2, 'Correct breaker rating per circuit'),
  ('el-03', 3, 'Neutral and earth bars separated and labelled'),
  ('el-03', 4, 'Every circuit labelled'),
  ('el-03', 5, 'Insulation resistance tested before energising'),
  ('el-04', 1, 'Conduit runs level and plumb'),
  ('el-04', 2, 'Bends made without kinking'),
  ('el-04', 3, 'Saddles spaced evenly'),
  ('el-04', 4, 'Cable pulled without damage'),
  ('el-05', 1, 'Uses meter on correct range'),
  ('el-05', 2, 'Continuity of protective conductors recorded'),
  ('el-05', 3, 'Insulation resistance ≥ 1 MΩ recorded'),
  ('el-05', 4, 'Results written on test sheet'),
  ('el-06', 1, 'Phase rotation checked'),
  ('el-06', 2, 'Load balanced across phases'),
  ('el-06', 3, 'Changeover wired and tested'),
  ('el-06', 4, 'Earthing tested'),
  ('el-07', 1, 'Inverter sized for load'),
  ('el-07', 2, 'DC and AC isolators fitted'),
  ('el-07', 3, 'Battery cables correctly sized and fused'),
  ('el-07', 4, 'System commissioned and handed over'),
  ('me-01', 1, 'Correct oil grade selected'),
  ('me-01', 2, 'Sump plug torqued and washer replaced'),
  ('me-01', 3, 'Filter fitted and checked for leaks'),
  ('me-01', 4, 'Level checked after run'),
  ('me-02', 1, 'Vehicle raised and supported safely'),
  ('me-02', 2, 'Pads and discs measured'),
  ('me-02', 3, 'Caliper slides cleaned and greased'),
  ('me-02', 4, 'Brake test done before handover'),
  ('me-03', 1, 'Scanner connected and codes read'),
  ('me-03', 2, 'Live data interpreted'),
  ('me-03', 3, 'Fault confirmed by physical check'),
  ('me-03', 4, 'Codes cleared and re-tested'),
  ('me-04', 1, 'Gearbox removed safely'),
  ('me-04', 2, 'Flywheel inspected'),
  ('me-04', 3, 'Clutch aligned correctly'),
  ('me-04', 4, 'Road test done'),
  ('me-05', 1, 'Head bolts removed in sequence'),
  ('me-05', 2, 'Surface checked for warp'),
  ('me-05', 3, 'Valves lapped'),
  ('me-05', 4, 'Head torqued in sequence'),
  ('me-06', 1, 'Wiring diagram used'),
  ('me-06', 2, 'Fault traced with multimeter'),
  ('me-06', 3, 'Repair soldered and insulated'),
  ('me-06', 4, 'ECU re-tested with scanner'),
  ('ta-01', 1, 'Measures chest, waist, hip and length'),
  ('ta-01', 2, 'Records measurements clearly'),
  ('ta-01', 3, 'Re-checks key measurements'),
  ('ta-02', 1, 'Threads machine unaided'),
  ('ta-02', 2, 'Winds bobbin correctly'),
  ('ta-02', 3, 'Sews straight seam at even tension'),
  ('ta-03', 1, 'Pattern drafted from measurements'),
  ('ta-03', 2, 'Seam allowances added'),
  ('ta-03', 3, 'Pattern pieces labelled'),
  ('ta-04', 1, 'Fabric cut on grain'),
  ('ta-04', 2, 'Seams neat and finished'),
  ('ta-04', 3, 'Fit checked on client'),
  ('ta-04', 4, 'Hems even'),
  ('ta-05', 1, 'Lining cut and attached'),
  ('ta-05', 2, 'Collar and lapels balanced'),
  ('ta-05', 3, 'Sleeves set cleanly'),
  ('ta-05', 4, 'Final press and fit'),
  ('ta-06', 1, 'Pattern drafted to client size'),
  ('ta-06', 2, 'Embroidery evenly spaced'),
  ('ta-06', 3, 'Neckline finished cleanly'),
  ('ta-06', 4, 'Final fit checked');

INSERT INTO credentials (id, apprentice_id, trainer_id, skill_id, issued_at, status, criteria_met, note, needs_cosign, cosign_reason, cosign_requested_from, cosigner_id, apprentice_confirmed_at, held_for_review, held_cleared, signature, revoke_reason) VALUES
  ('SP-5ZTQ-2WEN', 'a1', 't1', 'el-05', '2026-09-29T15:30:00+01:00', 'pending_apprentice', ARRAY['Uses meter on correct range', 'Continuity of protective conductors recorded', 'Insulation resistance ≥ 1 MΩ recorded', 'Results written on test sheet']::text[], 'Recorded readings on test sheet.', false, NULL, NULL, NULL, NULL, false, false, 'unsigned', NULL),
  ('SP-8KMA-3TRE', 'a6', 't3', 'me-01', '2026-09-21T13:50:00+01:00', 'valid', ARRAY['Correct oil grade selected', 'Sump plug torqued and washer replaced', 'Filter fitted and checked for leaks', 'Level checked after run']::text[], '', false, NULL, NULL, NULL, '2026-09-21T13:50:00+01:00', false, false, 'unsigned', NULL),
  ('SP-4QPL-7NVB', 'a6', 't3', 'me-04', '2026-09-21T13:58:00+01:00', 'valid', ARRAY['Gearbox removed safely', 'Flywheel inspected', 'Clutch aligned correctly', 'Road test done']::text[], '', false, NULL, NULL, NULL, '2026-09-21T13:58:00+01:00', false, false, 'unsigned', NULL),
  ('SP-9WXC-2HJK', 'a7', 't3', 'me-02', '2026-09-21T14:03:00+01:00', 'valid', ARRAY['Vehicle raised and supported safely', 'Pads and discs measured', 'Caliper slides cleaned and greased', 'Brake test done before handover']::text[], '', false, NULL, NULL, NULL, '2026-09-21T14:03:00+01:00', false, false, 'unsigned', NULL),
  ('SP-6TYU-8BNM', 'a7', 't3', 'me-03', '2026-09-21T14:09:00+01:00', 'valid', ARRAY['Scanner connected and codes read', 'Live data interpreted', 'Fault confirmed by physical check', 'Codes cleared and re-tested']::text[], '', false, NULL, NULL, NULL, '2026-09-21T14:09:00+01:00', false, false, 'unsigned', NULL),
  ('SP-4KQ7-L2MX', 'a1', 't1', 'el-01', '2026-09-03T10:12:00+01:00', 'valid', ARRAY['Names cable sizes (1.0, 1.5, 2.5, 4.0 mm²) correctly', 'Identifies live, neutral and earth by colour', 'Matches cable size to circuit load']::text[], 'Correctly identified all cable sizes on first attempt.', false, NULL, NULL, NULL, '2026-09-03T10:12:00+01:00', false, false, 'unsigned', NULL),
  ('SP-9TRD-5HWA', 'a1', 't1', 'el-02', '2026-09-10T14:40:00+01:00', 'valid', ARRAY['Isolates supply and proves dead before work', 'Wire colours terminated correctly', 'Earth continuity tested', 'Faceplate level and secure']::text[], 'Neat terminations, tested before handover.', false, NULL, NULL, NULL, '2026-09-10T14:40:00+01:00', false, false, 'unsigned', NULL),
  ('SP-2BNC-8QPE', 'a1', 't1', 'el-03', '2026-09-22T11:05:00+01:00', 'valid', ARRAY['Isolates supply and proves dead', 'Correct breaker rating per circuit', 'Neutral and earth bars separated and labelled', 'Every circuit labelled', 'Insulation resistance tested before energising']::text[], 'Wired board unaided; labelled every circuit.', false, NULL, NULL, NULL, '2026-09-22T11:05:00+01:00', false, false, 'unsigned', NULL),
  ('SP-7MXV-3JYK', 'a1', 't1', 'el-07', '2026-09-26T16:20:00+01:00', 'valid', ARRAY['Inverter sized for load', 'DC and AC isolators fitted', 'Battery cables correctly sized and fused', 'System commissioned and handed over']::text[], 'Commissioned system at Lekki residence.', true, 'advanced', NULL, 't4', '2026-09-26T16:20:00+01:00', false, false, 'unsigned', NULL),
  ('SP-6FHP-1ZRT', 'a2', 't1', 'el-01', '2026-09-02T09:30:00+01:00', 'valid', ARRAY['Names cable sizes (1.0, 1.5, 2.5, 4.0 mm²) correctly', 'Identifies live, neutral and earth by colour', 'Matches cable size to circuit load']::text[], '', false, NULL, NULL, NULL, '2026-09-02T09:30:00+01:00', false, false, 'unsigned', NULL),
  ('SP-3WLA-9KDS', 'a2', 't1', 'el-04', '2026-09-18T15:10:00+01:00', 'flagged', ARRAY['Conduit runs level and plumb', 'Bends made without kinking', 'Saddles spaced evenly', 'Cable pulled without damage']::text[], '', false, NULL, NULL, NULL, '2026-09-18T15:10:00+01:00', false, false, 'unsigned', NULL),
  ('SP-8QGE-4TNB', 'a2', 't1', 'el-05', '2026-09-30T09:15:00+01:00', 'valid', ARRAY['Uses meter on correct range', 'Continuity of protective conductors recorded', 'Insulation resistance ≥ 1 MΩ recorded', 'Results written on test sheet']::text[], '', false, NULL, NULL, NULL, '2026-09-30T09:15:00+01:00', false, false, 'unsigned', NULL),
  ('SP-5YJU-7CVM', 'a3', 't1', 'el-02', '2026-09-30T11:45:00+01:00', 'valid', ARRAY['Isolates supply and proves dead before work', 'Wire colours terminated correctly', 'Earth continuity tested', 'Faceplate level and secure']::text[], '', false, NULL, NULL, NULL, '2026-09-30T11:45:00+01:00', false, false, 'unsigned', NULL),
  ('SP-1RKD-6PLW', 'a8', 't4', 'el-06', '2026-09-29T13:00:00+01:00', 'pending_cosign', ARRAY['Phase rotation checked', 'Load balanced across phases', 'Changeover wired and tested', 'Earthing tested']::text[], 'Commissioned 3-phase supply for a small factory.', true, 'advanced', 't1', NULL, '2026-09-29T13:00:00+01:00', false, false, 'unsigned', NULL),
  ('SP-4NAT-2XHE', 'a4', 't2', 'ta-01', '2026-09-05T10:00:00+01:00', 'valid', ARRAY['Measures chest, waist, hip and length', 'Records measurements clearly', 'Re-checks key measurements']::text[], '', false, NULL, NULL, NULL, '2026-09-05T10:00:00+01:00', false, false, 'unsigned', NULL),
  ('SP-9CEB-3MUF', 'a4', 't2', 'ta-04', '2026-09-19T12:30:00+01:00', 'valid', ARRAY['Fabric cut on grain', 'Seams neat and finished', 'Fit checked on client', 'Hems even']::text[], '', false, NULL, NULL, NULL, '2026-09-19T12:30:00+01:00', false, false, 'unsigned', NULL),
  ('SP-2DVS-8LQJ', 'a5', 't2', 'ta-02', '2026-09-12T11:20:00+01:00', 'revoked', ARRAY['Threads machine unaided', 'Winds bobbin correctly', 'Sews straight seam at even tension']::text[], '', false, NULL, NULL, NULL, '2026-09-12T11:20:00+01:00', false, false, 'unsigned', 'Audit re-check found the apprentice could not thread the machine unaided.'),
  ('SP-6HWK-5GAY', 'a6', 't3', 'me-02', '2026-09-08T09:50:00+01:00', 'valid', ARRAY['Vehicle raised and supported safely', 'Pads and discs measured', 'Caliper slides cleaned and greased', 'Brake test done before handover']::text[], '', false, NULL, NULL, NULL, '2026-09-08T09:50:00+01:00', false, false, 'unsigned', NULL),
  ('SP-3PZN-1VKR', 'a6', 't3', 'me-03', '2026-09-21T14:15:00+01:00', 'held_review', ARRAY['Scanner connected and codes read', 'Live data interpreted', 'Fault confirmed by physical check', 'Codes cleared and re-tested']::text[], '', false, NULL, NULL, NULL, '2026-09-21T14:15:00+01:00', true, false, 'unsigned', NULL),
  ('SP-7LBX-4SDC', 'a7', 't3', 'me-01', '2026-09-14T10:40:00+01:00', 'valid', ARRAY['Correct oil grade selected', 'Sump plug torqued and washer replaced', 'Filter fitted and checked for leaks', 'Level checked after run']::text[], '', false, NULL, NULL, NULL, '2026-09-14T10:40:00+01:00', false, false, 'unsigned', NULL);

INSERT INTO evidence (id, credential_id, uploaded_by, kind, url, poster_url, caption, captured_at, location_label, lat, lng, sha256, challenge_code, duration_sec, source) VALUES
  ('ev16', 'SP-5ZTQ-2WEN', 't1', 'video', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', 'Insulation resistance test on estate circuit', '2026-09-29T15:30:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, 'f90260c0f80e75bfbffaa73673278391d498a3f6dd9a55a132bc66c78e8535d0', '4827', 22, 'demo'),
  ('ev17', 'SP-8KMA-3TRE', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'Oil change, Honda Accord', '2026-09-21T13:50:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '7ded6e5193024cc2dd1e966eef4a946dfef22aa3985bf8dd17666770394237dc', NULL, NULL, 'camera'),
  ('ev18', 'SP-4QPL-7NVB', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'Clutch replacement', '2026-09-21T13:58:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '6817b8d9246102e37d708e6a685cda8acad4153894b55d857abd649d2ca3a0ee', NULL, NULL, 'camera'),
  ('ev19', 'SP-9WXC-2HJK', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'Brake pads, Toyota Camry', '2026-09-21T14:03:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '0521b78efd1cae1ba6acf890c24a2dddbd16a09974cddfd97b227a15eeea69ba', NULL, NULL, 'camera'),
  ('ev20', 'SP-6TYU-8BNM', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'OBD-II scan', '2026-09-21T14:09:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, 'e086c91c4b3efeecd7fa06edcd9f88c0ef65e2c4f01635f9d7e7180052e7941f', NULL, NULL, 'camera'),
  ('ev1', 'SP-4KQ7-L2MX', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Sorting 1.5mm² and 2.5mm² cables by colour code', '2026-09-03T10:12:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, '06edaf1a61547e67591ec3c3a4c7793506066efa2ba651b751b1312e51ced5fe', NULL, NULL, 'camera'),
  ('ev2', 'SP-9TRD-5HWA', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Switch and socket installed in client flat, Ajah', '2026-09-10T14:40:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, '70064d814ca531902831b740509372b1c6004be29d8c991c35341ecc232cb710', NULL, NULL, 'camera'),
  ('ev3', 'SP-2BNC-8QPE', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Completed 12-way distribution board', '2026-09-22T11:05:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, '08ec3c54971bd55f5a2c7a2bf2826ae5be5f5e71069220b77ce55bf0cd42151c', NULL, NULL, 'camera'),
  ('ev4', 'SP-7MXV-3JYK', 't1', 'photo', '/fd213f5f-02ae-46fe-bd1c-7f74ab6a99f9.jpg', NULL, '3.5kVA inverter with two lithium batteries', '2026-09-26T16:20:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, 'd97c9d1cc8f7fcb0177b9a326f321ce6aa5e7339aac52345591f29ed54b02432', NULL, NULL, 'camera'),
  ('ev5', 'SP-6FHP-1ZRT', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Cable identification exercise', '2026-09-02T09:30:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, '2372765936072151ceef1c25776afaab1c4106a58cffe56240f3a6f3ea8b26cd', NULL, NULL, 'camera'),
  ('ev6', 'SP-3WLA-9KDS', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Surface conduit run, bedroom', '2026-09-18T15:10:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, 'c49b47b3b03267a2f1393bbd35b700e68c8cb0048af846e9f46e98da70dfa68a', NULL, NULL, 'camera'),
  ('ev7', 'SP-8QGE-4TNB', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Insulation resistance test readings', '2026-09-30T09:15:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, 'ae5737070b97cefdba03df088fd0d5df137e47dca938601a329a2bb75efbf582', NULL, NULL, 'camera'),
  ('ev8', 'SP-5YJU-7CVM', 't1', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Socket outlet install, Agungi workshop', '2026-09-30T11:45:00+01:00', 'Agungi, Lekki', 6.4389, 3.5105, 'c88bdba9eda8e67f4c761056f6fa93305f0e6cf223a9e70465d30414887f5102', NULL, NULL, 'camera'),
  ('ev9', 'SP-1RKD-6PLW', 't4', 'photo', '/32383737-c0e6-4fb2-b59c-44fc5566bffc.jpg', NULL, 'Three-phase changeover panel, Ikeja', '2026-09-29T13:00:00+01:00', 'Computer Village, Ikeja', 6.5966, 3.3421, '0a08dd218b5709a7f41db3df2297d9e9c4667985c09f8d7e0094db97bfad246c', NULL, NULL, 'camera'),
  ('ev10', 'SP-4NAT-2XHE', 't2', 'photo', '/9a48d1b4-5607-4882-b8ae-1366a71188d1.jpg', NULL, 'Measurement card for a client', '2026-09-05T10:00:00+01:00', 'Balogun Market, Lagos Island', 6.4549, 3.3896, '894cedc1d5a6a458d6ccb729f27eb3bc6f070017e875f1660781f24947c9d001', NULL, NULL, 'camera'),
  ('ev11', 'SP-9CEB-3MUF', 't2', 'photo', '/9a48d1b4-5607-4882-b8ae-1366a71188d1.jpg', NULL, 'Finished buba and sokoto in Ankara', '2026-09-19T12:30:00+01:00', 'Balogun Market, Lagos Island', 6.4549, 3.3896, '9df6434c1a47d4655ceaa1e9959484eb6a96118356b0d52a60983034a7f7d45a', NULL, NULL, 'camera'),
  ('ev12', 'SP-2DVS-8LQJ', 't2', 'photo', '/9a48d1b4-5607-4882-b8ae-1366a71188d1.jpg', NULL, 'Threading industrial machine', '2026-09-12T11:20:00+01:00', 'Balogun Market, Lagos Island', 6.4549, 3.3896, '16a06978e6b3c8226ed0ccbf03db91acea12b8b501006b06ef42adb0e4fe3ab0', NULL, NULL, 'camera'),
  ('ev13', 'SP-6HWK-5GAY', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'Brake pad replacement, Toyota Corolla', '2026-09-08T09:50:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '8bf4da7705d1e5f631d2800e2c4c255e07a90f486d6aed26302f2c27f0541249', NULL, NULL, 'camera'),
  ('ev14', 'SP-3PZN-1VKR', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'OBD-II scan and fault report', '2026-09-21T14:15:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '87d9f94cc904c1eccfe15b89dd507367e38f4dc7da82d8318825a66c11c0bf55', NULL, NULL, 'camera'),
  ('ev15', 'SP-7LBX-4SDC', 't3', 'photo', '/d88c1d0b-fe90-40d9-a005-efb3b889e2a2.jpg', NULL, 'Oil and filter change', '2026-09-14T10:40:00+01:00', 'Ladipo, Mushin', 6.5352, 3.3531, '891213078a285bb188834caa3ffdc8e1d9672414ba5d4d6e6fcad54b40088679', NULL, NULL, 'camera');

INSERT INTO flags (id, credential_id, raised_by, reason, raised_at, status) VALUES
  ('fl1', 'SP-3WLA-9KDS', 'e1', 'Conduit run on our site was uneven and had to be redone by another electrician.', '2026-09-27T17:05:00+01:00', 'open');

INSERT INTO attempts (id, trainer_id, apprentice_id, skill_id, criteria_met, at) VALUES
  ('at1', 't1', 'a3', 'el-03', ARRAY['Isolates supply and proves dead', 'Correct breaker rating per circuit', 'Neutral and earth bars separated and labelled']::text[], '2026-09-24T15:00:00+01:00'),
  ('at2', 't1', 'a2', 'el-06', ARRAY['Phase rotation checked', 'Load balanced across phases']::text[], '2026-09-19T11:00:00+01:00'),
  ('at3', 't2', 'a5', 'ta-03', ARRAY['Pattern drafted from measurements']::text[], '2026-09-20T12:00:00+01:00');

INSERT INTO audit_samples (id, credential_id, reviewer_id, assessor_id, reason, selected_at, result) VALUES
  ('as1', 'SP-9TRD-5HWA', 'ad1', NULL, NULL, '2026-09-24T08:00:00+01:00', 'agree'),
  ('as2', 'SP-9CEB-3MUF', 'ad1', NULL, NULL, '2026-09-24T08:00:00+01:00', 'agree'),
  ('as3', 'SP-2DVS-8LQJ', 'ad1', NULL, NULL, '2026-09-24T08:00:00+01:00', 'disagree'),
  ('as4', 'SP-6FHP-1ZRT', 'ad1', NULL, NULL, '2026-09-29T08:00:00+01:00', 'pending'),
  ('as5', 'SP-6HWK-5GAY', 'ad1', 'as-musa', 'risk', '2026-09-29T08:00:00+01:00', 'pending');

INSERT INTO concern_reports (id, apprentice_id, trainer_id, category, details, at, status) VALUES
  ('cr1', 'a7', 't3', 'payment', 'My oga said I must pay ₦5,000 per skill before he will record it on SkillPass.', '2026-09-22T19:30:00+01:00', 'open');

INSERT INTO job_postings (id, employer_id, title, trade_id, location_name, lat, lng, pay, posted_at) VALUES
  ('j1', 'e1', 'Rewire two flats in a Lekki estate', 'electrical', 'Lekki Phase 1', 6.4474, 3.4727, '₦180,000 fixed', '2026-09-28T09:00:00+01:00'),
  ('j2', 'e1', 'Solar backup install for estate clubhouse', 'electrical', 'Ajah', 6.4698, 3.5852, '₦250,000 fixed', '2026-09-29T12:00:00+01:00'),
  ('j3', 'e2', 'Seasonal tailor for wedding orders', 'tailoring', 'Ikoyi', 6.4541, 3.4347, '₦12,000 per day', '2026-09-26T10:00:00+01:00'),
  ('j4', 'e3', 'Junior mechanic, brake and service bay', 'mechanic', 'Surulere', 6.4969, 3.3538, '₦90,000 monthly', '2026-09-27T08:30:00+01:00');

INSERT INTO job_skills (job_id, skill_id) VALUES
  ('j1', 'el-03'),
  ('j1', 'el-04'),
  ('j1', 'el-05'),
  ('j2', 'el-07'),
  ('j2', 'el-03'),
  ('j3', 'ta-01'),
  ('j3', 'ta-04'),
  ('j4', 'me-01'),
  ('j4', 'me-02');

INSERT INTO referrals (id, job_id, apprentice_id, status, sent_at) VALUES
  ('r1', 'j1', 'a1', 'sent', '2026-09-28T09:05:00+01:00'),
  ('r2', 'j2', 'a1', 'accepted', '2026-09-29T12:10:00+01:00'),
  ('r3', 'j1', 'a2', 'contacted', '2026-09-28T09:05:00+01:00');

INSERT INTO feedback (id, apprentice_id, employer_id, referral_id, rating, comment, created_at) VALUES
  ('fb1', 'a1', 'e1', NULL, 5, 'Rewired the estate gatehouse board cleanly and on time.', '2026-09-25T18:00:00+01:00'),
  ('fb2', 'a2', 'e1', 'r3', 2, 'Conduit work needed rework.', '2026-09-27T17:00:00+01:00'),
  ('fb4', 'a6', 'e3', NULL, 1, 'Clutch slipped after two days. Had to redo it.', '2026-09-26T10:00:00+01:00'),
  ('fb5', 'a7', 'e3', NULL, 2, 'Brakes squealing; pads not seated properly.', '2026-09-28T10:00:00+01:00'),
  ('fb3', 'a4', 'e2', NULL, 4, 'Good finishing, slightly late delivery.', '2026-09-23T12:00:00+01:00');

INSERT INTO feedback_credentials (feedback_id, credential_id) VALUES
  ('fb1', 'SP-2BNC-8QPE'),
  ('fb2', 'SP-3WLA-9KDS'),
  ('fb4', 'SP-4QPL-7NVB'),
  ('fb5', 'SP-9WXC-2HJK'),
  ('fb3', 'SP-9CEB-3MUF');

INSERT INTO notifications (id, user_id, channel, title, body, at, read, link) VALUES
  ('n1', 't1', 'in_app', 'Co-sign request', 'Chinedu Okafor asked you to co-sign “Install and commission a three-phase supply” for Segun Alabi.', '2026-09-29T13:01:00+01:00', false, '/trainer'),
  ('n2', 't1', 'in_app', 'Credential flagged', 'Folake Hassan flagged SP-3WLA-9KDS (Emeka Nwosu). An administrator will review it.', '2026-09-27T17:06:00+01:00', false, '/verify/SP-3WLA-9KDS'),
  ('n3', 't1', 'in_app', 'Audit sample selected', 'SP-6FHP-1ZRT was picked for a random spot-check.', '2026-09-29T08:00:00+01:00', true, NULL),
  ('n4', 'a1', 'sms', 'New job referral', 'SkillPass: Lekki Homes needs an electrician in Lekki Phase 1 (₦180,000). Reply 1 if interested.', '2026-09-28T09:05:00+01:00', false, '/apprentice/jobs'),
  ('n5', 'a1', 'in_app', 'New job referral', 'Rewire two flats in a Lekki estate — 67% skill match.', '2026-09-28T09:05:00+01:00', false, '/apprentice/jobs'),
  ('n6', 'a1', 'sms', 'Skill verified', 'SkillPass: Babatunde Adeyemi verified “Install a solar inverter with battery backup”. ID SP-7MXV-3JYK.', '2026-09-26T16:21:00+01:00', true, '/verify/SP-7MXV-3JYK'),
  ('n7', 'e1', 'in_app', '3 matches for your job', 'Rewire two flats in a Lekki estate has 3 verified apprentices nearby.', '2026-09-28T09:01:00+01:00', false, '/employer/jobs'),
  ('n8', 'ad1', 'in_app', 'Trainer awaiting approval', 'Kunle Bakare (Auto Mechanics, Surulere) registered as a trainer.', '2026-09-29T10:00:00+01:00', false, '/admin/users'),
  ('n9', 'ad1', 'in_app', 'New flag', 'SP-3WLA-9KDS was flagged by an employer.', '2026-09-27T17:06:00+01:00', false, '/admin/review');

INSERT INTO sus_responses (id, user_id, role, score, at) VALUES
  ('sus1', 't2', 'trainer', 72.5, '2026-09-25T10:00:00+01:00'),
  ('sus2', 't3', 'trainer', 65, '2026-09-25T11:00:00+01:00'),
  ('sus3', 'a4', 'apprentice', 80, '2026-09-26T09:00:00+01:00'),
  ('sus4', 'a6', 'apprentice', 77.5, '2026-09-26T12:00:00+01:00'),
  ('sus5', 'a7', 'apprentice', 62.5, '2026-09-27T15:00:00+01:00'),
  ('sus6', 'e2', 'employer', 85, '2026-09-27T16:00:00+01:00');

INSERT INTO verification_events (id, credential_id, seconds, trust_rating, at) VALUES
  ('v1', 'SP-2BNC-8QPE', 34, 5, '2026-09-25T17:40:00+01:00'),
  ('v2', 'SP-3WLA-9KDS', 52, 3, '2026-09-27T16:55:00+01:00'),
  ('v3', 'SP-9CEB-3MUF', 41, 4, '2026-09-23T11:30:00+01:00'),
  ('v4', 'SP-6HWK-5GAY', 28, 4, '2026-09-24T09:10:00+01:00'),
  ('v5', 'SP-7MXV-3JYK', 47, 5, '2026-09-29T13:20:00+01:00');

INSERT INTO audit_log (id, at, actor_id, actor_name, action, target, detail) VALUES
  ('al1', '2026-08-04T09:00:00+01:00', NULL, 'Fejiro Obiku', 'trainer.approved', 'Babatunde Adeyemi', 'Workshop visit completed'),
  ('al2', '2026-08-07T09:00:00+01:00', NULL, 'Fejiro Obiku', 'trainer.approved', 'Chinedu Okafor', 'Workshop visit completed'),
  ('al3', '2026-09-03T10:12:00+01:00', NULL, 'Babatunde Adeyemi', 'credential.issued', 'SP-4KQ7-L2MX', 'Tobi Ogunleye · Identify cable sizes and colour codes'),
  ('al4', '2026-09-10T14:40:00+01:00', NULL, 'Babatunde Adeyemi', 'credential.issued', 'SP-9TRD-5HWA', 'Tobi Ogunleye · Install a single-gang switch and socket outlet'),
  ('al5', '2026-09-21T14:16:00+01:00', NULL, 'System', 'credential.held', 'SP-3PZN-1VKR', 'Daily issuing limit (5) exceeded by Ibrahim Musa'),
  ('al6', '2026-09-22T11:05:00+01:00', NULL, 'Babatunde Adeyemi', 'credential.issued', 'SP-2BNC-8QPE', 'Tobi Ogunleye · Wire a consumer unit (distribution board)'),
  ('al7', '2026-09-25T10:00:00+01:00', NULL, 'Fejiro Obiku', 'credential.revoked', 'SP-2DVS-8LQJ', 'Audit re-check disagreed with trainer assessment'),
  ('al8', '2026-09-25T18:00:00+01:00', NULL, 'Folake Hassan', 'feedback.added', 'Tobi Ogunleye', 'Rated 5/5'),
  ('al9', '2026-09-26T16:20:00+01:00', NULL, 'Chinedu Okafor', 'credential.cosigned', 'SP-7MXV-3JYK', 'Co-signed advanced skill for Tobi Ogunleye'),
  ('al10', '2026-09-27T17:05:00+01:00', NULL, 'Folake Hassan', 'credential.flagged', 'SP-3WLA-9KDS', 'Conduit run had to be redone'),
  ('al11', '2026-09-29T08:00:00+01:00', NULL, 'System', 'audit.selected', 'SP-6HWK-5GAY', 'Random audit sample (weekly, 5%)'),
  ('al12', '2026-09-29T08:00:00+01:00', NULL, 'System', 'audit.selected', 'SP-6FHP-1ZRT', 'Random audit sample (weekly, 5%)'),
  ('al13', '2026-09-29T13:00:00+01:00', NULL, 'Chinedu Okafor', 'credential.issued', 'SP-1RKD-6PLW', 'Advanced skill — co-signature requested from Babatunde Adeyemi'),
  ('al14', '2026-09-30T09:15:00+01:00', NULL, 'Babatunde Adeyemi', 'credential.issued', 'SP-8QGE-4TNB', 'Emeka Nwosu · Test continuity and insulation resistance'),
  ('al15', '2026-09-30T11:45:00+01:00', NULL, 'Babatunde Adeyemi', 'credential.issued', 'SP-5YJU-7CVM', 'Kelechi Obi · Install a single-gang switch and socket outlet');

INSERT INTO settings (id, daily_limit, audit_rate_pct, probation_count, cluster_threshold, fast_minutes, sms_enabled, email_enabled)
VALUES (1, 5, 10, 5, 4, 15, true, true);
