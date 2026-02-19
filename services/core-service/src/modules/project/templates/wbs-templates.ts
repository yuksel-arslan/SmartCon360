/**
 * WBS (Work Breakdown Structure) Templates
 *
 * Supported standards:
 * - Uniclass 2015 (UK — default) — EF (Elements/Functions) table — REAL DATA from CSV
 * - Custom — user-defined WBS
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
// PUBLIC API
// ============================================================================

export const WBS_STANDARDS = [
  { value: 'uniclass', label: 'Uniclass 2015', description: 'UK standard — Elements/Functions classification (107 items, 3 levels)', region: 'UK/International' },
  { value: 'custom', label: 'Custom', description: 'Create your own WBS structure manually', region: 'Any' },
] as const;

export type WbsStandard = typeof WBS_STANDARDS[number]['value'];

const STANDARD_MAP: Record<string, { label: string; description: string; getNodes: () => WbsTemplateNode[] }> = {
  uniclass: {
    label: 'Uniclass 2015',
    description: 'UK NBS standard — EF (Elements/Functions) table — 107 items from official Uniclass 2015 CSV',
    getNodes: loadUniclassEfNodes,
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
