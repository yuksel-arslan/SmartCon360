/**
 * CBS (Cost Breakdown Structure) Templates
 *
 * CBS is linked to WBS and provides cost categorization.
 * Default: Uniclass 2015 Ss (Systems) table — REAL DATA from CSV (2,415 items, 4 levels)
 *
 * Supported standards:
 * - Uniclass 2015 Ss (Systems) — loaded from parsed CSV JSON
 * - OmniClass Table 33 (Disciplines) — loaded from parsed CSV JSON
 * - Custom — user-defined CBS
 *
 * CBS nodes map to CostPilot budget items for cost tracking.
 */

import path from 'path';
import fs from 'fs';

export interface CbsTemplateNode {
  code: string;
  name: string;
  description?: string;
  wbsCodes?: string[];
  children?: CbsTemplateNode[];
}

export interface CbsTemplate {
  standard: string;
  label: string;
  description: string;
  nodes: CbsTemplateNode[];
}

// ============================================================================
// DATA LOADER — Uniclass 2015 Ss from real parsed CSV data
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

let uniclassSsCache: CbsTemplateNode[] | null = null;

/**
 * Load Uniclass Ss (Systems) table for CBS generation.
 * For CBS we only load level 1 and 2 items to keep the initial template manageable.
 * Users can expand with deeper levels via the classification search API.
 */
function loadUniclassSsNodes(): CbsTemplateNode[] {
  if (uniclassSsCache) return uniclassSsCache;

  const filePath = path.join(__dirname, '../../../data/uniclass2015/uniclass-ss.json');
  if (!fs.existsSync(filePath)) {
    console.warn('Uniclass Ss JSON not found, using empty array');
    return [];
  }

  const data: UniclassJsonFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  // Build tree from level 1+2 only (level 3+4 can be expanded on demand)
  const filteredItems = data.items.filter((i) => i.level <= 2);
  uniclassSsCache = buildCbsTreeFromItems(filteredItems);
  return uniclassSsCache;
}

function buildCbsTreeFromItems(items: UniclassJsonItem[]): CbsTemplateNode[] {
  const map = new Map<string, CbsTemplateNode>();

  for (const item of items) {
    map.set(item.code, {
      code: item.code,
      name: item.title,
      children: [],
    });
  }

  const roots: CbsTemplateNode[] = [];
  for (const item of items) {
    const node = map.get(item.code)!;
    if (item.parentCode && map.has(item.parentCode)) {
      map.get(item.parentCode)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const clean = (node: CbsTemplateNode): CbsTemplateNode => {
    if (node.children && node.children.length === 0) {
      const { children, ...rest } = node;
      return rest;
    }
    return { ...node, children: node.children?.map(clean) };
  };

  return roots.map(clean);
}

// ============================================================================
// DATA LOADER — OmniClass Table 33 for discipline-based CBS
// ============================================================================

interface OmniClassJsonItem {
  code: string;
  codeNormalized: string;
  title: string;
  definition: string;
  level: number;
  parentCode: string | null;
  children: string[];
}

interface OmniClassJsonFile {
  items: OmniClassJsonItem[];
}

let omniclass33CbsCache: CbsTemplateNode[] | null = null;

function loadOmniClass33CbsNodes(): CbsTemplateNode[] {
  if (omniclass33CbsCache) return omniclass33CbsCache;

  const filePath = path.join(__dirname, '../../../data/omniclass/omniclass-33.json');
  if (!fs.existsSync(filePath)) {
    console.warn('OmniClass Table 33 JSON not found, using empty array');
    return [];
  }

  const data: OmniClassJsonFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  // CBS uses levels 1-2 for initial template (deeper levels available via search)
  const filtered = data.items.filter((i) => i.level <= 2);
  omniclass33CbsCache = buildOmniClassCbsTree(filtered);
  return omniclass33CbsCache;
}

function buildOmniClassCbsTree(items: OmniClassJsonItem[]): CbsTemplateNode[] {
  const map = new Map<string, CbsTemplateNode>();

  for (const item of items) {
    map.set(item.code, {
      code: item.code,
      name: item.title,
      description: item.definition || undefined,
      children: [],
    });
  }

  const roots: CbsTemplateNode[] = [];
  for (const item of items) {
    const node = map.get(item.code)!;
    if (item.parentCode && map.has(item.parentCode)) {
      map.get(item.parentCode)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const clean = (node: CbsTemplateNode): CbsTemplateNode => {
    if (node.children && node.children.length === 0) {
      const { children, ...rest } = node;
      return rest;
    }
    return { ...node, children: node.children?.map(clean) };
  };

  return roots.map(clean);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const CBS_STANDARDS = [
  { value: 'uniclass_ss', label: 'Uniclass 2015 Ss (Systems)', description: 'UK standard — 2,415 systems, 4 levels deep (from official CSV)', region: 'UK/International' },
  { value: 'omniclass_33', label: 'OmniClass Table 33 (Disciplines)', description: 'International — 251 disciplines, discipline-based cost breakdown', region: 'International' },
  { value: 'custom', label: 'Custom', description: 'Create your own CBS structure manually', region: 'Any' },
] as const;

const CBS_STANDARD_MAP: Record<string, { label: string; description: string; getNodes: () => CbsTemplateNode[] }> = {
  uniclass_ss: {
    label: 'Uniclass 2015 Ss',
    description: 'Uniclass 2015 Systems table for cost breakdown — loaded from official CSV (level 1-2 for template, full depth available via search)',
    getNodes: loadUniclassSsNodes,
  },
  omniclass_33: {
    label: 'OmniClass Table 33',
    description: 'OmniClass Table 33 Disciplines for discipline-based cost breakdown (level 1-2 for template)',
    getNodes: loadOmniClass33CbsNodes,
  },
};

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
    nodes: base.getNodes(),
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
