/**
 * CBS (Cost Breakdown Structure) Templates
 *
 * CBS is linked to WBS and provides cost categorization.
 * Default: Uniclass 2015 Ss (Systems) table — REAL DATA from CSV (2,415 items, 4 levels)
 *
 * Supported standards:
 * - Uniclass 2015 Ss (Systems) — loaded from parsed CSV JSON
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
// PUBLIC API
// ============================================================================

export const CBS_STANDARDS = [
  { value: 'uniclass_ss', label: 'Uniclass 2015 Ss (Systems)', description: 'UK standard — 2,415 systems, 4 levels deep (from official CSV)', region: 'UK/International' },
  { value: 'custom', label: 'Custom', description: 'Create your own CBS structure manually', region: 'Any' },
] as const;

const CBS_STANDARD_MAP: Record<string, { label: string; description: string; getNodes: () => CbsTemplateNode[] }> = {
  uniclass_ss: {
    label: 'Uniclass 2015 Ss',
    description: 'Uniclass 2015 Systems table for cost breakdown — loaded from official CSV (level 1-2 for template, full depth available via search)',
    getNodes: loadUniclassSsNodes,
  },
};

export function getDefaultCbsStandard(wbsStandard: string): string {
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
