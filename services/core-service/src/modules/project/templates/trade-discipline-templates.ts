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

/**
 * Sub-activity within a wagon — visible when drilling into a wagon's detail view.
 * Each sub-activity has its own crew, duration, and internal dependencies.
 * Codes use parent prefix: EXC-SRV = Survey under Excavation & Foundation.
 */
export interface SubActivityTemplate {
  name: string;
  code: string;            // e.g., 'EXC-SRV' — prefixed with parent wagon abbreviation
  color: string;
  defaultCrewSize: number;
  durationMultiplier: number;  // relative to parent wagon duration (1.0 = full wagon time)
  predecessorCodes: string[];  // codes of sub-activities within the same wagon
  sortOrder: number;
}

export interface SubTradeTemplate {
  name: string;
  code: string;
  color: string;
  discipline: 'structural' | 'mechanical' | 'electrical' | 'architectural' | 'landscape';
  defaultCrewSize: number;
  durationMultiplier: number;  // relative to takt time (1.0 = 1 takt)
  predecessorCodes: string[];  // codes of trades that must finish before this starts
  sortOrder: number;
  subActivities?: SubActivityTemplate[];  // drill-down detail within this wagon
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
  {
    name: 'Excavation', code: 'STR-EXC', color: '#92400E', discipline: 'structural',
    defaultCrewSize: 8, durationMultiplier: 1.0, predecessorCodes: [], sortOrder: 1,
    subActivities: [
      { name: 'Survey & Setting Out', code: 'EXC-SRV', color: '#78350F', defaultCrewSize: 3, durationMultiplier: 0.15, predecessorCodes: [], sortOrder: 1 },
      { name: 'Bulk Excavation', code: 'EXC-BEX', color: '#92400E', defaultCrewSize: 8, durationMultiplier: 0.55, predecessorCodes: ['EXC-SRV'], sortOrder: 2 },
      { name: 'Sub-grade Preparation', code: 'EXC-SGP', color: '#B45309', defaultCrewSize: 6, durationMultiplier: 0.30, predecessorCodes: ['EXC-BEX'], sortOrder: 3 },
    ],
  },
  {
    name: 'Shoring (İksa)', code: 'STR-IKS', color: '#DC2626', discipline: 'structural',
    defaultCrewSize: 6, durationMultiplier: 0.8, predecessorCodes: [], sortOrder: 2,
    subActivities: [
      { name: 'Equipment Mobilization', code: 'IKS-MOB', color: '#DC2626', defaultCrewSize: 4, durationMultiplier: 0.15, predecessorCodes: [], sortOrder: 1 },
      { name: 'Sheet Pile / Secant Pile Installation', code: 'IKS-DRV', color: '#EF4444', defaultCrewSize: 6, durationMultiplier: 0.45, predecessorCodes: ['IKS-MOB'], sortOrder: 2 },
      { name: 'Anchoring & Bracing', code: 'IKS-ANC', color: '#F87171', defaultCrewSize: 4, durationMultiplier: 0.25, predecessorCodes: ['IKS-DRV'], sortOrder: 3 },
      { name: 'Monitoring & Instrumentation', code: 'IKS-MON', color: '#FCA5A5', defaultCrewSize: 2, durationMultiplier: 0.15, predecessorCodes: ['IKS-ANC'], sortOrder: 4 },
    ],
  },
  {
    name: 'Piling', code: 'STR-PIL', color: '#0369A1', discipline: 'structural',
    defaultCrewSize: 8, durationMultiplier: 1.0, predecessorCodes: ['STR-EXC'], sortOrder: 3,
    subActivities: [
      { name: 'Rig Mobilization', code: 'PIL-MOB', color: '#0369A1', defaultCrewSize: 4, durationMultiplier: 0.10, predecessorCodes: [], sortOrder: 1 },
      { name: 'Pile Driving / Boring', code: 'PIL-DRV', color: '#0284C7', defaultCrewSize: 8, durationMultiplier: 0.55, predecessorCodes: ['PIL-MOB'], sortOrder: 2 },
      { name: 'Pile Load Testing', code: 'PIL-TST', color: '#0EA5E9', defaultCrewSize: 3, durationMultiplier: 0.20, predecessorCodes: ['PIL-DRV'], sortOrder: 3 },
      { name: 'Pile Head Trimming', code: 'PIL-CUT', color: '#38BDF8', defaultCrewSize: 4, durationMultiplier: 0.15, predecessorCodes: ['PIL-TST'], sortOrder: 4 },
    ],
  },
  {
    name: 'Superstructure (FRC)', code: 'STR-FRC', color: '#6366F1', discipline: 'structural',
    defaultCrewSize: 10, durationMultiplier: 1.0, predecessorCodes: ['STR-EXC'], sortOrder: 4,
    subActivities: [
      // ── Foundation Phase (Temel) ────────────────────────────────────────
      { name: 'Blinding Concrete', code: 'FND-BLN', color: '#A16207', defaultCrewSize: 4, durationMultiplier: 0.03, predecessorCodes: [], sortOrder: 1 },
      { name: 'Foundation Waterproofing', code: 'FND-FWP', color: '#1E40AF', defaultCrewSize: 4, durationMultiplier: 0.05, predecessorCodes: ['FND-BLN'], sortOrder: 2 },
      { name: 'Foundation Formwork', code: 'FND-FFM', color: '#6D28D9', defaultCrewSize: 8, durationMultiplier: 0.08, predecessorCodes: ['FND-FWP'], sortOrder: 3 },
      { name: 'Foundation Reinforcement', code: 'FND-FRB', color: '#4338CA', defaultCrewSize: 8, durationMultiplier: 0.10, predecessorCodes: ['FND-FFM'], sortOrder: 4 },
      { name: 'Foundation Concrete Pour', code: 'FND-FCN', color: '#818CF8', defaultCrewSize: 10, durationMultiplier: 0.05, predecessorCodes: ['FND-FRB'], sortOrder: 5 },
      { name: 'Backfill & Compaction', code: 'FND-BKF', color: '#854D0E', defaultCrewSize: 6, durationMultiplier: 0.06, predecessorCodes: ['FND-FCN'], sortOrder: 6 },
      // ── Superstructure Phase (Karkas) ───────────────────────────────────
      { name: 'Column/Shear Wall Formwork', code: 'FRC-CFM', color: '#6366F1', defaultCrewSize: 8, durationMultiplier: 0.10, predecessorCodes: ['FND-FCN'], sortOrder: 7 },
      { name: 'Column/Shear Wall Rebar', code: 'FRC-CRB', color: '#4F46E5', defaultCrewSize: 6, durationMultiplier: 0.10, predecessorCodes: ['FRC-CFM'], sortOrder: 8 },
      { name: 'Column/Shear Wall Concrete', code: 'FRC-CCN', color: '#818CF8', defaultCrewSize: 10, durationMultiplier: 0.05, predecessorCodes: ['FRC-CRB'], sortOrder: 9 },
      { name: 'Slab Formwork', code: 'FRC-SFM', color: '#8B5CF6', defaultCrewSize: 8, durationMultiplier: 0.12, predecessorCodes: ['FRC-CCN'], sortOrder: 10 },
      { name: 'Slab Rebar', code: 'FRC-SRB', color: '#7C3AED', defaultCrewSize: 8, durationMultiplier: 0.12, predecessorCodes: ['FRC-SFM'], sortOrder: 11 },
      { name: 'Slab Concrete Pour', code: 'FRC-SCN', color: '#A78BFA', defaultCrewSize: 10, durationMultiplier: 0.05, predecessorCodes: ['FRC-SRB'], sortOrder: 12 },
      { name: 'Formwork Stripping', code: 'FRC-STP', color: '#C4B5FD', defaultCrewSize: 4, durationMultiplier: 0.09, predecessorCodes: ['FRC-SCN'], sortOrder: 13 },
    ],
  },
  { name: 'Steel Structure', code: 'STR-STL', color: '#3730A3', discipline: 'structural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: [], sortOrder: 5 },
  { name: 'Waterproofing', code: 'STR-WPR', color: '#2563EB', discipline: 'structural', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['STR-FRC'], sortOrder: 6 },
  { name: 'Insulation', code: 'STR-INS', color: '#D946EF', discipline: 'structural', defaultCrewSize: 4, durationMultiplier: 0.6, predecessorCodes: ['STR-WPR'], sortOrder: 7 },
];

// ============================================================================
// MECHANICAL DISCIPLINE
// ============================================================================

const MECHANICAL_TRADES: SubTradeTemplate[] = [
  { name: 'Plumbing Rough-in', code: 'MEC-PLB', color: '#3B82F6', discipline: 'mechanical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['STR-FRC'], sortOrder: 1 },
  { name: 'HVAC Ductwork', code: 'MEC-HVC', color: '#06B6D4', discipline: 'mechanical', defaultCrewSize: 5, durationMultiplier: 1.0, predecessorCodes: ['STR-FRC'], sortOrder: 2 },
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
  { name: 'Electrical Rough-in (Conduit)', code: 'ELC-RGH', color: '#F59E0B', discipline: 'electrical', defaultCrewSize: 4, durationMultiplier: 0.8, predecessorCodes: ['STR-FRC'], sortOrder: 1 },
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
  { name: 'Masonry / Blockwork', code: 'ARC-MSN', color: '#D97706', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: ['STR-FRC'], sortOrder: 1 },
  { name: 'Plastering (Internal)', code: 'ARC-PLS', color: '#FBBF24', discipline: 'architectural', defaultCrewSize: 5, durationMultiplier: 0.8, predecessorCodes: ['ARC-MSN', 'MEC-PLB', 'ELC-RGH'], sortOrder: 2 },
  { name: 'Drywall / Partitions', code: 'ARC-DRW', color: '#A78BFA', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: ['MEC-PLB', 'ELC-RGH'], sortOrder: 3 },
  { name: 'Facade / Curtain Wall', code: 'ARC-FAC', color: '#0EA5E9', discipline: 'architectural', defaultCrewSize: 6, durationMultiplier: 1.2, predecessorCodes: ['STR-FRC'], sortOrder: 4 },
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
  {
    name: 'Site Clearing & Grading', code: 'LND-CLR', color: '#854D0E', discipline: 'landscape',
    defaultCrewSize: 6, durationMultiplier: 1.0, predecessorCodes: [], sortOrder: 1,
    subActivities: [
      { name: 'Site Survey & Staking', code: 'CLR-SRV', color: '#78350F', defaultCrewSize: 3, durationMultiplier: 0.10, predecessorCodes: [], sortOrder: 1 },
      { name: 'Vegetation Clearing', code: 'CLR-VEG', color: '#15803D', defaultCrewSize: 6, durationMultiplier: 0.15, predecessorCodes: ['CLR-SRV'], sortOrder: 2 },
      { name: 'Topsoil Stripping', code: 'CLR-TOP', color: '#A16207', defaultCrewSize: 5, durationMultiplier: 0.12, predecessorCodes: ['CLR-VEG'], sortOrder: 3 },
      { name: 'Demolition & Removal', code: 'CLR-DEM', color: '#991B1B', defaultCrewSize: 8, durationMultiplier: 0.20, predecessorCodes: ['CLR-SRV'], sortOrder: 4 },
      { name: 'Cut & Fill Earthworks', code: 'CLR-CUT', color: '#854D0E', defaultCrewSize: 8, durationMultiplier: 0.23, predecessorCodes: ['CLR-TOP', 'CLR-DEM'], sortOrder: 5 },
      { name: 'Fine Grading & Compaction', code: 'CLR-GRD', color: '#92400E', defaultCrewSize: 6, durationMultiplier: 0.12, predecessorCodes: ['CLR-CUT'], sortOrder: 6 },
      { name: 'Erosion & Sediment Control', code: 'CLR-ERC', color: '#1D4ED8', defaultCrewSize: 4, durationMultiplier: 0.08, predecessorCodes: ['CLR-GRD'], sortOrder: 7 },
    ],
  },
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
        { name: 'Medical Gas Systems', code: 'MEC-MED', color: '#14B8A6', discipline: 'mechanical', defaultCrewSize: 3, durationMultiplier: 0.8, predecessorCodes: ['STR-FRC'], sortOrder: 8 },
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
      { discipline: 'structural', included: true, excludeCodes: ['STR-FRC', 'STR-INS'] },
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
