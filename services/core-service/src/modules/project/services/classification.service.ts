/**
 * Classification Service — Uniclass 2015 + OmniClass lookup & search
 *
 * Loads parsed JSON data from /data/ directory and provides:
 * - Full table lookups (EF, Ss, Ro, SL, Ac, Co, En, Pr, PM, TE, FI, Zz)
 * - Hierarchical tree building
 * - Code search / autocomplete
 * - Cross-standard mapping (Uniclass ↔ OmniClass)
 * - WBS, CBS, OBS template generation from real classification data
 */

import path from 'path';
import fs from 'fs';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export interface UniclassItem {
  code: string;
  title: string;
  level: number;
  group: string;
  subGroup: string | null;
  section: string | null;
  object: string | null;
  parentCode: string | null;
  children: string[];
  nrm?: string;
}

export interface UniclassTable {
  standard: string;
  table: string;
  tableName: string;
  version: string;
  totalItems: number;
  levelDistribution: Record<string, number>;
  items: UniclassItem[];
}

export interface OmniClassItem {
  code: string;
  codeNormalized: string;
  title: string;
  definition: string;
  level: number;
  parentCode: string | null;
  children: string[];
}

export interface OmniClassTable {
  standard: string;
  table: string;
  tableName: string;
  version: string;
  totalItems: number;
  levelDistribution: Record<string, number>;
  items: OmniClassItem[];
}

export interface ClassificationNode {
  code: string;
  title: string;
  level: number;
  standard: string;
  table: string;
  parentCode: string | null;
  children: ClassificationNode[];
}

export interface SearchResult {
  code: string;
  title: string;
  table: string;
  standard: string;
  level: number;
  parentCode: string | null;
}

// ══════════════════════════════════════
// TABLE METADATA
// ══════════════════════════════════════

export const UNICLASS_TABLE_MAP: Record<string, { name: string; usage: string; file: string }> = {
  Ac: { name: 'Activities', usage: 'Project activities / tasks', file: 'uniclass-ac.json' },
  Co: { name: 'Complexes', usage: 'Project complex types', file: 'uniclass-co.json' },
  EF: { name: 'Elements/Functions', usage: 'WBS — Work Breakdown Structure', file: 'uniclass-ef.json' },
  En: { name: 'Entities', usage: 'Building / entity types', file: 'uniclass-en.json' },
  FI: { name: 'Form of Information', usage: 'Document types', file: 'uniclass-fi.json' },
  PM: { name: 'Project Management', usage: 'Project management documents', file: 'uniclass-pm.json' },
  Pr: { name: 'Products', usage: 'Materials and products', file: 'uniclass-pr.json' },
  Ro: { name: 'Roles', usage: 'OBS — Organization Breakdown Structure', file: 'uniclass-ro.json' },
  SL: { name: 'Spaces/Locations', usage: 'LBS — Location Breakdown Structure', file: 'uniclass-sl.json' },
  Ss: { name: 'Systems', usage: 'CBS — Cost Breakdown Structure', file: 'uniclass-ss.json' },
  TE: { name: 'Tools and Equipment', usage: 'Equipment management', file: 'uniclass-te.json' },
  Zz: { name: 'CAD', usage: 'CAD layer classification', file: 'uniclass-zz.json' },
};

export const OMNICLASS_TABLE_MAP: Record<string, { name: string; usage: string; file: string }> = {
  '33': { name: 'Disciplines', usage: 'OBS — Organization disciplines', file: 'omniclass-33.json' },
};

// ══════════════════════════════════════
// CACHE — Lazy-loaded singleton
// ══════════════════════════════════════

const dataDir = path.join(__dirname, '../../../data');

const uniclassCache = new Map<string, UniclassTable>();
const omniclassCache = new Map<string, OmniClassTable>();

function loadUniclassTable(tableCode: string): UniclassTable | null {
  if (uniclassCache.has(tableCode)) return uniclassCache.get(tableCode)!;

  const meta = UNICLASS_TABLE_MAP[tableCode];
  if (!meta) return null;

  const filePath = path.join(dataDir, 'uniclass2015', meta.file);
  if (!fs.existsSync(filePath)) return null;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as UniclassTable;
  uniclassCache.set(tableCode, data);
  return data;
}

function loadOmniClassTable(tableCode: string): OmniClassTable | null {
  if (omniclassCache.has(tableCode)) return omniclassCache.get(tableCode)!;

  const meta = OMNICLASS_TABLE_MAP[tableCode];
  if (!meta) return null;

  const filePath = path.join(dataDir, 'omniclass', meta.file);
  if (!fs.existsSync(filePath)) return null;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OmniClassTable;
  omniclassCache.set(tableCode, data);
  return data;
}

// ══════════════════════════════════════
// CLASSIFICATION SERVICE
// ══════════════════════════════════════

export class ClassificationService {
  // ── Uniclass 2015 ──

  /** Get all available Uniclass tables with metadata */
  getUniclassTables() {
    return Object.entries(UNICLASS_TABLE_MAP).map(([code, meta]) => ({
      code,
      name: meta.name,
      usage: meta.usage,
    }));
  }

  /** Get full Uniclass table data */
  getUniclassTable(tableCode: string): UniclassTable | null {
    return loadUniclassTable(tableCode);
  }

  /** Get Uniclass table as hierarchical tree */
  getUniclassTree(tableCode: string): ClassificationNode[] {
    const table = loadUniclassTable(tableCode);
    if (!table) return [];
    return this.buildUniclassTree(table);
  }

  /** Get single Uniclass item by code */
  getUniclassItem(code: string): (UniclassItem & { table: string }) | null {
    const prefix = code.split('_')[0];
    const table = loadUniclassTable(prefix);
    if (!table) return null;

    const item = table.items.find((i) => i.code === code);
    if (!item) return null;
    return { ...item, table: prefix };
  }

  /** Get children of a Uniclass item */
  getUniclassChildren(code: string): UniclassItem[] {
    const prefix = code.split('_')[0];
    const table = loadUniclassTable(prefix);
    if (!table) return [];

    return table.items.filter((i) => i.parentCode === code);
  }

  /** Search Uniclass items by title or code */
  searchUniclass(query: string, options?: {
    tables?: string[];
    maxResults?: number;
    level?: number;
  }): SearchResult[] {
    const { tables, maxResults = 50, level } = options || {};
    const results: SearchResult[] = [];
    const q = query.toLowerCase();

    const tableCodes = tables || Object.keys(UNICLASS_TABLE_MAP);

    for (const tableCode of tableCodes) {
      const table = loadUniclassTable(tableCode);
      if (!table) continue;

      for (const item of table.items) {
        if (level !== undefined && item.level !== level) continue;

        if (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q)
        ) {
          results.push({
            code: item.code,
            title: item.title,
            table: tableCode,
            standard: 'uniclass2015',
            level: item.level,
            parentCode: item.parentCode,
          });

          if (results.length >= maxResults) return results;
        }
      }
    }

    return results;
  }

  // ── OmniClass ──

  /** Get all available OmniClass tables */
  getOmniClassTables() {
    return Object.entries(OMNICLASS_TABLE_MAP).map(([code, meta]) => ({
      code,
      name: meta.name,
      usage: meta.usage,
    }));
  }

  /** Get full OmniClass table data */
  getOmniClassTable(tableCode: string): OmniClassTable | null {
    return loadOmniClassTable(tableCode);
  }

  /** Get OmniClass table as hierarchical tree */
  getOmniClassTree(tableCode: string): ClassificationNode[] {
    const table = loadOmniClassTable(tableCode);
    if (!table) return [];
    return this.buildOmniClassTree(table);
  }

  /** Search OmniClass items */
  searchOmniClass(query: string, options?: {
    tables?: string[];
    maxResults?: number;
    level?: number;
  }): SearchResult[] {
    const { tables, maxResults = 50, level } = options || {};
    const results: SearchResult[] = [];
    const q = query.toLowerCase();

    const tableCodes = tables || Object.keys(OMNICLASS_TABLE_MAP);

    for (const tableCode of tableCodes) {
      const table = loadOmniClassTable(tableCode);
      if (!table) continue;

      for (const item of table.items) {
        if (level !== undefined && item.level !== level) continue;

        if (
          item.code.toLowerCase().includes(q) ||
          item.codeNormalized.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q)
        ) {
          results.push({
            code: item.code,
            title: item.title,
            table: tableCode,
            standard: 'omniclass',
            level: item.level,
            parentCode: item.parentCode,
          });

          if (results.length >= maxResults) return results;
        }
      }
    }

    return results;
  }

  // ── Cross-standard search ──

  /** Search across both Uniclass and OmniClass */
  searchAll(query: string, options?: {
    maxResults?: number;
    level?: number;
  }): SearchResult[] {
    const max = options?.maxResults || 50;
    const uniclassResults = this.searchUniclass(query, { maxResults: max, level: options?.level });
    const omniclassResults = this.searchOmniClass(query, { maxResults: max, level: options?.level });
    return [...uniclassResults, ...omniclassResults].slice(0, max);
  }

  // ── WBS Generation from real data ──

  /** Get Uniclass EF items for WBS generation (full real data) */
  getWbsUniclassNodes(): ClassificationNode[] {
    return this.getUniclassTree('EF');
  }

  /** Get Uniclass Ss items for CBS generation (full real data) */
  getCbsUniclassNodes(): ClassificationNode[] {
    return this.getUniclassTree('Ss');
  }

  /** Get Uniclass Ro items for OBS roles (full real data) */
  getObsUniclassNodes(): ClassificationNode[] {
    return this.getUniclassTree('Ro');
  }

  /** Get OmniClass Table 33 items for OBS disciplines */
  getObsOmniClassNodes(): ClassificationNode[] {
    return this.getOmniClassTree('33');
  }

  /** Get Uniclass SL items for LBS generation */
  getLbsUniclassNodes(): ClassificationNode[] {
    return this.getUniclassTree('SL');
  }

  // ── Statistics ──

  /** Get overview of all loaded classification data */
  getStatistics() {
    const uniclass = Object.keys(UNICLASS_TABLE_MAP).map((code) => {
      const table = loadUniclassTable(code);
      return {
        standard: 'uniclass2015',
        table: code,
        name: UNICLASS_TABLE_MAP[code].name,
        totalItems: table?.totalItems || 0,
        levelDistribution: table?.levelDistribution || {},
      };
    });

    const omniclass = Object.keys(OMNICLASS_TABLE_MAP).map((code) => {
      const table = loadOmniClassTable(code);
      return {
        standard: 'omniclass',
        table: code,
        name: OMNICLASS_TABLE_MAP[code].name,
        totalItems: table?.totalItems || 0,
        levelDistribution: table?.levelDistribution || {},
      };
    });

    return { uniclass, omniclass };
  }

  // ── Tree builders (private) ──

  private buildUniclassTree(table: UniclassTable): ClassificationNode[] {
    const map = new Map<string, ClassificationNode>();

    // Create all nodes
    for (const item of table.items) {
      map.set(item.code, {
        code: item.code,
        title: item.title,
        level: item.level,
        standard: 'uniclass2015',
        table: table.table,
        parentCode: item.parentCode,
        children: [],
      });
    }

    // Build tree
    const roots: ClassificationNode[] = [];
    for (const item of table.items) {
      const node = map.get(item.code)!;
      if (item.parentCode && map.has(item.parentCode)) {
        map.get(item.parentCode)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private buildOmniClassTree(table: OmniClassTable): ClassificationNode[] {
    const map = new Map<string, ClassificationNode>();

    for (const item of table.items) {
      map.set(item.code, {
        code: item.code,
        title: item.title,
        level: item.level,
        standard: 'omniclass',
        table: table.table,
        parentCode: item.parentCode,
        children: [],
      });
    }

    const roots: ClassificationNode[] = [];
    for (const item of table.items) {
      const node = map.get(item.code)!;
      if (item.parentCode && map.has(item.parentCode)) {
        map.get(item.parentCode)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}

// Singleton export
export const classificationService = new ClassificationService();
