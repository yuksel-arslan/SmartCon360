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
// OMNICLASS TABLE 33 — Disciplines-based WBS (level 1-2, 72 items)
// ============================================================================

const OMNICLASS_BASE: WbsTemplateNode[] = [
  {
    code: '33-11 00 00',
    name: 'Planning Disciplines',
    children: [
      { code: '33-11 11 00', name: 'Regional Planning' },
      { code: '33-11 21 00', name: 'Development Planning' },
      { code: '33-11 31 00', name: 'Rural Planning' },
      { code: '33-11 41 00', name: 'Urban Planning' },
      { code: '33-11 44 00', name: 'Transportation Planning' },
      { code: '33-11 51 00', name: 'Environmental Planning' },
      { code: '33-11 61 00', name: 'Facility Conservation Planning' },
    ],
  },
  {
    code: '33-21 00 00',
    name: 'Design Disciplines',
    children: [
      { code: '33-21 11 00', name: 'Architecture' },
      { code: '33-21 21 00', name: 'Landscape Architecture' },
      { code: '33-21 23 00', name: 'Interior Design' },
      { code: '33-21 27 00', name: 'Graphic Design' },
      { code: '33-21 25 00', name: 'Specifying' },
      { code: '33-21 31 00', name: 'Engineering' },
      { code: '33-21 51 00', name: 'Design Support' },
      { code: '33-21 99 00', name: 'Specialty Design' },
    ],
  },
  {
    code: '33-23 00 00',
    name: 'Investigation Disciplines',
    children: [
      { code: '33-23 11 00', name: 'Surveying' },
      { code: '33-23 21 00', name: 'Environmental Investigation' },
      { code: '33-23 31 00', name: 'Hydrological Investigation' },
      { code: '33-23 41 00', name: 'Geotechnical Investigation' },
      { code: '33-23 51 00', name: 'Risk Assessment' },
    ],
  },
  {
    code: '33-25 00 00',
    name: 'Project Management Disciplines',
    children: [
      { code: '33-25 11 00', name: 'Cost Estimation' },
      { code: '33-25 14 00', name: 'Proposal Preparation' },
      { code: '33-25 15 00', name: 'Architectural and Engineering Management' },
      { code: '33-25 16 00', name: 'Construction Management' },
      { code: '33-25 21 00', name: 'Scheduling' },
      { code: '33-25 31 00', name: 'Contract Administration' },
      { code: '33-25 41 00', name: 'Procurement Administration' },
      { code: '33-25 51 00', name: 'Quality Assurance' },
      { code: '33-25 61 00', name: 'Property, Real Estate, and Community Association Management' },
    ],
  },
  {
    code: '33-41 00 00',
    name: 'Construction Disciplines',
    children: [
      { code: '33-41 01 00', name: 'Material Moving Operations' },
      { code: '33-41 03 00', name: 'Site Preparation' },
      { code: '33-41 06 00', name: 'Construction Labor, General' },
      { code: '33-41 09 00', name: 'Supply Services' },
      { code: '33-41 10 00', name: 'Carpentry' },
      { code: '33-41 21 00', name: 'Iron Working' },
      { code: '33-41 23 00', name: 'Boilermaker' },
      { code: '33-41 24 00', name: 'Sheet Metal Working' },
      { code: '33-41 30 00', name: 'Masonry Contracting' },
      { code: '33-41 31 00', name: 'Concrete Contracting' },
      { code: '33-41 33 00', name: 'Plaster Contracting' },
      { code: '33-41 40 00', name: 'Cladding Contracting' },
      { code: '33-41 43 00', name: 'Roofing Contracting' },
      { code: '33-41 46 00', name: 'Glazing Contracting' },
      { code: '33-41 51 00', name: 'Paneling Contracting' },
      { code: '33-41 53 00', name: 'Flooring Contracting' },
      { code: '33-41 54 00', name: 'Tile Setting' },
      { code: '33-41 56 00', name: 'Painting Contracting' },
      { code: '33-41 60 00', name: 'Insulating Contracting' },
      { code: '33-41 63 00', name: 'Plumbing Contracting' },
      { code: '33-41 64 00', name: 'Waste Management Services' },
      { code: '33-41 71 00', name: 'Refrigeration Contracting' },
      { code: '33-41 73 00', name: 'Heating, Ventilation, and Air-Conditioning Contracting' },
      { code: '33-41 76 00', name: 'Electrical Contracting' },
      { code: '33-41 79 00', name: 'Control and Communication Services' },
      { code: '33-41 81 00', name: 'Environmental Energy Services' },
      { code: '33-41 83 00', name: 'Fire Protection Contracting' },
      { code: '33-41 86 00', name: 'Conveyance Contracting' },
      { code: '33-41 91 00', name: 'Infrastructure Development' },
    ],
  },
  {
    code: '33-55 00 00',
    name: 'Facility Use Disciplines',
    children: [
      { code: '33-55 14 00', name: 'Real Estate' },
      { code: '33-55 21 00', name: 'Facility Owner' },
      { code: '33-55 24 00', name: 'Facility Operations' },
      { code: '33-55 36 00', name: 'Facility Restoration Services' },
    ],
  },
  {
    code: '33-81 00 00',
    name: 'Support Disciplines',
    children: [
      { code: '33-81 11 00', name: 'Legal Services' },
      { code: '33-81 21 00', name: 'Administrative and General Consulting' },
      { code: '33-81 31 00', name: 'Finance' },
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
  { value: 'omniclass', label: 'OmniClass', description: 'International — Table 33 Disciplines (251 items)', region: 'International' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually', region: 'Any' },
] as const;

export type WbsStandard = typeof WBS_STANDARDS[number]['value'];

const STANDARD_MAP: Record<string, { label: string; description: string; nodes: WbsTemplateNode[] }> = {
  uniclass: {
    label: 'Uniclass 2015',
    description: 'UK NBS standard — EF (Elements/Functions) table',
    nodes: UNICLASS_BASE,
  },
  omniclass: {
    label: 'OmniClass',
    description: 'International — Table 33 Disciplines (72 items, 2 levels)',
    nodes: OMNICLASS_BASE,
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
