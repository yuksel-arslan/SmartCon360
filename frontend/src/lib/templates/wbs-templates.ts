/**
 * WBS (Work Breakdown Structure) Templates
 *
 * Supported standards:
 * - Uniclass 2015 (UK — default) — EF (Elements/Functions) table
 * - OmniClass (International)
 * - Custom — user-defined WBS
 *
 * Templates are project-type specific, providing relevant WBS nodes
 * for hotel, hospital, residential, commercial, industrial, infrastructure.
 */

export interface WbsTemplateNode {
  code: string;
  name: string;
  description?: string;
  children?: WbsTemplateNode[];
}

export interface WbsTemplate {
  standard: string;
  label: string;
  description: string;
  nodes: WbsTemplateNode[];
}

// ============================================================================
// UNICLASS 2015 — EF (Elements/Functions) based WBS
// ============================================================================

const UNICLASS_BASE: WbsTemplateNode[] = [
  {
    code: 'EF_20',
    name: 'Structural elements',
    children: [
      { code: 'EF_20_05', name: 'Substructure', children: [
        { code: 'EF_20_05_30', name: 'Foundation systems' },
        { code: 'EF_20_05_50', name: 'Lowest floor construction' },
        { code: 'EF_20_05_65', name: 'Retaining wall systems' },
      ]},
      { code: 'EF_20_10', name: 'Superstructure frame', children: [
        { code: 'EF_20_10_15', name: 'Column systems' },
        { code: 'EF_20_10_30', name: 'Floor construction' },
        { code: 'EF_20_10_70', name: 'Roof structure' },
      ]},
      { code: 'EF_20_15', name: 'Stair and ramp elements' },
    ],
  },
  {
    code: 'EF_25',
    name: 'Wall and barrier elements',
    children: [
      { code: 'EF_25_10', name: 'External wall systems', children: [
        { code: 'EF_25_10_15', name: 'Curtain walling' },
        { code: 'EF_25_10_50', name: 'Masonry wall systems' },
      ]},
      { code: 'EF_25_20', name: 'Internal wall systems', children: [
        { code: 'EF_25_20_40', name: 'Lightweight partition systems' },
        { code: 'EF_25_20_50', name: 'Masonry partition systems' },
      ]},
      { code: 'EF_25_30', name: 'Door and window systems' },
      { code: 'EF_25_60', name: 'Waterproofing and tanking' },
    ],
  },
  {
    code: 'EF_30',
    name: 'Roof elements',
    children: [
      { code: 'EF_30_10', name: 'Roof covering systems' },
      { code: 'EF_30_20', name: 'Roof drainage' },
      { code: 'EF_30_30', name: 'Roof insulation' },
    ],
  },
  {
    code: 'EF_35',
    name: 'Floor and paving elements',
    children: [
      { code: 'EF_35_10', name: 'Floor finishes' },
      { code: 'EF_35_20', name: 'Floor insulation and screeds' },
      { code: 'EF_35_40', name: 'External paving' },
    ],
  },
  {
    code: 'EF_40',
    name: 'Ceiling and soffit elements',
    children: [
      { code: 'EF_40_10', name: 'Suspended ceiling systems' },
      { code: 'EF_40_20', name: 'Ceiling finishes' },
    ],
  },
  {
    code: 'EF_45',
    name: 'Piped supply systems',
    children: [
      { code: 'EF_45_10', name: 'Cold water supply' },
      { code: 'EF_45_20', name: 'Hot water supply' },
      { code: 'EF_45_30', name: 'Gas supply systems' },
      { code: 'EF_45_40', name: 'Fire suppression systems' },
    ],
  },
  {
    code: 'EF_50',
    name: 'Drainage and waste systems',
    children: [
      { code: 'EF_50_10', name: 'Foul drainage systems' },
      { code: 'EF_50_20', name: 'Surface water drainage' },
    ],
  },
  {
    code: 'EF_55',
    name: 'Heating, cooling and refrigeration',
    children: [
      { code: 'EF_55_10', name: 'Heating systems' },
      { code: 'EF_55_20', name: 'Cooling systems' },
      { code: 'EF_55_30', name: 'Heat recovery' },
    ],
  },
  {
    code: 'EF_60',
    name: 'Ventilation and air conditioning',
    children: [
      { code: 'EF_60_10', name: 'Supply ventilation' },
      { code: 'EF_60_20', name: 'Extract ventilation' },
      { code: 'EF_60_30', name: 'Air conditioning' },
      { code: 'EF_60_40', name: 'Smoke ventilation' },
    ],
  },
  {
    code: 'EF_65',
    name: 'Electrical power and lighting',
    children: [
      { code: 'EF_65_10', name: 'HV/LV power distribution' },
      { code: 'EF_65_20', name: 'General lighting' },
      { code: 'EF_65_30', name: 'Emergency lighting' },
      { code: 'EF_65_40', name: 'Earthing and bonding' },
      { code: 'EF_65_50', name: 'Lightning protection' },
    ],
  },
  {
    code: 'EF_70',
    name: 'Communication and security',
    children: [
      { code: 'EF_70_10', name: 'Data and telecommunications' },
      { code: 'EF_70_20', name: 'Fire detection and alarm' },
      { code: 'EF_70_30', name: 'Security systems' },
      { code: 'EF_70_40', name: 'Building management systems' },
    ],
  },
  {
    code: 'EF_75',
    name: 'Transport systems',
    children: [
      { code: 'EF_75_10', name: 'Lift systems' },
      { code: 'EF_75_20', name: 'Escalator systems' },
    ],
  },
  {
    code: 'EF_80',
    name: 'Fit-out elements',
    children: [
      { code: 'EF_80_10', name: 'Joinery and cabinetry' },
      { code: 'EF_80_20', name: 'Painting and decoration' },
      { code: 'EF_80_30', name: 'Furniture and equipment' },
      { code: 'EF_80_40', name: 'Signage' },
    ],
  },
  {
    code: 'EF_85',
    name: 'External works',
    children: [
      { code: 'EF_85_10', name: 'Hard landscaping' },
      { code: 'EF_85_20', name: 'Soft landscaping' },
      { code: 'EF_85_30', name: 'External drainage' },
      { code: 'EF_85_40', name: 'External lighting' },
      { code: 'EF_85_50', name: 'Fencing and barriers' },
    ],
  },
];


// ============================================================================
// Project-type WBS filters — returns relevant nodes for each project type
// ============================================================================

function filterForProjectType(
  nodes: WbsTemplateNode[],
  _projectType: string,
): WbsTemplateNode[] {
  // All project types get the full WBS — the template is already comprehensive.
  // In the future, we can add project-type-specific filtering/additions.
  return nodes;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const WBS_STANDARDS = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK standard — Elements/Functions classification', region: 'UK/International' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually', region: 'Any' },
] as const;

export type WbsStandard = typeof WBS_STANDARDS[number]['value'];

const STANDARD_MAP: Record<string, { label: string; description: string; nodes: WbsTemplateNode[] }> = {
  uniclass: {
    label: 'Uniclass 2015',
    description: 'UK NBS standard — EF (Elements/Functions) table',
    nodes: UNICLASS_BASE,
  },
};

export function getWbsTemplate(standard: string, projectType: string): WbsTemplate | null {
  const base = STANDARD_MAP[standard];
  if (!base) return null;

  return {
    standard,
    label: base.label,
    description: base.description,
    nodes: filterForProjectType(base.nodes, projectType),
  };
}

export function getAvailableStandards() {
  return WBS_STANDARDS;
}

/**
 * Flatten WBS template nodes into a list for bulk DB insertion.
 * Returns flat array with parentCode references for building hierarchy.
 */
export function flattenWbsNodes(
  nodes: WbsTemplateNode[],
  standard: string,
  parentCode?: string,
  level: number = 1,
  sortStart: number = 0,
): { code: string; name: string; description?: string; standard: string; level: number; sortOrder: number; parentCode?: string }[] {
  const result: ReturnType<typeof flattenWbsNodes> = [];
  let sortOrder = sortStart;

  for (const node of nodes) {
    result.push({
      code: node.code,
      name: node.name,
      description: node.description,
      standard,
      level,
      sortOrder: sortOrder++,
      parentCode,
    });

    if (node.children) {
      result.push(...flattenWbsNodes(node.children, standard, node.code, level + 1, 0));
    }
  }

  return result;
}
