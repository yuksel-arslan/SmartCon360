/**
 * Work Phase Classification — OmniClass Table 21 / Uniclass 2015 Aligned
 *
 * Classifies trades and zones into takt plan groups for phase-zone matching.
 * Ensures excavation trades only appear in substructure zones, shell trades
 * only in floor-based zones, etc.
 *
 * Ported from frontend/src/lib/core/work-phase-classification.ts
 */

export type TaktPhase =
  | 'substructure'
  | 'shell-and-core'
  | 'facade-envelope'
  | 'mep-first-fix'
  | 'fitout-first-fix'
  | 'mep-second-fix'
  | 'fitout-second-fix'
  | 'ffe-specialist'
  | 'testing-commissioning'
  | 'externals';

export type TaktPlanGroup = 'substructure' | 'shell' | 'fitout';

const PHASE_TO_GROUP: Record<TaktPhase, TaktPlanGroup> = {
  'substructure': 'substructure',
  'shell-and-core': 'shell',
  'facade-envelope': 'shell',
  'mep-first-fix': 'shell',
  'fitout-first-fix': 'fitout',
  'mep-second-fix': 'fitout',
  'fitout-second-fix': 'fitout',
  'ffe-specialist': 'fitout',
  'testing-commissioning': 'fitout',
  'externals': 'fitout',
};

const PHASE_KEYWORDS: { phase: TaktPhase; keywords: string[] }[] = [
  {
    phase: 'substructure',
    keywords: [
      'excavat', 'foundation', 'piling', 'pile', 'earthwork', 'ground',
      'subbase', 'base course', 'site clear', 'grading', 'dewater',
      'shoring', 'sheet pile', 'retention', 'raft', 'strip found',
      'pad found', 'secant', 'diaphragm wall', 'ground beam',
      'blinding', 'lean concrete', 'sub-slab', 'damp proof',
    ],
  },
  {
    phase: 'shell-and-core',
    keywords: [
      'formwork', 'rebar', 'reinforc', 'concrete pour', 'concrete slab',
      'steel struct', 'stripping', 'precast', 'shear wall', 'core wall',
      'column', 'beam', 'slab', 'staircase', 'lift shaft',
    ],
  },
  {
    phase: 'facade-envelope',
    keywords: [
      'facade', 'curtain wall', 'cladding', 'exterior wall', 'external wall',
      'roofing', 'waterproof', 'insulation', 'glazing', 'window',
    ],
  },
  {
    phase: 'mep-first-fix',
    keywords: [
      'rough-in', 'rough in', 'ductwork', 'conduit', 'cable tray', 'cable pull',
      'containment', 'piping system', 'pipework', 'plumbing rough',
      'electrical rough', 'sprinkler main', 'fire suppression', 'suppression',
      'sprinkler', 'medical gas', 'fire protection', 'riser',
    ],
  },
  {
    phase: 'fitout-first-fix',
    keywords: [
      'drywall', 'partition', 'blockwork', 'masonry', 'plaster',
      'stud frame', 'door frame', 'ceiling grid', 'raised floor',
      'access floor',
    ],
  },
  {
    phase: 'mep-second-fix',
    keywords: [
      'lighting', 'luminaire', 'light fitting', 'switch', 'socket', 'outlet',
      'panel', 'switchgear', 'distribution board', 'fixture', 'sanitary',
      'plumbing fixture', 'diffuser', 'grille', 'fan coil', 'radiator',
      'thermostat', 'bms', 'building management', 'fire alarm', 'detection',
      'security', 'cctv', 'access control', 'data comm', 'nurse call',
    ],
  },
  {
    phase: 'fitout-second-fix',
    keywords: [
      'painting', 'paint', 'decoration', 'flooring', 'floor finish',
      'tiling', 'tile', 'ceiling tile', 'suspended ceiling', 'ceiling',
      'joinery', 'millwork', 'skirting', 'architrave', 'trim',
      'door leaf', 'ironmongery', 'hardware', 'door', 'cabinetry', 'cabinet',
    ],
  },
  {
    phase: 'ffe-specialist',
    keywords: [
      'furniture', 'ff&e', 'ffe', 'furnish', 'signage', 'wayfinding',
      'blind', 'curtain', 'kitchen equip', 'catering', 'clean room',
      'elevator', 'lift install', 'escalator',
    ],
  },
  {
    phase: 'externals',
    keywords: [
      'landscap', 'planting', 'irrigation', 'paving', 'hard landscap',
      'soft landscap', 'fencing', 'barrier', 'external drain',
      'external elec', 'external light', 'car park', 'road',
    ],
  },
];

export function classifyTradePhase(
  discipline: string | null | undefined,
  tradeName: string,
): TaktPhase {
  const name = tradeName.toLowerCase();

  for (const { phase, keywords } of PHASE_KEYWORDS) {
    if (keywords.some((kw) => name.includes(kw))) {
      return phase;
    }
  }

  if (!discipline) return 'shell-and-core';
  const d = discipline.toLowerCase();
  if (d === 'structural') return 'shell-and-core';
  if (d === 'mechanical') return 'mep-first-fix';
  if (d === 'electrical') return 'mep-first-fix';
  if (d === 'architectural') return 'fitout-first-fix';
  if (d === 'landscape') return 'externals';

  return 'shell-and-core';
}

export function getPhaseGroup(phase: TaktPhase): TaktPlanGroup {
  return PHASE_TO_GROUP[phase] ?? 'shell';
}

export function classifyLocationPhase(
  metadata: Record<string, unknown> | null | undefined,
): TaktPlanGroup | null {
  if (!metadata) return null;
  const phase = metadata.phase as string | undefined;
  if (!phase) return null;

  if (phase === 'structural') return 'shell';
  if (phase === 'finishing') return 'fitout';
  if (phase === 'substructure') return 'substructure';
  if (phase === 'shell') return 'shell';
  if (phase === 'fitout') return 'fitout';

  return null;
}
