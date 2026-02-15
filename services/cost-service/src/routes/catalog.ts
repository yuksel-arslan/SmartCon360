// Price Catalog Routes — Library management + Excel/CSV import

import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { catalogService } from '../services/catalog.service';
import { prisma } from '../utils/prisma';
import type { CatalogItemInput } from '../services/catalog.service';

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
    const { name, source, year, period, currency, description, projectId } = req.body;
    const catalog = await catalogService.createCatalog({
      name,
      source,
      year: parseInt(year),
      period,
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
    const { catalogId, search, category, page, limit } = req.query;
    const result = await catalogService.searchItems({
      catalogId: catalogId as string,
      search: search as string,
      category: category as string,
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

    // Parse the Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or has no data rows' });
    }

    // Auto-detect column mapping
    const mapping = detectColumnMapping(rows[0]);

    // Parse rows into catalog items
    const items: CatalogItemInput[] = [];
    const errors: string[] = [];

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

    if (items.length === 0) {
      return res.status(400).json({
        error: 'No valid items found in file',
        details: errors.slice(0, 20),
        detectedColumns: mapping,
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
        detectedColumns: mapping,
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
