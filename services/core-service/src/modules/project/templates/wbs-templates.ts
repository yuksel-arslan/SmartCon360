/**
 * WBS (Work Breakdown Structure) Templates
 *
 * Supported standards:
 * - Uniclass 2015 (UK — default) — EF (Elements/Functions) table — REAL DATA from CSV
 * - MasterFormat 2018 (US/Canada — CSI) — Division-based
 * - UniFormat II (US — ASTM E1557) — System-based
 *
 * Uniclass EF data is loaded from parsed JSON (107 items, 3 levels)
 * rather than hardcoded templates. This gives the user the COMPLETE
 * Uniclass 2015 classification for WBS generation.
 */

import path from 'path';
import fs from 'fs';

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
// DATA LOADER — Uniclass 2015 EF from real parsed CSV data
// ============================================================================

interface UniclassJsonItem {
  code: string;
  title: string;
  level: number;
  parentCode: string | null;
  children: string[];
}

interface UniclassJsonFile {
  items: UniclassJsonItem[];
}

let uniclassEfCache: WbsTemplateNode[] | null = null;

function loadUniclassEfNodes(): WbsTemplateNode[] {
  if (uniclassEfCache) return uniclassEfCache;

  const filePath = path.join(__dirname, '../../../data/uniclass2015/uniclass-ef.json');
  if (!fs.existsSync(filePath)) {
    console.warn('Uniclass EF JSON not found, using empty array');
    return [];
  }

  const data: UniclassJsonFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  uniclassEfCache = buildTreeFromItems(data.items);
  return uniclassEfCache;
}

function buildTreeFromItems(items: UniclassJsonItem[]): WbsTemplateNode[] {
  const map = new Map<string, WbsTemplateNode>();

  for (const item of items) {
    map.set(item.code, {
      code: item.code,
      name: item.title,
      children: [],
    });
  }

  const roots: WbsTemplateNode[] = [];
  for (const item of items) {
    const node = map.get(item.code)!;
    if (item.parentCode && map.has(item.parentCode)) {
      map.get(item.parentCode)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const clean = (node: WbsTemplateNode): WbsTemplateNode => {
    if (node.children && node.children.length === 0) {
      const { children, ...rest } = node;
      return rest;
    }
    return { ...node, children: node.children?.map(clean) };
  };

  return roots.map(clean);
}

// ============================================================================
// MASTERFORMAT 2018 (CSI) — Division-based WBS
// ============================================================================

const MASTERFORMAT_BASE: WbsTemplateNode[] = [
  {
    code: '01',
    name: 'General Requirements',
    children: [
      { code: '01-10-00', name: 'Summary of Work' },
      { code: '01-30-00', name: 'Administrative Requirements' },
      { code: '01-50-00', name: 'Temporary Facilities & Controls' },
      { code: '01-70-00', name: 'Execution & Closeout Requirements' },
    ],
  },
  {
    code: '02',
    name: 'Existing Conditions',
    children: [
      { code: '02-20-00', name: 'Assessment' },
      { code: '02-40-00', name: 'Demolition & Structure Moving' },
    ],
  },
  {
    code: '03',
    name: 'Concrete',
    children: [
      { code: '03-10-00', name: 'Concrete Forming & Accessories' },
      { code: '03-20-00', name: 'Concrete Reinforcing' },
      { code: '03-30-00', name: 'Cast-in-Place Concrete' },
      { code: '03-40-00', name: 'Precast Concrete' },
    ],
  },
  {
    code: '04',
    name: 'Masonry',
    children: [
      { code: '04-20-00', name: 'Unit Masonry' },
      { code: '04-40-00', name: 'Stone Assemblies' },
    ],
  },
  {
    code: '05',
    name: 'Metals',
    children: [
      { code: '05-10-00', name: 'Structural Metal Framing' },
      { code: '05-50-00', name: 'Metal Fabrications' },
    ],
  },
  {
    code: '06',
    name: 'Wood, Plastics & Composites',
    children: [
      { code: '06-10-00', name: 'Rough Carpentry' },
      { code: '06-20-00', name: 'Finish Carpentry' },
      { code: '06-40-00', name: 'Architectural Woodwork' },
    ],
  },
  {
    code: '07',
    name: 'Thermal & Moisture Protection',
    children: [
      { code: '07-10-00', name: 'Dampproofing & Waterproofing' },
      { code: '07-20-00', name: 'Thermal Protection' },
      { code: '07-40-00', name: 'Roofing & Siding Panels' },
      { code: '07-50-00', name: 'Membrane Roofing' },
      { code: '07-60-00', name: 'Flashing & Sheet Metal' },
      { code: '07-90-00', name: 'Joint Protection' },
    ],
  },
  {
    code: '08',
    name: 'Openings',
    children: [
      { code: '08-10-00', name: 'Doors & Frames' },
      { code: '08-40-00', name: 'Entrances, Storefronts & Curtain Walls' },
      { code: '08-50-00', name: 'Windows' },
      { code: '08-70-00', name: 'Hardware' },
      { code: '08-80-00', name: 'Glazing' },
    ],
  },
  {
    code: '09',
    name: 'Finishes',
    children: [
      { code: '09-20-00', name: 'Plaster & Gypsum Board' },
      { code: '09-30-00', name: 'Tiling' },
      { code: '09-50-00', name: 'Ceilings' },
      { code: '09-60-00', name: 'Flooring' },
      { code: '09-70-00', name: 'Wall Finishes' },
      { code: '09-90-00', name: 'Painting & Coating' },
    ],
  },
  {
    code: '10',
    name: 'Specialties',
    children: [
      { code: '10-10-00', name: 'Visual Display Surfaces' },
      { code: '10-20-00', name: 'Interior Specialties' },
      { code: '10-40-00', name: 'Safety Specialties' },
    ],
  },
  {
    code: '11',
    name: 'Equipment',
    children: [
      { code: '11-10-00', name: 'Vehicle & Pedestrian Equipment' },
      { code: '11-30-00', name: 'Residential Equipment' },
      { code: '11-40-00', name: 'Foodservice Equipment' },
    ],
  },
  {
    code: '12',
    name: 'Furnishings',
    children: [
      { code: '12-20-00', name: 'Window Treatments' },
      { code: '12-30-00', name: 'Casework' },
      { code: '12-50-00', name: 'Furniture' },
    ],
  },
  {
    code: '14',
    name: 'Conveying Equipment',
    children: [
      { code: '14-20-00', name: 'Elevators' },
      { code: '14-30-00', name: 'Escalators & Moving Walks' },
    ],
  },
  {
    code: '21',
    name: 'Fire Suppression',
    children: [
      { code: '21-10-00', name: 'Water-Based Fire Suppression' },
      { code: '21-30-00', name: 'Special Suppression' },
    ],
  },
  {
    code: '22',
    name: 'Plumbing',
    children: [
      { code: '22-10-00', name: 'Plumbing Piping & Pumps' },
      { code: '22-30-00', name: 'Plumbing Equipment' },
      { code: '22-40-00', name: 'Plumbing Fixtures' },
    ],
  },
  {
    code: '23',
    name: 'HVAC',
    children: [
      { code: '23-10-00', name: 'HVAC Piping & Pumps' },
      { code: '23-30-00', name: 'HVAC Air Distribution' },
      { code: '23-50-00', name: 'Central Heating Equipment' },
      { code: '23-60-00', name: 'Central Cooling Equipment' },
      { code: '23-70-00', name: 'Central HVAC Equipment' },
    ],
  },
  {
    code: '26',
    name: 'Electrical',
    children: [
      { code: '26-05-00', name: 'Common Work Results for Electrical' },
      { code: '26-20-00', name: 'LV Electrical Distribution' },
      { code: '26-24-00', name: 'Switchboards & Panelboards' },
      { code: '26-27-00', name: 'LV Transformers' },
      { code: '26-50-00', name: 'Lighting' },
    ],
  },
  {
    code: '27',
    name: 'Communications',
    children: [
      { code: '27-10-00', name: 'Structured Cabling' },
      { code: '27-20-00', name: 'Data Communications' },
      { code: '27-50-00', name: 'Distributed Audio-Video' },
    ],
  },
  {
    code: '28',
    name: 'Electronic Safety & Security',
    children: [
      { code: '28-10-00', name: 'Access Control' },
      { code: '28-20-00', name: 'Video Surveillance' },
      { code: '28-30-00', name: 'Fire Detection & Alarm' },
    ],
  },
  {
    code: '31',
    name: 'Earthwork',
    children: [
      { code: '31-10-00', name: 'Site Clearing' },
      { code: '31-20-00', name: 'Earth Moving' },
      { code: '31-60-00', name: 'Special Foundations & Load-Bearing Elements' },
    ],
  },
  {
    code: '32',
    name: 'Exterior Improvements',
    children: [
      { code: '32-10-00', name: 'Bases, Ballasts & Paving' },
      { code: '32-30-00', name: 'Site Improvements' },
      { code: '32-80-00', name: 'Irrigation' },
      { code: '32-90-00', name: 'Planting' },
    ],
  },
  {
    code: '33',
    name: 'Utilities',
    children: [
      { code: '33-10-00', name: 'Water Utilities' },
      { code: '33-30-00', name: 'Sanitary Sewerage' },
      { code: '33-40-00', name: 'Storm Drainage' },
      { code: '33-70-00', name: 'Electrical Utilities' },
    ],
  },
];

// ============================================================================
// UNIFORMAT II (ASTM E1557) — System-based WBS
// ============================================================================

const UNIFORMAT_BASE: WbsTemplateNode[] = [
  {
    code: 'A',
    name: 'Substructure',
    children: [
      { code: 'A10', name: 'Foundations', children: [
        { code: 'A1010', name: 'Standard Foundations' },
        { code: 'A1020', name: 'Special Foundations' },
        { code: 'A1030', name: 'Slab on Grade' },
      ]},
      { code: 'A20', name: 'Basement Construction', children: [
        { code: 'A2010', name: 'Basement Excavation' },
        { code: 'A2020', name: 'Basement Walls' },
      ]},
    ],
  },
  {
    code: 'B',
    name: 'Shell',
    children: [
      { code: 'B10', name: 'Superstructure', children: [
        { code: 'B1010', name: 'Floor Construction' },
        { code: 'B1020', name: 'Roof Construction' },
      ]},
      { code: 'B20', name: 'Exterior Enclosure', children: [
        { code: 'B2010', name: 'Exterior Walls' },
        { code: 'B2020', name: 'Exterior Windows' },
        { code: 'B2030', name: 'Exterior Doors' },
      ]},
      { code: 'B30', name: 'Roofing', children: [
        { code: 'B3010', name: 'Roof Coverings' },
        { code: 'B3020', name: 'Roof Openings' },
      ]},
    ],
  },
  {
    code: 'C',
    name: 'Interiors',
    children: [
      { code: 'C10', name: 'Interior Construction', children: [
        { code: 'C1010', name: 'Partitions' },
        { code: 'C1020', name: 'Interior Doors' },
        { code: 'C1030', name: 'Fittings' },
      ]},
      { code: 'C20', name: 'Stairs', children: [
        { code: 'C2010', name: 'Stair Construction' },
        { code: 'C2020', name: 'Stair Finishes' },
      ]},
      { code: 'C30', name: 'Interior Finishes', children: [
        { code: 'C3010', name: 'Wall Finishes' },
        { code: 'C3020', name: 'Floor Finishes' },
        { code: 'C3030', name: 'Ceiling Finishes' },
      ]},
    ],
  },
  {
    code: 'D',
    name: 'Services',
    children: [
      { code: 'D10', name: 'Conveying', children: [
        { code: 'D1010', name: 'Elevators & Lifts' },
        { code: 'D1020', name: 'Escalators & Moving Walks' },
      ]},
      { code: 'D20', name: 'Plumbing', children: [
        { code: 'D2010', name: 'Plumbing Fixtures' },
        { code: 'D2020', name: 'Domestic Water Distribution' },
        { code: 'D2030', name: 'Sanitary Waste' },
        { code: 'D2040', name: 'Rain Water Drainage' },
      ]},
      { code: 'D30', name: 'HVAC', children: [
        { code: 'D3010', name: 'Energy Supply' },
        { code: 'D3020', name: 'Heat Generating Systems' },
        { code: 'D3030', name: 'Cooling Generating Systems' },
        { code: 'D3040', name: 'Distribution Systems' },
        { code: 'D3050', name: 'Terminal & Package Units' },
        { code: 'D3060', name: 'Controls & Instrumentation' },
      ]},
      { code: 'D40', name: 'Fire Protection', children: [
        { code: 'D4010', name: 'Sprinklers' },
        { code: 'D4020', name: 'Standpipes' },
        { code: 'D4030', name: 'Fire Protection Specialties' },
      ]},
      { code: 'D50', name: 'Electrical', children: [
        { code: 'D5010', name: 'Electrical Service & Distribution' },
        { code: 'D5020', name: 'Lighting & Branch Wiring' },
        { code: 'D5030', name: 'Communications & Security' },
        { code: 'D5090', name: 'Other Electrical Systems' },
      ]},
    ],
  },
  {
    code: 'E',
    name: 'Equipment & Furnishings',
    children: [
      { code: 'E10', name: 'Equipment', children: [
        { code: 'E1010', name: 'Commercial Equipment' },
        { code: 'E1020', name: 'Institutional Equipment' },
        { code: 'E1030', name: 'Vehicular Equipment' },
      ]},
      { code: 'E20', name: 'Furnishings', children: [
        { code: 'E2010', name: 'Fixed Furnishings' },
        { code: 'E2020', name: 'Movable Furnishings' },
      ]},
    ],
  },
  {
    code: 'F',
    name: 'Special Construction & Demolition',
    children: [
      { code: 'F10', name: 'Special Construction' },
      { code: 'F20', name: 'Selective Building Demolition' },
    ],
  },
  {
    code: 'G',
    name: 'Building Sitework',
    children: [
      { code: 'G10', name: 'Site Preparation', children: [
        { code: 'G1010', name: 'Site Clearing' },
        { code: 'G1020', name: 'Site Demolition & Relocations' },
        { code: 'G1030', name: 'Site Earthwork' },
      ]},
      { code: 'G20', name: 'Site Improvements', children: [
        { code: 'G2010', name: 'Roadways' },
        { code: 'G2020', name: 'Parking Lots' },
        { code: 'G2030', name: 'Pedestrian Paving' },
        { code: 'G2040', name: 'Site Development' },
        { code: 'G2050', name: 'Landscaping' },
      ]},
      { code: 'G30', name: 'Site Mechanical Utilities', children: [
        { code: 'G3010', name: 'Water Supply' },
        { code: 'G3020', name: 'Sanitary Sewer' },
        { code: 'G3030', name: 'Storm Sewer' },
        { code: 'G3060', name: 'Fuel Distribution' },
      ]},
      { code: 'G40', name: 'Site Electrical Utilities', children: [
        { code: 'G4010', name: 'Electrical Distribution' },
        { code: 'G4020', name: 'Site Lighting' },
        { code: 'G4030', name: 'Site Communications & Security' },
      ]},
    ],
  },
];

// ============================================================================
// PUBLIC API
// ============================================================================

export const WBS_STANDARDS = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK standard — Elements/Functions classification (107 items, 3 levels)', region: 'UK/International' },
  { value: 'masterformat', label: 'MasterFormat 2018', description: 'CSI/CSC — Division-based (North America)', region: 'US/Canada' },
  { value: 'uniformat', label: 'UniFormat II', description: 'ASTM E1557 — System/assembly classification', region: 'US/International' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually', region: 'Any' },
] as const;

export type WbsStandard = typeof WBS_STANDARDS[number]['value'];

const STANDARD_MAP: Record<string, { label: string; description: string; getNodes: () => WbsTemplateNode[] }> = {
  uniclass: {
    label: 'Uniclass 2015',
    description: 'UK NBS standard — EF (Elements/Functions) table — 107 items from official Uniclass 2015 CSV',
    getNodes: loadUniclassEfNodes,
  },
  masterformat: {
    label: 'MasterFormat 2018',
    description: 'CSI Divisions 01-33',
    getNodes: () => MASTERFORMAT_BASE,
  },
  uniformat: {
    label: 'UniFormat II',
    description: 'ASTM E1557 system-based classification',
    getNodes: () => UNIFORMAT_BASE,
  },
};

export function getWbsTemplate(standard: string, projectType: string): WbsTemplate | null {
  const base = STANDARD_MAP[standard];
  if (!base) return null;

  return {
    standard,
    label: base.label,
    description: base.description,
    nodes: filterForProjectType(base.getNodes(), projectType),
  };
}

export function getAvailableStandards() {
  return WBS_STANDARDS;
}

/**
 * Flatten WBS template nodes into a list for bulk DB insertion.
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
