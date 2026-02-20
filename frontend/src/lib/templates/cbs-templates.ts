/**
 * CBS (Cost Breakdown Structure) Templates
 *
 * CBS is linked to WBS and provides cost categorization.
 * Supported: Uniclass 2015 Ss (Systems), OmniClass Table 33 (Disciplines), Custom
 *
 * CBS nodes map to CostPilot budget items for cost tracking.
 */

export interface CbsTemplateNode {
  code: string;
  name: string;
  description?: string;
  wbsCodes?: string[];  // Links to WBS EF codes
  children?: CbsTemplateNode[];
}

export interface CbsTemplate {
  standard: string;
  label: string;
  description: string;
  nodes: CbsTemplateNode[];
}

// ============================================================================
// UNICLASS 2015 — Ss (Systems) table for CBS
// ============================================================================

const UNICLASS_SS_BASE: CbsTemplateNode[] = [
  {
    code: 'Ss_15',
    name: 'Earthwork systems',
    wbsCodes: ['EF_20_05'],
    children: [
      { code: 'Ss_15_10', name: 'Excavation systems', wbsCodes: ['EF_20_05_30'] },
      { code: 'Ss_15_20', name: 'Filling and compaction systems' },
      { code: 'Ss_15_30', name: 'Ground stabilization systems' },
      { code: 'Ss_15_40', name: 'Dewatering systems' },
    ],
  },
  {
    code: 'Ss_20',
    name: 'Structural systems',
    wbsCodes: ['EF_20'],
    children: [
      { code: 'Ss_20_05', name: 'Foundation systems', wbsCodes: ['EF_20_05_30'] },
      { code: 'Ss_20_10', name: 'Floor systems', wbsCodes: ['EF_20_10_30'] },
      { code: 'Ss_20_15', name: 'Frame systems', wbsCodes: ['EF_20_10_15'] },
      { code: 'Ss_20_20', name: 'Beam systems' },
      { code: 'Ss_20_25', name: 'Roof structure systems', wbsCodes: ['EF_20_10_70'] },
      { code: 'Ss_20_30', name: 'Retaining systems', wbsCodes: ['EF_20_05_65'] },
      { code: 'Ss_20_50', name: 'Stair and ramp systems', wbsCodes: ['EF_20_15'] },
    ],
  },
  {
    code: 'Ss_25',
    name: 'Wall and barrier systems',
    wbsCodes: ['EF_25'],
    children: [
      { code: 'Ss_25_10', name: 'External wall systems', wbsCodes: ['EF_25_10'] },
      { code: 'Ss_25_11', name: 'Curtain wall systems', wbsCodes: ['EF_25_10_15'] },
      { code: 'Ss_25_12', name: 'Masonry external wall systems', wbsCodes: ['EF_25_10_50'] },
      { code: 'Ss_25_20', name: 'Internal wall systems', wbsCodes: ['EF_25_20'] },
      { code: 'Ss_25_22', name: 'Lightweight partition systems', wbsCodes: ['EF_25_20_40'] },
      { code: 'Ss_25_30', name: 'Door systems', wbsCodes: ['EF_25_30'] },
      { code: 'Ss_25_35', name: 'Window systems', wbsCodes: ['EF_25_30'] },
      { code: 'Ss_25_60', name: 'Waterproofing systems', wbsCodes: ['EF_25_60'] },
    ],
  },
  {
    code: 'Ss_30',
    name: 'Roof covering systems',
    wbsCodes: ['EF_30'],
    children: [
      { code: 'Ss_30_10', name: 'Roof weathering systems', wbsCodes: ['EF_30_10'] },
      { code: 'Ss_30_20', name: 'Roof drainage systems', wbsCodes: ['EF_30_20'] },
      { code: 'Ss_30_30', name: 'Roof insulation systems', wbsCodes: ['EF_30_30'] },
    ],
  },
  {
    code: 'Ss_32',
    name: 'Floor and paving systems',
    wbsCodes: ['EF_35'],
    children: [
      { code: 'Ss_32_10', name: 'Floor finish systems', wbsCodes: ['EF_35_10'] },
      { code: 'Ss_32_20', name: 'Floor screed systems', wbsCodes: ['EF_35_20'] },
      { code: 'Ss_32_40', name: 'External paving systems', wbsCodes: ['EF_35_40'] },
      { code: 'Ss_32_50', name: 'Raised floor systems' },
    ],
  },
  {
    code: 'Ss_35',
    name: 'Ceiling and soffit systems',
    wbsCodes: ['EF_40'],
    children: [
      { code: 'Ss_35_10', name: 'Suspended ceiling systems', wbsCodes: ['EF_40_10'] },
      { code: 'Ss_35_20', name: 'Ceiling finish systems', wbsCodes: ['EF_40_20'] },
    ],
  },
  {
    code: 'Ss_40',
    name: 'Piped supply systems',
    wbsCodes: ['EF_45'],
    children: [
      { code: 'Ss_40_10', name: 'Cold water supply systems', wbsCodes: ['EF_45_10'] },
      { code: 'Ss_40_20', name: 'Hot water supply systems', wbsCodes: ['EF_45_20'] },
      { code: 'Ss_40_30', name: 'Gas supply systems', wbsCodes: ['EF_45_30'] },
      { code: 'Ss_40_40', name: 'Steam supply systems' },
    ],
  },
  {
    code: 'Ss_45',
    name: 'Drainage systems',
    wbsCodes: ['EF_50'],
    children: [
      { code: 'Ss_45_10', name: 'Foul drainage systems', wbsCodes: ['EF_50_10'] },
      { code: 'Ss_45_20', name: 'Surface water drainage systems', wbsCodes: ['EF_50_20'] },
      { code: 'Ss_45_30', name: 'Sub-soil drainage systems' },
    ],
  },
  {
    code: 'Ss_50',
    name: 'Heating, cooling and refrigeration systems',
    wbsCodes: ['EF_55'],
    children: [
      { code: 'Ss_50_10', name: 'Heating systems', wbsCodes: ['EF_55_10'] },
      { code: 'Ss_50_20', name: 'Cooling systems', wbsCodes: ['EF_55_20'] },
      { code: 'Ss_50_30', name: 'Heat recovery systems', wbsCodes: ['EF_55_30'] },
      { code: 'Ss_50_40', name: 'Refrigeration systems' },
    ],
  },
  {
    code: 'Ss_55',
    name: 'Ventilation and air conditioning systems',
    wbsCodes: ['EF_60'],
    children: [
      { code: 'Ss_55_10', name: 'Supply ventilation systems', wbsCodes: ['EF_60_10'] },
      { code: 'Ss_55_20', name: 'Extract ventilation systems', wbsCodes: ['EF_60_20'] },
      { code: 'Ss_55_30', name: 'Air conditioning systems', wbsCodes: ['EF_60_30'] },
      { code: 'Ss_55_40', name: 'Smoke ventilation systems', wbsCodes: ['EF_60_40'] },
    ],
  },
  {
    code: 'Ss_60',
    name: 'Electrical power and lighting systems',
    wbsCodes: ['EF_65'],
    children: [
      { code: 'Ss_60_10', name: 'HV power distribution', wbsCodes: ['EF_65_10'] },
      { code: 'Ss_60_20', name: 'LV power distribution', wbsCodes: ['EF_65_10'] },
      { code: 'Ss_60_30', name: 'General lighting systems', wbsCodes: ['EF_65_20'] },
      { code: 'Ss_60_35', name: 'Emergency lighting systems', wbsCodes: ['EF_65_30'] },
      { code: 'Ss_60_40', name: 'Earthing and bonding', wbsCodes: ['EF_65_40'] },
      { code: 'Ss_60_50', name: 'Lightning protection', wbsCodes: ['EF_65_50'] },
    ],
  },
  {
    code: 'Ss_65',
    name: 'Communication, security and control systems',
    wbsCodes: ['EF_70'],
    children: [
      { code: 'Ss_65_10', name: 'Data and telecom systems', wbsCodes: ['EF_70_10'] },
      { code: 'Ss_65_20', name: 'Fire detection and alarm', wbsCodes: ['EF_70_20'] },
      { code: 'Ss_65_30', name: 'Security systems', wbsCodes: ['EF_70_30'] },
      { code: 'Ss_65_40', name: 'Building management systems', wbsCodes: ['EF_70_40'] },
      { code: 'Ss_65_50', name: 'Public address systems' },
    ],
  },
  {
    code: 'Ss_70',
    name: 'Transport systems',
    wbsCodes: ['EF_75'],
    children: [
      { code: 'Ss_70_10', name: 'Lift systems', wbsCodes: ['EF_75_10'] },
      { code: 'Ss_70_20', name: 'Escalator systems', wbsCodes: ['EF_75_20'] },
    ],
  },
  {
    code: 'Ss_75',
    name: 'Fire suppression systems',
    wbsCodes: ['EF_45_40'],
    children: [
      { code: 'Ss_75_10', name: 'Sprinkler systems' },
      { code: 'Ss_75_20', name: 'Gaseous suppression systems' },
      { code: 'Ss_75_30', name: 'Dry riser systems' },
    ],
  },
  {
    code: 'Ss_80',
    name: 'Fit-out systems',
    wbsCodes: ['EF_80'],
    children: [
      { code: 'Ss_80_10', name: 'Joinery and cabinetry systems', wbsCodes: ['EF_80_10'] },
      { code: 'Ss_80_20', name: 'Painting and decoration systems', wbsCodes: ['EF_80_20'] },
      { code: 'Ss_80_30', name: 'Furniture and equipment', wbsCodes: ['EF_80_30'] },
      { code: 'Ss_80_40', name: 'Signage systems', wbsCodes: ['EF_80_40'] },
    ],
  },
  {
    code: 'Ss_85',
    name: 'External works systems',
    wbsCodes: ['EF_85'],
    children: [
      { code: 'Ss_85_10', name: 'Hard landscaping systems', wbsCodes: ['EF_85_10'] },
      { code: 'Ss_85_20', name: 'Soft landscaping systems', wbsCodes: ['EF_85_20'] },
      { code: 'Ss_85_30', name: 'External drainage systems', wbsCodes: ['EF_85_30'] },
      { code: 'Ss_85_40', name: 'External lighting systems', wbsCodes: ['EF_85_40'] },
      { code: 'Ss_85_50', name: 'Fencing and barrier systems', wbsCodes: ['EF_85_50'] },
    ],
  },
];

// ============================================================================
// OMNICLASS TABLE 33 — Disciplines-based CBS (level 1-2)
// ============================================================================

const OMNICLASS_CBS_BASE: CbsTemplateNode[] = [
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
      { code: '33-21 25 00', name: 'Specifying' },
      { code: '33-21 31 00', name: 'Engineering' },
      { code: '33-21 51 00', name: 'Design Support' },
    ],
  },
  {
    code: '33-23 00 00',
    name: 'Investigation Disciplines',
    children: [
      { code: '33-23 11 00', name: 'Surveying' },
      { code: '33-23 21 00', name: 'Environmental Investigation' },
      { code: '33-23 41 00', name: 'Geotechnical Investigation' },
      { code: '33-23 51 00', name: 'Risk Assessment' },
    ],
  },
  {
    code: '33-25 00 00',
    name: 'Project Management Disciplines',
    children: [
      { code: '33-25 11 00', name: 'Cost Estimation' },
      { code: '33-25 16 00', name: 'Construction Management' },
      { code: '33-25 21 00', name: 'Scheduling' },
      { code: '33-25 31 00', name: 'Contract Administration' },
      { code: '33-25 41 00', name: 'Procurement Administration' },
      { code: '33-25 51 00', name: 'Quality Assurance' },
    ],
  },
  {
    code: '33-41 00 00',
    name: 'Construction Disciplines',
    children: [
      { code: '33-41 03 00', name: 'Site Preparation' },
      { code: '33-41 10 00', name: 'Carpentry' },
      { code: '33-41 21 00', name: 'Iron Working' },
      { code: '33-41 24 00', name: 'Sheet Metal Working' },
      { code: '33-41 30 00', name: 'Masonry Contracting' },
      { code: '33-41 31 00', name: 'Concrete Contracting' },
      { code: '33-41 40 00', name: 'Cladding Contracting' },
      { code: '33-41 43 00', name: 'Roofing Contracting' },
      { code: '33-41 46 00', name: 'Glazing Contracting' },
      { code: '33-41 53 00', name: 'Flooring Contracting' },
      { code: '33-41 56 00', name: 'Painting Contracting' },
      { code: '33-41 60 00', name: 'Insulating Contracting' },
      { code: '33-41 63 00', name: 'Plumbing Contracting' },
      { code: '33-41 73 00', name: 'HVAC Contracting' },
      { code: '33-41 76 00', name: 'Electrical Contracting' },
      { code: '33-41 83 00', name: 'Fire Protection Contracting' },
      { code: '33-41 86 00', name: 'Conveyance Contracting' },
      { code: '33-41 91 00', name: 'Infrastructure Development' },
    ],
  },
  {
    code: '33-55 00 00',
    name: 'Facility Use Disciplines',
    children: [
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
// PUBLIC API
// ============================================================================

export const CBS_STANDARDS = [
  { value: 'uniclass_ss', label: 'Uniclass 2015 Ss (Systems)', description: 'UK standard — Systems classification for CBS', region: 'UK/International' },
  { value: 'omniclass_33', label: 'OmniClass Table 33 (Disciplines)', description: 'International — Discipline-based cost breakdown', region: 'International' },
  { value: 'custom', label: 'Custom', description: 'Create your own CBS structure manually', region: 'Any' },
] as const;

const CBS_STANDARD_MAP: Record<string, { label: string; description: string; nodes: CbsTemplateNode[] }> = {
  uniclass_ss: {
    label: 'Uniclass 2015 Ss',
    description: 'Uniclass 2015 Systems table for cost breakdown',
    nodes: UNICLASS_SS_BASE,
  },
  omniclass_33: {
    label: 'OmniClass Table 33',
    description: 'OmniClass Table 33 Disciplines for cost breakdown',
    nodes: OMNICLASS_CBS_BASE,
  },
};

/**
 * Get the default CBS standard for a given WBS standard.
 */
export function getDefaultCbsStandard(wbsStandard: string): string {
  if (wbsStandard === 'omniclass') return 'omniclass_33';
  return 'uniclass_ss';
}

export function getCbsTemplate(standard: string): CbsTemplate | null {
  const base = CBS_STANDARD_MAP[standard];
  if (!base) return null;

  return {
    standard,
    label: base.label,
    description: base.description,
    nodes: base.nodes,
  };
}

/**
 * Flatten CBS template nodes for bulk DB insertion.
 */
export function flattenCbsNodes(
  nodes: CbsTemplateNode[],
  standard: string,
  parentCode?: string,
  level: number = 1,
  sortStart: number = 0,
): { code: string; name: string; description?: string; standard: string; level: number; sortOrder: number; parentCode?: string; wbsCodes?: string[] }[] {
  const result: ReturnType<typeof flattenCbsNodes> = [];
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
      wbsCodes: node.wbsCodes,
    });

    if (node.children) {
      result.push(...flattenCbsNodes(node.children, standard, node.code, level + 1, 0));
    }
  }

  return result;
}
