/**
 * CBS (Cost Breakdown Structure) Templates
 *
 * CBS is linked to WBS and provides cost categorization.
 * Default: Uniclass 2015 Ss (Systems) table
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
// UNIFORMAT II CBS (cost-focused view)
// ============================================================================

const UNIFORMAT_CBS_BASE: CbsTemplateNode[] = [
  {
    code: 'A-CBS',
    name: 'Substructure Costs',
    wbsCodes: ['A'],
    children: [
      { code: 'A10-CBS', name: 'Foundation Costs', wbsCodes: ['A10'] },
      { code: 'A20-CBS', name: 'Basement Construction Costs', wbsCodes: ['A20'] },
    ],
  },
  {
    code: 'B-CBS',
    name: 'Shell Costs',
    wbsCodes: ['B'],
    children: [
      { code: 'B10-CBS', name: 'Superstructure Costs', wbsCodes: ['B10'] },
      { code: 'B20-CBS', name: 'Exterior Enclosure Costs', wbsCodes: ['B20'] },
      { code: 'B30-CBS', name: 'Roofing Costs', wbsCodes: ['B30'] },
    ],
  },
  {
    code: 'C-CBS',
    name: 'Interiors Costs',
    wbsCodes: ['C'],
    children: [
      { code: 'C10-CBS', name: 'Interior Construction Costs', wbsCodes: ['C10'] },
      { code: 'C20-CBS', name: 'Stairs Costs', wbsCodes: ['C20'] },
      { code: 'C30-CBS', name: 'Interior Finishes Costs', wbsCodes: ['C30'] },
    ],
  },
  {
    code: 'D-CBS',
    name: 'Services Costs',
    wbsCodes: ['D'],
    children: [
      { code: 'D10-CBS', name: 'Conveying Costs', wbsCodes: ['D10'] },
      { code: 'D20-CBS', name: 'Plumbing Costs', wbsCodes: ['D20'] },
      { code: 'D30-CBS', name: 'HVAC Costs', wbsCodes: ['D30'] },
      { code: 'D40-CBS', name: 'Fire Protection Costs', wbsCodes: ['D40'] },
      { code: 'D50-CBS', name: 'Electrical Costs', wbsCodes: ['D50'] },
    ],
  },
  {
    code: 'E-CBS',
    name: 'Equipment & Furnishings Costs',
    wbsCodes: ['E'],
    children: [
      { code: 'E10-CBS', name: 'Equipment Costs', wbsCodes: ['E10'] },
      { code: 'E20-CBS', name: 'Furnishings Costs', wbsCodes: ['E20'] },
    ],
  },
  {
    code: 'G-CBS',
    name: 'Building Sitework Costs',
    wbsCodes: ['G'],
    children: [
      { code: 'G10-CBS', name: 'Site Preparation Costs', wbsCodes: ['G10'] },
      { code: 'G20-CBS', name: 'Site Improvements Costs', wbsCodes: ['G20'] },
      { code: 'G30-CBS', name: 'Site Mechanical Utilities Costs', wbsCodes: ['G30'] },
      { code: 'G40-CBS', name: 'Site Electrical Utilities Costs', wbsCodes: ['G40'] },
    ],
  },
];

// ============================================================================
// PUBLIC API
// ============================================================================

export const CBS_STANDARDS = [
  { value: 'uniclass_ss', label: 'Uniclass 2015 Ss (Systems)', description: 'UK standard — Systems classification for CBS', region: 'UK/International' },
  { value: 'uniformat_cbs', label: 'UniFormat II CBS', description: 'ASTM E1557 — cost breakdown by system', region: 'US/International' },
  { value: 'custom', label: 'Custom', description: 'Create your own CBS structure manually', region: 'Any' },
] as const;

const CBS_STANDARD_MAP: Record<string, { label: string; description: string; nodes: CbsTemplateNode[] }> = {
  uniclass_ss: {
    label: 'Uniclass 2015 Ss',
    description: 'Uniclass 2015 Systems table for cost breakdown',
    nodes: UNICLASS_SS_BASE,
  },
  uniformat_cbs: {
    label: 'UniFormat II CBS',
    description: 'UniFormat II cost breakdown structure',
    nodes: UNIFORMAT_CBS_BASE,
  },
};

/**
 * Get the default CBS standard for a given WBS standard.
 */
export function getDefaultCbsStandard(wbsStandard: string): string {
  const map: Record<string, string> = {
    uniclass: 'uniclass_ss',
    masterformat: 'uniclass_ss',  // MasterFormat users can still use Uniclass Ss for CBS
    uniformat: 'uniformat_cbs',
  };
  return map[wbsStandard] || 'uniclass_ss';
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
