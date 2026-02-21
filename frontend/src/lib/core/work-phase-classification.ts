/**
 * Work Phase Classification — OmniClass Table 21 / Uniclass 2015 Aligned
 *
 * Standard construction work phases for Takt Time Planning.
 * Based on OmniClass Table 21 (Elements) and Uniclass 2015 EF/Ss tables.
 *
 * References:
 *   OmniClass Table 21 — Elements (by function)
 *     21-01  Substructure
 *     21-02  Shell (Superstructure, Exterior Enclosure, Roofing)
 *     21-03  Interiors (Interior Construction, Interior Finishes)
 *     21-04  Services (MEP: Plumbing, HVAC, Fire Protection, Electrical, Comms)
 *     21-05  Equipment & Furnishings
 *     21-06  Special Construction & Demolition
 *     21-07  Sitework
 *
 *   Uniclass 2015 — EF (Elements/Functions) + Ss (Systems)
 *     EF_20  Structural elements             → Shell & Core
 *     EF_25  Wall and barrier elements        → Shell (external) / Fit-Out (internal)
 *     EF_30  Roof elements                    → Shell & Core
 *     EF_37  Ceiling and soffit elements      → Fit-Out
 *     EF_50–65 Services                       → MEP 1st Fix / 2nd Fix
 *     EF_70–75 Electrical / Comms             → MEP 1st Fix / 2nd Fix
 *     EF_85  Fittings, fixtures, equipment    → Fit-Out
 *     EF_90  External / site elements         → Externals
 *
 * Standard Takt Train Phases (Porsche Consulting / IGLC methodology):
 *   Shell & Core → Facade → MEP 1st Fix → Fit-Out 1st Fix →
 *   MEP 2nd Fix → Fit-Out 2nd Fix (Finishes) → FF&E → T&C → Externals
 */

// ─── Takt Phase Enum ────────────────────────────────────────────────

export type TaktPhase =
  | 'substructure'       // OmniClass 21-01: Foundations, piling, ground works
  | 'shell-and-core'     // OmniClass 21-02: Superstructure, structural frame
  | 'facade-envelope'    // OmniClass 21-02 20: Exterior enclosure, curtain wall, roofing
  | 'mep-first-fix'      // OmniClass 21-04 (rough-in): Containment, pipework, ductwork, cabling
  | 'fitout-first-fix'   // OmniClass 21-03 10: Partitions, door frames, ceiling grid
  | 'mep-second-fix'     // OmniClass 21-04 (finish): Terminals, luminaires, sanitaryware
  | 'fitout-second-fix'  // OmniClass 21-03 20: Painting, flooring, ceiling tiles, joinery
  | 'ffe-specialist'     // OmniClass 21-05: Furniture, fixtures, equipment
  | 'testing-commissioning' // Commissioning, fire testing, BMS integration
  | 'externals';         // OmniClass 21-07: Landscaping, external services, sitework

/**
 * Simplified two-phase grouping for Takt Plan tabs.
 * Groups the 10 detailed phases into two macro trains.
 */
export type TaktPlanGroup = 'shell' | 'fitout';

// ─── Phase Metadata ─────────────────────────────────────────────────

export interface TaktPhaseInfo {
  id: TaktPhase;
  omniclass: string;       // OmniClass Table 21 code
  uniclass: string;        // Uniclass 2015 EF code(s)
  label: string;           // Standard English display name
  shortLabel: string;      // Compact label for tabs/badges
  group: TaktPlanGroup;    // Which macro group this belongs to
  sortOrder: number;       // Standard sequence in takt train
  color: string;           // Theme color
}

export const TAKT_PHASES: TaktPhaseInfo[] = [
  {
    id: 'substructure',
    omniclass: '21-01',
    uniclass: 'EF_20',
    label: 'Substructure',
    shortLabel: 'Substructure',
    group: 'shell',
    sortOrder: 1,
    color: '#92400E',
  },
  {
    id: 'shell-and-core',
    omniclass: '21-02 10',
    uniclass: 'EF_20',
    label: 'Shell & Core',
    shortLabel: 'Shell & Core',
    group: 'shell',
    sortOrder: 2,
    color: '#6366F1',
  },
  {
    id: 'facade-envelope',
    omniclass: '21-02 20',
    uniclass: 'EF_25/EF_30',
    label: 'Facade & Envelope',
    shortLabel: 'Facade',
    group: 'shell',
    sortOrder: 3,
    color: '#0EA5E9',
  },
  {
    id: 'mep-first-fix',
    omniclass: '21-04',
    uniclass: 'EF_50–75',
    label: 'MEP First Fix',
    shortLabel: 'MEP 1st Fix',
    group: 'shell',
    sortOrder: 4,
    color: '#8B5CF6',
  },
  {
    id: 'fitout-first-fix',
    omniclass: '21-03 10',
    uniclass: 'EF_25/EF_37',
    label: 'Fit-Out First Fix',
    shortLabel: 'Fit-Out 1st',
    group: 'fitout',
    sortOrder: 5,
    color: '#A78BFA',
  },
  {
    id: 'mep-second-fix',
    omniclass: '21-04',
    uniclass: 'EF_50–75',
    label: 'MEP Second Fix',
    shortLabel: 'MEP 2nd Fix',
    group: 'fitout',
    sortOrder: 6,
    color: '#7C3AED',
  },
  {
    id: 'fitout-second-fix',
    omniclass: '21-03 20',
    uniclass: 'EF_25/EF_32/EF_37',
    label: 'Fit-Out Finishes',
    shortLabel: 'Finishes',
    group: 'fitout',
    sortOrder: 7,
    color: '#EC4899',
  },
  {
    id: 'ffe-specialist',
    omniclass: '21-05',
    uniclass: 'EF_85',
    label: 'FF&E & Specialist',
    shortLabel: 'FF&E',
    group: 'fitout',
    sortOrder: 8,
    color: '#F97316',
  },
  {
    id: 'testing-commissioning',
    omniclass: '21-04/21-06',
    uniclass: 'Ss_75',
    label: 'Testing & Commissioning',
    shortLabel: 'T&C',
    group: 'fitout',
    sortOrder: 9,
    color: '#14B8A6',
  },
  {
    id: 'externals',
    omniclass: '21-07',
    uniclass: 'EF_90',
    label: 'Externals & Sitework',
    shortLabel: 'Externals',
    group: 'fitout',
    sortOrder: 10,
    color: '#16A34A',
  },
];

export const TAKT_PHASE_MAP = new Map<TaktPhase, TaktPhaseInfo>(
  TAKT_PHASES.map((p) => [p.id, p]),
);

// ─── Plan Group Metadata ────────────────────────────────────────────

export interface TaktPlanGroupInfo {
  id: TaktPlanGroup;
  label: string;
  description: string;
  phases: TaktPhase[];
  color: string;
}

export const TAKT_PLAN_GROUPS: TaktPlanGroupInfo[] = [
  {
    id: 'shell',
    label: 'Shell & Core',
    description: 'Substructure, Superstructure, Facade, MEP 1st Fix',
    phases: ['substructure', 'shell-and-core', 'facade-envelope', 'mep-first-fix'],
    color: '#6366F1',
  },
  {
    id: 'fitout',
    label: 'Fit-Out & Finishes',
    description: 'Interior Construction, MEP 2nd Fix, Finishes, FF&E',
    phases: ['fitout-first-fix', 'mep-second-fix', 'fitout-second-fix', 'ffe-specialist', 'testing-commissioning', 'externals'],
    color: '#10B981',
  },
];

// ─── Trade → Phase Classification ───────────────────────────────────

/**
 * Keywords that classify a trade into a specific takt phase.
 * Based on OmniClass Table 22 (Work Results) trade name patterns.
 */
const PHASE_KEYWORDS: { phase: TaktPhase; keywords: string[] }[] = [
  // Substructure (OmniClass 22-02, 22-31)
  {
    phase: 'substructure',
    keywords: [
      'excavat', 'foundation', 'piling', 'pile', 'earthwork', 'ground',
      'subbase', 'base course', 'site clear', 'grading',
    ],
  },
  // Shell & Core — Superstructure (OmniClass 22-03, 22-05)
  {
    phase: 'shell-and-core',
    keywords: [
      'formwork', 'rebar', 'reinforc', 'concrete pour', 'concrete slab',
      'steel struct', 'stripping', 'precast', 'shear wall', 'core wall',
    ],
  },
  // Facade & Envelope (OmniClass 22-07, 22-08 exterior)
  {
    phase: 'facade-envelope',
    keywords: [
      'facade', 'curtain wall', 'cladding', 'exterior wall', 'external wall',
      'roofing', 'waterproof', 'insulation', 'glazing', 'window',
    ],
  },
  // MEP First Fix — Rough-in (OmniClass 22-21 to 22-28, rough)
  {
    phase: 'mep-first-fix',
    keywords: [
      'rough-in', 'rough in', 'ductwork', 'conduit', 'cable tray', 'cable pull',
      'containment', 'piping system', 'pipework', 'plumbing rough',
      'electrical rough', 'sprinkler main', 'fire suppression', 'suppression',
      'sprinkler', 'medical gas', 'fire protection', 'riser',
    ],
  },
  // Fit-Out First Fix — Internal construction (OmniClass 22-09 framing)
  {
    phase: 'fitout-first-fix',
    keywords: [
      'drywall', 'partition', 'blockwork', 'masonry', 'plaster',
      'stud frame', 'door frame', 'ceiling grid', 'raised floor',
      'access floor',
    ],
  },
  // MEP Second Fix — Finish (OmniClass 22-21 to 22-28, finish)
  {
    phase: 'mep-second-fix',
    keywords: [
      'lighting', 'luminaire', 'light fitting', 'switch', 'socket', 'outlet',
      'panel', 'switchgear', 'distribution board', 'fixture', 'sanitary',
      'plumbing fixture', 'diffuser', 'grille', 'fan coil', 'radiator',
      'thermostat', 'bms', 'building management', 'fire alarm', 'detection',
      'security', 'cctv', 'access control', 'data comm', 'nurse call',
      'ups', 'emergency power', 'testing', 'balancing', 'commissioning',
      'mep finish', 'equipment install',
    ],
  },
  // Fit-Out Second Fix — Finishes (OmniClass 22-09 finishes)
  {
    phase: 'fitout-second-fix',
    keywords: [
      'painting', 'paint', 'decoration', 'flooring', 'floor finish',
      'tiling', 'tile', 'ceiling tile', 'suspended ceiling', 'ceiling',
      'joinery', 'millwork', 'skirting', 'architrave', 'trim',
      'door leaf', 'ironmongery', 'hardware', 'door', 'cabinetry', 'cabinet',
    ],
  },
  // FF&E (OmniClass 22-11, 22-12)
  {
    phase: 'ffe-specialist',
    keywords: [
      'furniture', 'ff&e', 'ffe', 'furnish', 'signage', 'wayfinding',
      'blind', 'curtain', 'kitchen equip', 'catering', 'clean room',
      'elevator', 'lift install', 'escalator',
    ],
  },
  // Externals / Sitework (OmniClass 22-31 to 22-35)
  {
    phase: 'externals',
    keywords: [
      'landscap', 'planting', 'irrigation', 'paving', 'hard landscap',
      'soft landscap', 'fencing', 'barrier', 'external drain',
      'external elec', 'external light', 'car park', 'road',
      'kerb', 'curb', 'signage mark', 'external furniture',
    ],
  },
];

/**
 * Classify a trade into a TaktPhase based on its discipline and name.
 * Uses OmniClass Table 22 keyword patterns for classification.
 *
 * Fallback logic by discipline when no keyword match:
 *   structural   → shell-and-core
 *   mechanical   → mep-first-fix  (conservative: assume rough-in)
 *   electrical   → mep-first-fix  (conservative: assume rough-in)
 *   architectural → fitout-first-fix
 *   landscape    → externals
 */
export function classifyTradePhase(
  discipline: string | null | undefined,
  tradeName: string,
): TaktPhase {
  const name = tradeName.toLowerCase();

  // Check keyword matches (most specific wins — first match)
  for (const { phase, keywords } of PHASE_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) {
      return phase;
    }
  }

  // Discipline-based fallback
  if (!discipline) return 'shell-and-core';
  const d = discipline.toLowerCase();
  if (d === 'structural') return 'shell-and-core';
  if (d === 'mechanical') return 'mep-first-fix';
  if (d === 'electrical') return 'mep-first-fix';
  if (d === 'architectural') return 'fitout-first-fix';
  if (d === 'landscape') return 'externals';

  return 'shell-and-core';
}

/**
 * Classify a TradeTemplate category (from project-templates.ts) to a TaktPhase.
 */
export function classifyCategoryPhase(
  category: string,
  tradeName: string,
): TaktPhase {
  // Try keyword-based classification first
  const name = tradeName.toLowerCase();
  for (const { phase, keywords } of PHASE_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) {
      return phase;
    }
  }

  // Category fallback
  switch (category) {
    case 'structural': return 'shell-and-core';
    case 'mep': return 'mep-first-fix';
    case 'architectural': return 'fitout-first-fix';
    case 'finishing': return 'fitout-second-fix';
    case 'specialty': return 'ffe-specialist';
    default: return 'shell-and-core';
  }
}

/**
 * Get the plan group for a given phase.
 */
export function getPhaseGroup(phase: TaktPhase): TaktPlanGroup {
  return TAKT_PHASE_MAP.get(phase)?.group ?? 'shell';
}

/**
 * Check if a phase belongs to a plan group.
 */
export function phaseMatchesGroup(phase: TaktPhase, group: TaktPlanGroup): boolean {
  return getPhaseGroup(phase) === group;
}

// ─── Zone / Location Phase Classification ───────────────────────────

/**
 * Map location metadata phase to TaktPlanGroup.
 * Supports both legacy values ('structural'/'finishing') and new values ('shell'/'fitout').
 */
export function classifyLocationPhase(
  metadata: Record<string, unknown> | null | undefined,
): TaktPlanGroup | null {
  if (!metadata) return null;
  const phase = metadata.phase as string | undefined;
  if (!phase) return null;

  // Legacy values (backwards compatible)
  if (phase === 'structural') return 'shell';
  if (phase === 'finishing') return 'fitout';

  // New standard values
  if (phase === 'shell') return 'shell';
  if (phase === 'fitout') return 'fitout';

  return null;
}
