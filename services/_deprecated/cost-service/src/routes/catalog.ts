// Price Catalog Routes — Turkish + International Standards Library management
// Supports: Bayindirlik, Iller Bankasi, MasterFormat, UNIFORMAT, Uniclass, RSMeans

import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { catalogService } from '../services/catalog.service';
import { prisma } from '../utils/prisma';
import type { CatalogItemInput } from '../services/catalog.service';
import { autoDetectAndParse } from '../utils/international-parsers';
import { uniclassApiService } from '../services/uniclass-api.service';

const router = Router();

// Multer config — in-memory storage (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are supported'));
    }
  },
});

// ── List catalogs ──
router.get('/', async (req, res, next) => {
  try {
    const { source, year, projectId } = req.query;
    const catalogs = await catalogService.listCatalogs({
      source: source as string,
      year: year ? parseInt(year as string) : undefined,
      projectId: projectId as string,
    });
    res.json({ data: catalogs });
  } catch (e) { next(e); }
});

// ── Create catalog (metadata only) ──
router.post('/', async (req, res, next) => {
  try {
    const { name, source, standard, year, period, region, currency, description, projectId } = req.body;
    const catalog = await catalogService.createCatalog({
      name,
      source,
      standard,
      year: parseInt(year),
      period,
      region,
      currency,
      description,
      projectId,
      uploadedBy: (req as any).user?.id,
    });
    res.status(201).json({ data: catalog });
  } catch (e) { next(e); }
});

// ── Get catalog detail with items ──
router.get('/:id', async (req, res, next) => {
  try {
    const catalog = await catalogService.getCatalog(req.params.id);
    res.json({ data: catalog });
  } catch (e) { next(e); }
});

// ── Delete catalog ──
router.delete('/:id', async (req, res, next) => {
  try {
    await catalogService.deleteCatalog(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── Get categories in a catalog ──
router.get('/:id/categories', async (req, res, next) => {
  try {
    const categories = await catalogService.getCatalogCategories(req.params.id);
    res.json({ data: categories });
  } catch (e) { next(e); }
});

// ── Search items across catalogs ──
router.get('/items/search', async (req, res, next) => {
  try {
    const { catalogId, search, category, divisionCode, uniformatCode, page, limit } = req.query;
    const result = await catalogService.searchItems({
      catalogId: catalogId as string,
      search: search as string,
      category: category as string,
      divisionCode: divisionCode as string,
      uniformatCode: uniformatCode as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });
    res.json({ data: result.items, meta: result.meta });
  } catch (e) { next(e); }
});

// ── Upload & import Excel/CSV file ──
router.post('/:id/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const catalogId = req.params.id as string;

    // Get catalog to check name for standard detection
    const catalog = await prisma.priceCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    // Parse the Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no data rows' });
    }

    // Try international standard auto-detection first
    const intlResult = autoDetectAndParse(catalog.name, rows);

    let items: CatalogItemInput[] = [];
    let errors: string[] = [];
    let detectedStandard: string | null = null;
    let detectedMapping: any = null;

    if (intlResult.standard && intlResult.items.length > 0) {
      // International standard detected and parsed successfully
      items = intlResult.items;
      errors = intlResult.errors;
      detectedStandard = intlResult.standard;
      detectedMapping = intlResult.mapping;

      // Update catalog with detected standard if not already set
      if (!catalog.standard) {
        await prisma.priceCatalog.update({
          where: { id: catalogId },
          data: { standard: detectedStandard },
        });
      }
    } else {
      // Fall back to Turkish/manual column detection
      const mapping = detectColumnMapping(rows[0]);
      detectedMapping = mapping;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const code = String(row[mapping.code] || '').trim();
          const name = String(row[mapping.name] || '').trim();
          const unit = String(row[mapping.unit] || '').trim();
          const unitPrice = parseNumber(row[mapping.unitPrice]);

          if (!code || !name || !unit) {
            errors.push(`Row ${i + 2}: Missing code, name, or unit`);
            continue;
          }
          if (isNaN(unitPrice) || unitPrice <= 0) {
            errors.push(`Row ${i + 2}: Invalid unit price for ${code}`);
            continue;
          }

          items.push({
            code,
            name,
            unit,
            unitPrice,
            category: mapping.category ? String(row[mapping.category] || '').trim() || undefined : undefined,
            laborCost: mapping.laborCost ? parseNumber(row[mapping.laborCost]) || undefined : undefined,
            materialCost: mapping.materialCost ? parseNumber(row[mapping.materialCost]) || undefined : undefined,
            equipmentCost: mapping.equipmentCost ? parseNumber(row[mapping.equipmentCost]) || undefined : undefined,
          });
        } catch {
          errors.push(`Row ${i + 2}: Parse error`);
        }
      }
    }

    if (items.length === 0) {
      return res.status(400).json({
        error: 'No valid items found in file',
        details: errors.slice(0, 20),
        detectedStandard,
        detectedColumns: detectedMapping,
      });
    }

    // Update catalog with file info
    await prisma.priceCatalog.update({
      where: { id: catalogId },
      data: {
        fileName: req.file.originalname,
        fileType: req.file.originalname.split('.').pop()?.toLowerCase(),
      },
    });

    // Import items
    const result = await catalogService.importItems(catalogId, items);

    res.json({
      data: {
        ...result,
        errors: errors.length,
        errorDetails: errors.slice(0, 20),
        detectedStandard,
        detectedColumns: detectedMapping,
      },
    });
  } catch (e) { next(e); }
});

// ── Manually add items to catalog ──
router.post('/:id/items', async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const result = await catalogService.importItems(req.params.id, items);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// ── Copy catalog items to project work items ──
router.post('/:id/copy-to-project', async (req, res, next) => {
  try {
    const { itemIds, projectId } = req.body;
    if (!Array.isArray(itemIds) || !projectId) {
      return res.status(400).json({ error: 'itemIds array and projectId are required' });
    }
    const result = await catalogService.copyToWorkItems(req.params.id, itemIds, projectId);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// ── Get MasterFormat divisions in a catalog ──
router.get('/:id/divisions', async (req, res, next) => {
  try {
    const catalogId = req.params.id;
    const divisions = await prisma.priceCatalogItem.findMany({
      where: { catalogId },
      select: { divisionCode: true, divisionName: true },
      distinct: ['divisionCode'],
      orderBy: { divisionCode: 'asc' },
    });

    const filtered = divisions
      .filter(d => d.divisionCode)
      .map(d => ({ code: d.divisionCode, name: d.divisionName || '' }));

    res.json({ data: filtered });
  } catch (e) { next(e); }
});

// ──────────────────────────────────────────────────────────────────────────────
// UNICLASS API INTEGRATION (Live UK Construction Classification)
// ──────────────────────────────────────────────────────────────────────────────

// ── Check Uniclass API health ──
router.get('/uniclass/health', async (req, res, next) => {
  try {
    const health = await uniclassApiService.healthCheck();
    res.json({ data: health });
  } catch (e) { next(e); }
});

// ── Search Uniclass classifications ──
router.get('/uniclass/search', async (req, res, next) => {
  try {
    const { q, table } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await uniclassApiService.search(q, table as string);
    res.json({ data: results });
  } catch (e) { next(e); }
});

// ── Get Uniclass table ──
router.get('/uniclass/tables/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    const validTables = ['Ac', 'Co', 'En', 'Pr', 'SL', 'EF', 'Ss', 'FI', 'Zz'];

    if (!validTables.includes(table)) {
      return res.status(400).json({
        error: `Invalid table code. Valid codes: ${validTables.join(', ')}`,
        tables: {
          Ac: 'Activities',
          Co: 'Complexes',
          En: 'Entities',
          Pr: 'Products',
          SL: 'Spaces/Locations',
          EF: 'Elements/Functions',
          Ss: 'Systems',
          FI: 'Form of Information',
          Zz: 'CAD'
        }
      });
    }

    const data = await uniclassApiService.getTable(table as any);
    res.json({ data });
  } catch (e) { next(e); }
});

// ── Get Uniclass classification by code ──
router.get('/uniclass/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const data = await uniclassApiService.getClassification(code);
    res.json({ data });
  } catch (e) { next(e); }
});

// ── Get children of Uniclass classification ──
router.get('/uniclass/:code/children', async (req, res, next) => {
  try {
    const { code } = req.params;
    const data = await uniclassApiService.getChildren(code);
    res.json({ data });
  } catch (e) { next(e); }
});

// ── Get ancestors (breadcrumb) of Uniclass classification ──
router.get('/uniclass/:code/ancestors', async (req, res, next) => {
  try {
    const { code } = req.params;
    const data = await uniclassApiService.getAncestors(code);
    res.json({ data });
  } catch (e) { next(e); }
});

// ──────────────────────────────────────────────────────────────────────────────
// UNICLASS OFFLINE CACHE + HIERARCHICAL BROWSE
// ──────────────────────────────────────────────────────────────────────────────

import { uniclassCacheService } from '../services/uniclass-cache.service';

// ── Cache stats ──
router.get('/uniclass/cache/stats', async (req, res, next) => {
  try {
    const stats = await uniclassCacheService.getStats();
    res.json({ data: stats });
  } catch (e) { next(e); }
});

// ── Sync a table to cache ──
router.post('/uniclass/cache/sync/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    const validTables = ['Ac', 'Co', 'En', 'Pr', 'SL', 'EF', 'Ss', 'FI', 'Zz'];
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: `Invalid table. Use: ${validTables.join(', ')}` });
    }
    const result = await uniclassCacheService.syncTable(table);
    res.json({ data: result });
  } catch (e) { next(e); }
});

// ── Browse table roots (cached) ──
router.get('/uniclass/browse/:table', async (req, res, next) => {
  try {
    const { table } = req.params;
    const roots = await uniclassCacheService.getTableRoots(table);
    res.json({ data: roots });
  } catch (e) { next(e); }
});

// ── Browse children (cached) ──
router.get('/uniclass/browse/:table/:code/children', async (req, res, next) => {
  try {
    const { code } = req.params;
    const children = await uniclassCacheService.getChildren(code);
    res.json({ data: children });
  } catch (e) { next(e); }
});

// ── Cached search (falls back to local DB if API unavailable) ──
router.get('/uniclass/cached-search', async (req, res, next) => {
  try {
    const { q, table } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const results = await uniclassCacheService.search(q, table as string);
    res.json({ data: results });
  } catch (e) { next(e); }
});

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Handle Turkish number format: 1.234,56 → 1234.56
    const cleaned = val.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned);
  }
  return NaN;
}

interface ColumnMapping {
  code: string;
  name: string;
  unit: string;
  unitPrice: string;
  category?: string;
  laborCost?: string;
  materialCost?: string;
  equipmentCost?: string;
}

function detectColumnMapping(firstRow: Record<string, unknown>): ColumnMapping {
  const keys = Object.keys(firstRow);
  const lower = keys.map(k => k.toLowerCase().trim());

  const find = (patterns: string[]): string | undefined => {
    for (const pattern of patterns) {
      const idx = lower.findIndex(k => k.includes(pattern));
      if (idx >= 0) return keys[idx];
    }
    return undefined;
  };

  // Turkish + English column name patterns
  const code = find(['poz no', 'poz kodu', 'code', 'kod', 'item code', 'no', 'sıra']) || keys[0];
  const name = find(['tanım', 'açıklama', 'description', 'name', 'iş kalemi', 'poz adı', 'imalat']) || keys[1];
  const unit = find(['birim', 'unit', 'ölçü']) || keys[2];
  const unitPrice = find(['birim fiyat', 'unit price', 'fiyat', 'price', 'tutar', 'rayiç']) || keys[3];
  const category = find(['kategori', 'category', 'grup', 'group', 'bölüm', 'section']);
  const laborCost = find(['işçilik', 'labor', 'işç.']);
  const materialCost = find(['malzeme', 'material', 'mlz.']);
  const equipmentCost = find(['makine', 'equipment', 'ekipman', 'makina']);

  return { code, name, unit, unitPrice, category, laborCost, materialCost, equipmentCost };
}

export default router;
