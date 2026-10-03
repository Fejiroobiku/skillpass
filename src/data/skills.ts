import type { Skill, Trade } from '../types/skillpass';

export const trades: Trade[] = [
{ id: 'electrical', name: 'Electrical Installation' },
{ id: 'mechanic', name: 'Auto Mechanics' },
{ id: 'tailoring', name: 'Tailoring' }];


export const skills: Skill[] = [
{ id: 'el-01', trade: 'electrical', level: 'Foundation', name: 'Identify cable sizes and colour codes', requiresCosign: false, status: 'active' },
{ id: 'el-02', trade: 'electrical', level: 'Foundation', name: 'Install a single-gang switch and socket outlet', requiresCosign: false, status: 'active' },
{ id: 'el-03', trade: 'electrical', level: 'Intermediate', name: 'Wire a consumer unit (distribution board)', requiresCosign: false, status: 'active' },
{ id: 'el-04', trade: 'electrical', level: 'Intermediate', name: 'Run conduit and surface wiring for a room', requiresCosign: false, status: 'active' },
{ id: 'el-05', trade: 'electrical', level: 'Intermediate', name: 'Test continuity and insulation resistance', requiresCosign: false, status: 'active' },
{ id: 'el-06', trade: 'electrical', level: 'Advanced', name: 'Install and commission a three-phase supply', requiresCosign: true, status: 'active' },
{ id: 'el-07', trade: 'electrical', level: 'Advanced', name: 'Install a solar inverter with battery backup', requiresCosign: true, status: 'active' },
{ id: 'el-08', trade: 'electrical', level: 'Intermediate', name: 'Install an automatic changeover switch', requiresCosign: false, status: 'proposed', proposedBy: 't1' },

{ id: 'me-01', trade: 'mechanic', level: 'Foundation', name: 'Change engine oil and filters', requiresCosign: false, status: 'active' },
{ id: 'me-02', trade: 'mechanic', level: 'Foundation', name: 'Replace front brake pads and discs', requiresCosign: false, status: 'active' },
{ id: 'me-03', trade: 'mechanic', level: 'Intermediate', name: 'Diagnose faults with an OBD-II scanner', requiresCosign: false, status: 'active' },
{ id: 'me-04', trade: 'mechanic', level: 'Intermediate', name: 'Service and replace a clutch assembly', requiresCosign: false, status: 'active' },
{ id: 'me-05', trade: 'mechanic', level: 'Advanced', name: 'Overhaul a petrol engine cylinder head', requiresCosign: true, status: 'active' },
{ id: 'me-06', trade: 'mechanic', level: 'Advanced', name: 'Trace and repair ECU wiring faults', requiresCosign: true, status: 'active' },

{ id: 'ta-01', trade: 'tailoring', level: 'Foundation', name: 'Take accurate body measurements', requiresCosign: false, status: 'active' },
{ id: 'ta-02', trade: 'tailoring', level: 'Foundation', name: 'Thread and operate an industrial sewing machine', requiresCosign: false, status: 'active' },
{ id: 'ta-03', trade: 'tailoring', level: 'Intermediate', name: 'Draft a pattern for a fitted shirt', requiresCosign: false, status: 'active' },
{ id: 'ta-04', trade: 'tailoring', level: 'Intermediate', name: 'Sew and finish a buba and sokoto', requiresCosign: false, status: 'active' },
{ id: 'ta-05', trade: 'tailoring', level: 'Advanced', name: 'Tailor a fully lined two-piece suit', requiresCosign: true, status: 'active' },
{ id: 'ta-06', trade: 'tailoring', level: 'Advanced', name: 'Draft and sew an embroidered agbada', requiresCosign: true, status: 'active' },
{ id: 'ta-07', trade: 'tailoring', level: 'Intermediate', name: 'Attach an invisible zip to a gown', requiresCosign: false, status: 'proposed', proposedBy: 't2' }];


export const skillLevels = ['Foundation', 'Intermediate', 'Advanced'] as const;