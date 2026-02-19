// International Construction Cost Standard Parsers
// Supports: Uniclass (UK), RSMeans

import type { CatalogItemInput } from '../services/catalog.service';

export interface InternationalColumnMapping {
  code: string;
  name: string;
  unit: string;
  unitPrice: string;
  category?: string;

  // International codes
  csiCode?: string;
  divisionCode?: string;
  divisionName?: string;
  uniformatCode?: string;
  uniclassCode?: string;

  // Cost breakdown
  laborCost?: string;
  materialCost?: string;
  equipmentCost?: string;

  // RSMeans specific
  locationFactor?: string;
  location?: string;
  crewCode?: string;
  productivity?: string;
  assemblyType?: string;
}

export interface ParsedInternationalItem extends CatalogItemInput {
  csiCode?: string;
  divisionCode?: string;
  divisionName?: string;
  uniformatCode?: string;
  uniclassCode?: string;
  locationFactor?: number;
  location?: string;
  crewCode?: string;
  productivity?: number;
  assemblyType?: string;
}

/**
 * Detect international standard type from catalog name or first rows
 */
export function detectInternationalStandard(
  catalogName: string,
  sampleRows: Record<string, unknown>[]
): string | null {
  const nameLower = catalogName.toLowerCase();

  // Check catalog name first
  if (nameLower.includes('masterformat') || nameLower.includes('csi')) return 'masterformat';
  if (nameLower.includes('uniformat')) return 'uniformat';
  if (nameLower.includes('uniclass')) return 'uniclass';
  if (nameLower.includes('rsmeans')) return 'rsmeans';

  // Check sample data for code patterns
  if (sampleRows.length === 0) return null;

  const firstRow = sampleRows[0];
  const codeFields = Object.keys(firstRow).filter(k =>
    k.toLowerCase().includes('code') || k.toLowerCase().includes('number')
  );

  for (const field of codeFields) {
    const value = String(firstRow[field] || '');

    // MasterFormat pattern: XX-XX-XX or XX XX XX
    if (/^\d{2}[-\s]\d{2}[-\s]\d{2}/.test(value)) return 'masterformat';

    // UNIFORMAT pattern: Letter + digits (A1010, B2010.10)
    if (/^[A-Z]\d{4}/.test(value)) return 'uniformat';

    // Uniclass pattern varies, but often starts with specific prefixes
    if (/^[A-Z]{2}[-_]\d{2}[-_]\d{2}/.test(value)) return 'uniclass';
  }

  return null;
}

/**
 * Detect column mapping for MasterFormat (CSI) catalogs
 */
export function detectMasterFormatColumns(
  firstRow: Record<string, unknown>
): InternationalColumnMapping {
  const keys = Object.keys(firstRow);
  const lower = keys.map(k => k.toLowerCase().trim());

  const find = (patterns: string[]): string | undefined => {
    for (const pattern of patterns) {
      const idx = lower.findIndex(k => k.includes(pattern));
      if (idx >= 0) return keys[idx];
    }
    return undefined;
  };

  const csiCode = find(['csi', 'masterformat', 'code', 'item number', 'item no']) || keys[0];
  const divisionCode = find(['division code', 'div code', 'div']);
  const divisionName = find(['division name', 'division description', 'div name']);
  const name = find(['description', 'item description', 'name', 'title']) || keys[1];
  const unit = find(['unit', 'uom', 'unit of measure']) || keys[2];
  const unitPrice = find(['unit price', 'price', 'rate', 'cost', 'bare cost', 'total']) || keys[3];

  const laborCost = find(['labor', 'labour', 'labor cost', 'labour cost']);
  const materialCost = find(['material', 'mat', 'material cost', 'mat cost']);
  const equipmentCost = find(['equipment', 'equip', 'equipment cost', 'equip cost']);

  const crewCode = find(['crew', 'crew code', 'crew id']);
  const productivity = find(['daily output', 'productivity', 'output', 'man-hours']);
  const location = find(['location', 'city', 'region']);
  const locationFactor = find(['location factor', 'loc factor', 'multiplier', 'adjustment']);

  return {
    code: csiCode,
    name,
    unit,
    unitPrice,
    csiCode,
    divisionCode,
    divisionName,
    laborCost,
    materialCost,
    equipmentCost,
    crewCode,
    productivity,
    location,
    locationFactor,
  };
}

/**
 * Detect column mapping for UNIFORMAT II catalogs
 */
export function detectUniformatColumns(
  firstRow: Record<string, unknown>
): InternationalColumnMapping {
  const keys = Object.keys(firstRow);
  const lower = keys.map(k => k.toLowerCase().trim());

  const find = (patterns: string[]): string | undefined => {
    for (const pattern of patterns) {
      const idx = lower.findIndex(k => k.includes(pattern));
      if (idx >= 0) return keys[idx];
    }
    return undefined;
  };

  const uniformatCode = find(['uniformat', 'element code', 'code', 'classification']) || keys[0];
  const name = find(['description', 'element description', 'name', 'element name']) || keys[1];
  const unit = find(['unit', 'uom', 'unit of measure']) || keys[2];
  const unitPrice = find(['unit price', 'price', 'cost', 'total cost']) || keys[3];

  const category = find(['level 1', 'major group', 'group element']);
  const laborCost = find(['labor', 'labour', 'labor cost']);
  const materialCost = find(['material', 'material cost']);
  const equipmentCost = find(['equipment', 'equipment cost']);

  return {
    code: uniformatCode,
    name,
    unit,
    unitPrice,
    uniformatCode,
    category,
    laborCost,
    materialCost,
    equipmentCost,
  };
}

/**
 * Detect column mapping for RSMeans catalogs
 */
export function detectRSMeansColumns(
  firstRow: Record<string, unknown>
): InternationalColumnMapping {
  const keys = Object.keys(firstRow);
  const lower = keys.map(k => k.toLowerCase().trim());

  const find = (patterns: string[]): string | undefined => {
    for (const pattern of patterns) {
      const idx = lower.findIndex(k => k.includes(pattern));
      if (idx >= 0) return keys[idx];
    }
    return undefined;
  };

  const csiCode = find(['line number', 'item', 'code', 'csi']) || keys[0];
  const name = find(['description', 'item description']) || keys[1];
  const unit = find(['unit']) || keys[2];

  // RSMeans typically has: MAT (material), INST (installation/labor), TOTAL
  const materialCost = find(['mat', 'material']);
  const laborCost = find(['inst', 'installation', 'labor', 'labour']);
  const equipmentCost = find(['equip', 'equipment']);
  const unitPrice = find(['total', 'total incl o&p', 'unit cost']) || keys[3];

  const crewCode = find(['crew']);
  const productivity = find(['daily output', 'output']);
  const location = find(['location', 'city']);
  const locationFactor = find(['location factor', 'city cost index']);
  const assemblyType = find(['type', 'assembly type']);

  return {
    code: csiCode,
    name,
    unit,
    unitPrice,
    csiCode,
    laborCost,
    materialCost,
    equipmentCost,
    crewCode,
    productivity,
    location,
    locationFactor,
    assemblyType,
  };
}

/**
 * Detect column mapping for Uniclass (UK) catalogs
 */
export function detectUniclassColumns(
  firstRow: Record<string, unknown>
): InternationalColumnMapping {
  const keys = Object.keys(firstRow);
  const lower = keys.map(k => k.toLowerCase().trim());

  const find = (patterns: string[]): string | undefined => {
    for (const pattern of patterns) {
      const idx = lower.findIndex(k => k.includes(pattern));
      if (idx >= 0) return keys[idx];
    }
    return undefined;
  };

  const uniclassCode = find(['uniclass', 'code', 'classification code', 'reference']) || keys[0];
  const name = find(['description', 'title', 'name']) || keys[1];
  const unit = find(['unit', 'uom', 'quantity']) || keys[2];
  const unitPrice = find(['rate', 'unit rate', 'price', 'cost']) || keys[3];

  const category = find(['category', 'group', 'section']);
  const laborCost = find(['labour', 'labor']);
  const materialCost = find(['material', 'materials']);
  const equipmentCost = find(['plant', 'equipment']);

  return {
    code: uniclassCode,
    name,
    unit,
    unitPrice,
    uniclassCode,
    category,
    laborCost,
    materialCost,
    equipmentCost,
  };
}

/**
 * Parse international catalog row into CatalogItemInput
 */
export function parseInternationalRow(
  row: Record<string, unknown>,
  mapping: InternationalColumnMapping,
  standard: string
): ParsedInternationalItem | null {
  try {
    const code = String(row[mapping.code] || '').trim();
    const name = String(row[mapping.name] || '').trim();
    const unit = String(row[mapping.unit] || '').trim();
    const unitPrice = parseNumber(row[mapping.unitPrice]);

    if (!code || !name || !unit) return null;
    if (isNaN(unitPrice) || unitPrice <= 0) return null;

    const item: ParsedInternationalItem = {
      code,
      name,
      unit,
      unitPrice,
    };

    // Standard-specific codes
    if (standard === 'masterformat' || standard === 'rsmeans') {
      if (mapping.csiCode && row[mapping.csiCode]) {
        item.csiCode = String(row[mapping.csiCode]).trim();
      }
      if (mapping.divisionCode && row[mapping.divisionCode]) {
        item.divisionCode = String(row[mapping.divisionCode]).trim();
      }
      if (mapping.divisionName && row[mapping.divisionName]) {
        item.divisionName = String(row[mapping.divisionName]).trim();
      }

      // If no explicit division code, extract from CSI code
      if (!item.divisionCode && item.csiCode) {
        const match = item.csiCode.match(/^(\d{2})/);
        if (match) item.divisionCode = match[1];
      }
    }

    if (standard === 'uniformat') {
      if (mapping.uniformatCode && row[mapping.uniformatCode]) {
        item.uniformatCode = String(row[mapping.uniformatCode]).trim();
      }
    }

    if (standard === 'uniclass') {
      if (mapping.uniclassCode && row[mapping.uniclassCode]) {
        item.uniclassCode = String(row[mapping.uniclassCode]).trim();
      }
    }

    // Optional fields
    if (mapping.category && row[mapping.category]) {
      item.category = String(row[mapping.category]).trim();
    }

    if (mapping.laborCost && row[mapping.laborCost]) {
      const val = parseNumber(row[mapping.laborCost]);
      if (!isNaN(val) && val >= 0) item.laborCost = val;
    }

    if (mapping.materialCost && row[mapping.materialCost]) {
      const val = parseNumber(row[mapping.materialCost]);
      if (!isNaN(val) && val >= 0) item.materialCost = val;
    }

    if (mapping.equipmentCost && row[mapping.equipmentCost]) {
      const val = parseNumber(row[mapping.equipmentCost]);
      if (!isNaN(val) && val >= 0) item.equipmentCost = val;
    }

    // RSMeans specific fields
    if (standard === 'rsmeans') {
      if (mapping.crewCode && row[mapping.crewCode]) {
        item.crewCode = String(row[mapping.crewCode]).trim();
      }

      if (mapping.productivity && row[mapping.productivity]) {
        const val = parseNumber(row[mapping.productivity]);
        if (!isNaN(val) && val > 0) item.productivity = val;
      }

      if (mapping.location && row[mapping.location]) {
        item.location = String(row[mapping.location]).trim();
      }

      if (mapping.locationFactor && row[mapping.locationFactor]) {
        const val = parseNumber(row[mapping.locationFactor]);
        if (!isNaN(val) && val > 0) item.locationFactor = val;
      }

      if (mapping.assemblyType && row[mapping.assemblyType]) {
        item.assemblyType = String(row[mapping.assemblyType]).trim().toLowerCase();
      }
    }

    return item;
  } catch (error) {
    return null;
  }
}

/**
 * Parse number from various formats (US: 1,234.56  EU: 1.234,56  Turkish: 1.234,56)
 */
function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove spaces
    let cleaned = val.replace(/\s/g, '');

    // Count periods and commas to determine format
    const periodCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;

    if (periodCount > 1 && commaCount === 1) {
      // European format: 1.234,56
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (commaCount > 1 && periodCount === 1) {
      // US format: 1,234.56
      cleaned = cleaned.replace(/,/g, '');
    } else if (periodCount === 0 && commaCount === 1) {
      // Could be European decimal: 1234,56
      cleaned = cleaned.replace(',', '.');
    } else if (periodCount === 1 && commaCount === 0) {
      // Already correct: 1234.56
    } else {
      // Remove all non-numeric except last decimal separator
      const lastPeriod = cleaned.lastIndexOf('.');
      const lastComma = cleaned.lastIndexOf(',');
      if (lastComma > lastPeriod) {
        // Last separator is comma, treat as decimal
        cleaned = cleaned.replace(/[.,]/g, (match, offset) => offset === lastComma ? '.' : '');
      } else {
        // Last separator is period, remove commas
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    return parseFloat(cleaned);
  }
  return NaN;
}

/**
 * Get MasterFormat division name from code
 */
export function getMasterFormatDivisionName(divisionCode: string): string {
  const divisions: Record<string, string> = {
    '00': 'Procurement and Contracting Requirements',
    '01': 'General Requirements',
    '02': 'Existing Conditions',
    '03': 'Concrete',
    '04': 'Masonry',
    '05': 'Metals',
    '06': 'Wood, Plastics, and Composites',
    '07': 'Thermal and Moisture Protection',
    '08': 'Openings',
    '09': 'Finishes',
    '10': 'Specialties',
    '11': 'Equipment',
    '12': 'Furnishings',
    '13': 'Special Construction',
    '14': 'Conveying Equipment',
    '21': 'Fire Suppression',
    '22': 'Plumbing',
    '23': 'Heating, Ventilating, and Air Conditioning (HVAC)',
    '25': 'Integrated Automation',
    '26': 'Electrical',
    '27': 'Communications',
    '28': 'Electronic Safety and Security',
    '31': 'Earthwork',
    '32': 'Exterior Improvements',
    '33': 'Utilities',
    '34': 'Transportation',
    '35': 'Waterway and Marine Construction',
    '40': 'Process Integration',
    '41': 'Material Processing and Handling Equipment',
    '42': 'Process Heating, Cooling, and Drying Equipment',
    '43': 'Process Gas and Liquid Handling, Purification',
    '44': 'Pollution and Waste Control Equipment',
    '45': 'Industry-Specific Manufacturing Equipment',
    '48': 'Electrical Power Generation',
  };

  return divisions[divisionCode] || '';
}

/**
 * Auto-detect and parse international catalog
 */
export function autoDetectAndParse(
  catalogName: string,
  rows: Record<string, unknown>[]
): {
  standard: string | null;
  mapping: InternationalColumnMapping | null;
  items: ParsedInternationalItem[];
  errors: string[];
} {
  if (rows.length === 0) {
    return { standard: null, mapping: null, items: [], errors: ['No data rows found'] };
  }

  const standard = detectInternationalStandard(catalogName, rows);
  if (!standard) {
    return { standard: null, mapping: null, items: [], errors: ['Could not detect international standard'] };
  }

  // Get appropriate column mapper
  let mapping: InternationalColumnMapping;
  switch (standard) {
    case 'masterformat':
      mapping = detectMasterFormatColumns(rows[0]);
      break;
    case 'uniformat':
      mapping = detectUniformatColumns(rows[0]);
      break;
    case 'rsmeans':
      mapping = detectRSMeansColumns(rows[0]);
      break;
    case 'uniclass':
      mapping = detectUniclassColumns(rows[0]);
      break;
    default:
      return { standard: null, mapping: null, items: [], errors: ['Unknown standard'] };
  }

  // Parse rows
  const items: ParsedInternationalItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const item = parseInternationalRow(rows[i], mapping, standard);
    if (item) {
      // Enrich MasterFormat items with division names
      if (standard === 'masterformat' && item.divisionCode && !item.divisionName) {
        item.divisionName = getMasterFormatDivisionName(item.divisionCode);
      }
      items.push(item);
    } else {
      errors.push(`Row ${i + 2}: Failed to parse`);
    }
  }

  return { standard, mapping, items, errors };
}
