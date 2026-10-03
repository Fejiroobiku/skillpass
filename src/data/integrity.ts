import type { Assessor, Association, Attempt, ConcernReport } from '../types/skillpass';

export const associations: Association[] = [
{ id: 'ecan', name: 'Electrical Contractors Association of Nigeria — Lagos', trade: 'electrical' },
{ id: 'nata', name: 'National Automobile Technicians Association — Lagos', trade: 'mechanic' },
{ id: 'fadan', name: 'Fashion Designers Association of Nigeria — Lagos', trade: 'tailoring' }];


export const assessors: Assessor[] = [
{ id: 'as-grace', name: 'Grace Olatunji', organisation: 'NBTE NSQ assessor · IDEAS', nsqId: 'NSQ-LA-0412', trades: ['electrical'] },
{ id: 'as-musa', name: 'Musa Abdullahi', organisation: 'NBTE NSQ assessor · IDEAS', nsqId: 'NSQ-LA-0877', trades: ['mechanic'] },
{ id: 'as-ifeoma', name: 'Ifeoma Chukwu', organisation: 'NBTE NSQ assessor · IDEAS', nsqId: 'NSQ-LA-1093', trades: ['tailoring'] },
{ id: 'as-pilot', name: 'Dayo Akande', organisation: 'SkillPass pilot assessor', trades: ['electrical', 'mechanic', 'tailoring'] }];


/** Observable criteria per skill. The trainer must tick every one to issue. */
export const rubrics: Record<string, string[]> = {
  'el-01': ['Names cable sizes (1.0, 1.5, 2.5, 4.0 mm²) correctly', 'Identifies live, neutral and earth by colour', 'Matches cable size to circuit load'],
  'el-02': ['Isolates supply and proves dead before work', 'Wire colours terminated correctly', 'Earth continuity tested', 'Faceplate level and secure'],
  'el-03': ['Isolates supply and proves dead', 'Correct breaker rating per circuit', 'Neutral and earth bars separated and labelled', 'Every circuit labelled', 'Insulation resistance tested before energising'],
  'el-04': ['Conduit runs level and plumb', 'Bends made without kinking', 'Saddles spaced evenly', 'Cable pulled without damage'],
  'el-05': ['Uses meter on correct range', 'Continuity of protective conductors recorded', 'Insulation resistance ≥ 1 MΩ recorded', 'Results written on test sheet'],
  'el-06': ['Phase rotation checked', 'Load balanced across phases', 'Changeover wired and tested', 'Earthing tested'],
  'el-07': ['Inverter sized for load', 'DC and AC isolators fitted', 'Battery cables correctly sized and fused', 'System commissioned and handed over'],
  'me-01': ['Correct oil grade selected', 'Sump plug torqued and washer replaced', 'Filter fitted and checked for leaks', 'Level checked after run'],
  'me-02': ['Vehicle raised and supported safely', 'Pads and discs measured', 'Caliper slides cleaned and greased', 'Brake test done before handover'],
  'me-03': ['Scanner connected and codes read', 'Live data interpreted', 'Fault confirmed by physical check', 'Codes cleared and re-tested'],
  'me-04': ['Gearbox removed safely', 'Flywheel inspected', 'Clutch aligned correctly', 'Road test done'],
  'me-05': ['Head bolts removed in sequence', 'Surface checked for warp', 'Valves lapped', 'Head torqued in sequence'],
  'me-06': ['Wiring diagram used', 'Fault traced with multimeter', 'Repair soldered and insulated', 'ECU re-tested with scanner'],
  'ta-01': ['Measures chest, waist, hip and length', 'Records measurements clearly', 'Re-checks key measurements'],
  'ta-02': ['Threads machine unaided', 'Winds bobbin correctly', 'Sews straight seam at even tension'],
  'ta-03': ['Pattern drafted from measurements', 'Seam allowances added', 'Pattern pieces labelled'],
  'ta-04': ['Fabric cut on grain', 'Seams neat and finished', 'Fit checked on client', 'Hems even'],
  'ta-05': ['Lining cut and attached', 'Collar and lapels balanced', 'Sleeves set cleanly', 'Final press and fit'],
  'ta-06': ['Pattern drafted to client size', 'Embroidery evenly spaced', 'Neckline finished cleanly', 'Final fit checked']
};

export const defaultRubric = ['Task completed without help', 'Safe working practice followed', 'Finished to client standard'];

export function rubricFor(skillId: string): string[] {
  return rubrics[skillId] ?? defaultRubric;
}

export const seedAttempts: Attempt[] = [
{ id: 'at1', trainerId: 't1', apprenticeId: 'a3', skillId: 'el-03', criteriaMet: rubricFor('el-03').slice(0, 3), at: '2026-09-24T15:00:00' },
{ id: 'at2', trainerId: 't1', apprenticeId: 'a2', skillId: 'el-06', criteriaMet: rubricFor('el-06').slice(0, 2), at: '2026-09-19T11:00:00' },
{ id: 'at3', trainerId: 't2', apprenticeId: 'a5', skillId: 'ta-03', criteriaMet: rubricFor('ta-03').slice(0, 1), at: '2026-09-20T12:00:00' }];


export const seedReports: ConcernReport[] = [
{ id: 'cr1', apprenticeId: 'a7', trainerId: 't3', category: 'payment', details: 'My oga said I must pay ₦5,000 per skill before he will record it on SkillPass.', at: '2026-09-22T19:30:00', status: 'open' }];


export const concernLabels = {
  payment: 'Asked for payment',
  pressure: 'Pressure or threats',
  false_record: 'Record I did not earn',
  other: 'Something else'
} as const;

export const auditReasonLabel = {
  random: 'Random sample',
  risk: 'Risk-based',
  probation: 'Probation',
  misconduct: 'Misconduct review'
} as const;