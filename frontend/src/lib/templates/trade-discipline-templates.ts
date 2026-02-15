/**
 * Trade Discipline Templates
 *
 * Provides sub-trade (wagon) definitions organized by discipline
 * for automatic Takt plan generation.
 *
 * Disciplines: Structural, Mechanical, Electrical, Architectural, Landscape
 *
 * Each sub-trade is a "wagon" in the Takt train — a unit of work
 * that flows through zones sequentially.
 */

export interface SubTradeTemplate {
  name: string;
  code: string;
  color: string;
  discipline: 'structural' | 'mechanical' | 'electrical' | 'architectural' | 'landscape';
  defaultCrewSize: number;
  durationMultiplier: number;  // relative to takt time (1.0 = 1 takt)
  predecessorCodes: string[];  // codes of trades that must finish before this starts
  sortOrder: number;
}

export interface DisciplineTemplate {
  discipline: string;
  label: string;
  color: string;
  subTrades: SubTradeTemplate[];
}

// ============================================================================
// STRUCTURAL DISCIPLINE
// ============================================================================

const STRUCTURAL_TRADES: SubTradeTemplate[] = [
  { name: 'Excavation & Foundation', code: 'STR-EXC', color: '#92400E', discipline: 'structural', defaultCrewSize: 8, durationMultiplier: 1.2, predecessorCodes: [], sortOrder: 1 },
  { name: 'Formwork', code: 'STR-FRM', color: '#6366F1', discipline: 'structural', defaultCrewSize: 8, durationMultiplier: 1.0, predecessorCodes: ['STR-EXC'], sortOrder: 2 },
  { name: 'Rebar / Reinforcement', code: 'STR-RBR', color: '#4F46E5', discipline: 'structural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: ['STR-FRM'], sortOrder: 3 },
  { name: 'Concrete Pour', code: 'STR-CON', color: '#818CF8', discipline: 'structural', defaultCrewSize: 10, durationMultiplier: 0.5, predecessorCodes: ['STR-RBR'], sortOrder: 4 },
  { name: 'Formwork Stripping', code: 'STR-STP', color: '#A78BFA', discipline: 'structural', defaultCrewSize: 4, durationMultiplier: 0.5, predecessorCodes: ['STR-CON'], sortOrder: 5 },
  { name: 'Steel Structure', code: 'STR-STL', color: '#3730A3', discipline: 'structural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: [], sortOrder: 6 },
  { name: 'Waterproofing', code: 'STR-WPR', color: '#2563EB', discipline: 'structural', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['STR-STP'], sortOrder: 7 },
  { name: 'Insulation', code: 'STR-INS', color: '#D946EF', discipline: 'structural', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['STR-WPR'], sortOrder: 8 },
];

// ============================================================================
// MECHANICAL DISCIPLINE
// ============================================================================

const MECHANICAL_TRADES: SubTradeTemplate[] = [
  { name: 'Plumbing Rough-in', code: 'MEC-PLB', color: '#3B82F6', discipline: 'mechanical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['STR-STP'], sortOrder: 1 },
  { name: 'HVAC Ductwork', code: 'MEC-HVC', color: '#06B6D4', discipline: 'mechanical', defaultCrewSize: 5, durationMultiplier: 1.0, predecessorCodes: ['STR-STP'], sortOrder: 2 },
  { name: 'Fire Suppression (Sprinklers)', code: 'MEC-FPR', color: '#EF4444', discipline: 'mechanical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['MEC-HVC'], sortOrder: 3 },
  { name: 'Piping Systems', code: 'MEC-PIP', color: '#0EA5E9', discipline: 'mechanical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['MEC-PLB'], sortOrder: 4 },
  { name: 'Mechanical Equipment Installation', code: 'MEC-EQP', color: '#14B8A6', discipline: 'mechanical', defaultCrewSize: 4, durationMultiplier: 1.0, predecessorCodes: ['MEC-HVC', 'MEC-PIP'], sortOrder: 5 },
  { name: 'HVAC Testing & Balancing', code: 'MEC-TAB', color: '#0D9488', discipline: 'mechanical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['MEC-EQP'], sortOrder: 6 },
  { name: 'Plumbing Fixtures', code: 'MEC-FIX', color: '#2563EB', discipline: 'mechanical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['MEC-EQP'], sortOrder: 7 },
];

// ============================================================================
// ELECTRICAL DISCIPLINE
// ============================================================================

const ELECTRICAL_TRADES: SubTradeTemplate[] = [
  { name: 'Electrical Rough-in (Conduit)', code: 'ELC-RGH', color: '#F59E0B', discipline: 'electrical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['STR-STP'], sortOrder: 1 },
  { name: 'Cable Tray & Containment', code: 'ELC-CTR', color: '#D97706', discipline: 'electrical', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['ELC-RGH'], sortOrder: 2 },
  { name: 'Cable Pulling', code: 'ELC-CBL', color: '#B45309', discipline: 'electrical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['ELC-CTR'], sortOrder: 3 },
  { name: 'Switchgear & Panels', code: 'ELC-SWG', color: '#92400E', discipline: 'electrical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['ELC-CBL'], sortOrder: 4 },
  { name: 'Lighting Installation', code: 'ELC-LGT', color: '#FBBF24', discipline: 'electrical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['ELC-CBL'], sortOrder: 5 },
  { name: 'Fire Alarm & Detection', code: 'ELC-FAD', color: '#DC2626', discipline: 'electrical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['ELC-CBL'], sortOrder: 6 },
  { name: 'Data & Communications', code: 'ELC-DAT', color: '#7C3AED', discipline: 'electrical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['ELC-CTR'], sortOrder: 7 },
  { name: 'Security & CCTV', code: 'ELC-SEC', color: '#6D28D9', discipline: 'electrical', defaultCrewSize: 3, durationMultiplier: 0.4, predecessorCodes: ['ELC-CBL'], sortOrder: 8 },
  { name: 'BMS Controls', code: 'ELC-BMS', color: '#4C1D95', discipline: 'electrical', defaultCrewSize: 2, durationMultiplier: 0.6, predecessorCodes: ['ELC-SWG', 'MEC-TAB'], sortOrder: 9 },
];

// ============================================================================
// ARCHITECTURAL DISCIPLINE
// ============================================================================

const ARCHITECTURAL_TRADES: SubTradeTemplate[] = [
  { name: 'Masonry / Blockwork', code: 'ARC-MSN', color: '#D97706', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: ['STR-STP'], sortOrder: 1 },
  { name: 'Plastering (Internal)', code: 'ARC-PLS', color: '#FBBF24', discipline: 'architectural', defaultCrewSize: 5, durationMultiplier: 0.8, predecessorCodes: ['ARC-MSN', 'MEC-PLB', 'ELC-RGH'], sortOrder: 2 },
  { name: 'Drywall / Partitions', code: 'ARC-DRW', color: '#A78BFA', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: ['MEC-PLB', 'ELC-RGH'], sortOrder: 3 },
  { name: 'Facade / Curtain Wall', code: 'ARC-FAC', color: '#0EA5E9', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.2, predecessorCodes: ['STR-STP'], sortOrder: 4 },
  { name: 'Tiling (Floors & Walls)', code: 'ARC-TIL', color: '#10B981', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 1.0, predecessorCodes: ['ARC-PLS', 'MEC-PLB'], sortOrder: 5 },
  { name: 'Flooring', code: 'ARC-FLR', color: '#059669', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['ARC-DRW'], sortOrder: 6 },
  { name: 'Suspended Ceiling', code: 'ARC-CLG', color: '#64748B', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['MEC-EQP', 'ELC-LGT'], sortOrder: 7 },
  { name: 'Painting & Decoration', code: 'ARC-PNT', color: '#EC4899', discipline: 'architectural', defaultCrewSize: 5, durationMultiplier: 0.8, predecessorCodes: ['ARC-DRW', 'ARC-CLG'], sortOrder: 8 },
  { name: 'Doors & Hardware', code: 'ARC-DOR', color: '#78716C', discipline: 'architectural', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['ARC-PNT'], sortOrder: 9 },
  { name: 'Windows & Glazing', code: 'ARC-WND', color: '#38BDF8', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['ARC-MSN'], sortOrder: 10 },
  { name: 'Cabinetry & Millwork', code: 'ARC-CAB', color: '#92400E', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['ARC-PNT'], sortOrder: 11 },
  { name: 'FF&E (Furniture)', code: 'ARC-FFE', color: '#F97316', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['ARC-FLR', 'ARC-PNT'], sortOrder: 12 },
];

// ============================================================================
// LANDSCAPE DISCIPLINE
// ============================================================================

const LANDSCAPE_TRADES: SubTradeTemplate[] = [
  { name: 'Site Clearing & Grading', code: 'LND-CLR', color: '#854D0E', discipline: 'landscape', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: [], sortOrder: 1 },
  { name: 'Hard Landscaping (Paving)', code: 'LND-HRD', color: '#78716C', discipline: 'landscape', defaultCrewSize: 5, durationMultiplier: 1.0, predecessorCodes: ['LND-CLR'], sortOrder: 2 },
  { name: 'External Drainage', code: 'LND-DRN', color: '#2563EB', discipline: 'landscape', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['LND-CLR'], sortOrder: 3 },
  { name: 'External Electrical & Lighting', code: 'LND-ELC', color: '#F59E0B', discipline: 'landscape', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['LND-HRD'], sortOrder: 4 },
  { name: 'Irrigation Systems', code: 'LND-IRR', color: '#06B6D4', discipline: 'landscape', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['LND-DRN'], sortOrder: 5 },
  { name: 'Soft Landscaping (Planting)', code: 'LND-PLT', color: '#16A34A', discipline: 'landscape', defaultCrewSize: 5, durationMultiplier: 1.0, predecessorCodes: ['LND-IRR'], sortOrder: 6 },
  { name: 'Fencing & Barriers', code: 'LND-FNC', color: '#57534E', discipline: 'landscape', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['LND-HRD'], sortOrder: 7 },
  { name: 'External Furniture & Signage', code: 'LND-FRN', color: '#A16207', discipline: 'landscape', defaultCrewSize: 3, durationMultiplier: 0.4, predecessorCodes: ['LND-PLT'], sortOrder: 8 },
];

// ============================================================================
// ALL DISCIPLINES
// ============================================================================

export const DISCIPLINES: DisciplineTemplate[] = [
  {
    discipline: 'structural',
    label: 'Structural',
    color: '#6366F1',
    subTrades: STRUCTURAL_TRADES,
  },
  {
    discipline: 'mechanical',
    label: 'Mechanical',
    color: '#06B6D4',
    subTrades: MECHANICAL_TRADES,
  },
  {
    discipline: 'electrical',
    label: 'Electrical',
    color: '#F59E0B',
    subTrades: ELECTRICAL_TRADES,
  },
  {
    discipline: 'architectural',
    label: 'Architectural',
    color: '#EC4899',
    subTrades: ARCHITECTURAL_TRADES,
  },
  {
    discipline: 'landscape',
    label: 'Landscape',
    color: '#16A34A',
    subTrades: LANDSCAPE_TRADES,
  },
];

// ============================================================================
// PROJECT-TYPE SPECIFIC TRADE SELECTIONS
// ============================================================================

interface ProjectTypeDisciplineConfig {
  projectType: string;
  disciplines: {
    discipline: string;
    included: boolean;
    excludeCodes?: string[];  // Sub-trade codes to exclude for this project type
    extraTrades?: SubTradeTemplate[];  // Additional trades specific to this project type
  }[];
}

const PROJECT_DISCIPLINE_CONFIGS: ProjectTypeDisciplineConfig[] = [
  {
    projectType: 'hotel',
    disciplines: [
      { discipline: 'structural', included: true },
      { discipline: 'mechanical', included: true },
      { discipline: 'electrical', included: true },
      { discipline: 'architectural', included: true },
      { discipline: 'landscape', included: true },
    ],
  },
  {
    projectType: 'hospital',
    disciplines: [
      { discipline: 'structural', included: true },
      { discipline: 'mechanical', included: true, extraTrades: [
        { name: 'Medical Gas Systems', code: 'MEC-MED', color: '#14B8A6', discipline: 'mechanical', defaultCrewSize: 3, durationMultiplier: 0.8, predecessorCodes: ['STR-STP'], sortOrder: 8 },
        { name: 'Clean Room Systems', code: 'MEC-CLN', color: '#22D3EE', discipline: 'mechanical', defaultCrewSize: 4, durationMultiplier: 1.0, predecessorCodes: ['MEC-EQP'], sortOrder: 9 },
      ]},
      { discipline: 'electrical', included: true, extraTrades: [
        { name: 'UPS / Emergency Power', code: 'ELC-UPS', color: '#DC2626', discipline: 'electrical', defaultCrewSize: 3, durationMultiplier: 0.6, predecessorCodes: ['ELC-SWG'], sortOrder: 10 },
        { name: 'Nurse Call Systems', code: 'ELC-NCS', color: '#8B5CF6', discipline: 'electrical', defaultCrewSize: 2, durationMultiplier: 0.4, predecessorCodes: ['ELC-CBL'], sortOrder: 11 },
      ]},
      { discipline: 'architectural', included: true },
      { discipline: 'landscape', included: true },
    ],
  },
  {
    projectType: 'residential',
    disciplines: [
      { discipline: 'structural', included: true },
      { discipline: 'mechanical', included: true },
      { discipline: 'electrical', included: true },
      { discipline: 'architectural', included: true },
      { discipline: 'landscape', included: true },
    ],
  },
  {
    projectType: 'commercial',
    disciplines: [
      { discipline: 'structural', included: true },
      { discipline: 'mechanical', included: true },
      { discipline: 'electrical', included: true },
      { discipline: 'architectural', included: true, extraTrades: [
        { name: 'Raised Access Floor', code: 'ARC-RAF', color: '#94A3B8', discipline: 'architectural', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['MEC-PLB', 'ELC-RGH'], sortOrder: 13 },
      ]},
      { discipline: 'landscape', included: true },
    ],
  },
  {
    projectType: 'industrial',
    disciplines: [
      { discipline: 'structural', included: true },
      { discipline: 'mechanical', included: true },
      { discipline: 'electrical', included: true },
      { discipline: 'architectural', included: true, excludeCodes: ['ARC-CAB', 'ARC-FFE', 'ARC-TIL'] },
      { discipline: 'landscape', included: true, excludeCodes: ['LND-IRR', 'LND-PLT'] },
    ],
  },
  {
    projectType: 'infrastructure',
    disciplines: [
      { discipline: 'structural', included: true, excludeCodes: ['STR-FRM', 'STR-RBR', 'STR-CON', 'STR-STP', 'STR-INS'] },
      { discipline: 'mechanical', included: false },
      { discipline: 'electrical', included: true, excludeCodes: ['ELC-DAT', 'ELC-SEC', 'ELC-BMS'] },
      { discipline: 'architectural', included: false },
      { discipline: 'landscape', included: true },
    ],
  },
];

// ============================================================================
// PUBLIC API
// ============================================================================

export function getAllDisciplines(): DisciplineTemplate[] {
  return DISCIPLINES;
}

/**
 * Get trade templates for a specific project type.
 * Returns sub-trades organized by discipline, with project-type-specific
 * additions and exclusions applied.
 */
export function getTradesForProjectType(projectType: string): SubTradeTemplate[] {
  const config = PROJECT_DISCIPLINE_CONFIGS.find((c) => c.projectType === projectType);
  if (!config) {
    // Default: return all trades from all disciplines
    return DISCIPLINES.flatMap((d) => d.subTrades);
  }

  const result: SubTradeTemplate[] = [];
  let globalSort = 0;

  for (const dc of config.disciplines) {
    if (!dc.included) continue;

    const discipline = DISCIPLINES.find((d) => d.discipline === dc.discipline);
    if (!discipline) continue;

    let trades = [...discipline.subTrades];

    // Exclude certain trades for this project type
    if (dc.excludeCodes) {
      trades = trades.filter((t) => !dc.excludeCodes!.includes(t.code));
    }

    // Add extra trades for this project type
    if (dc.extraTrades) {
      trades.push(...dc.extraTrades);
    }

    // Re-sort within discipline
    trades.sort((a, b) => a.sortOrder - b.sortOrder);

    // Add with global sort order
    for (const trade of trades) {
      result.push({ ...trade, sortOrder: globalSort++ });
    }
  }

  return result;
}

/**
 * Get all discipline labels and colors.
 */
export function getDisciplineOptions(): { value: string; label: string; color: string }[] {
  return DISCIPLINES.map((d) => ({
    value: d.discipline,
    label: d.label,
    color: d.color,
  }));
}
