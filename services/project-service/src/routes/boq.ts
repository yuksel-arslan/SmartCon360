import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { uploadBoq } from '../middleware/upload';
import { transferBoqToCostPilot } from '../utils/service-client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import pino from 'pino';

const router = Router();
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * BOQ (Bill of Quantities) Upload & Import
 *
 * Flow:
 * 1. User uploads Excel/CSV file
 * 2. System parses and validates the data
 * 3. Parsed items are returned for preview/confirmation
 * 4. On confirm, items are transferred to CostPilot (cost-service) as WorkItems
 *
 * Expected BOQ columns (flexible matching):
 * - code / item_code / poz_no
 * - name / description / item_description
 * - unit / birim
 * - quantity / miktar / amount
 * - unit_price / birim_fiyat (optional)
 * - category / kategori (optional)
 * - wbs_code (optional)
 */

interface ParsedBoqItem {
  rowIndex: number;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  wbsCode?: string;
  isValid: boolean;
  errors: string[];
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  code: ['code', 'item_code', 'poz_no', 'poz', 'item no', 'item number', 'no', 'sira', 'sıra'],
  name: ['name', 'description', 'item_description', 'tanim', 'tanım', 'aciklama', 'açıklama', 'work_item', 'is_kalemi', 'iş kalemi'],
  unit: ['unit', 'birim', 'olcu_birimi', 'ölçü birimi', 'uom'],
  quantity: ['quantity', 'miktar', 'amount', 'qty', 'adet'],
  unitPrice: ['unit_price', 'birim_fiyat', 'birim fiyat', 'price', 'fiyat', 'rate'],
  totalPrice: ['total_price', 'toplam', 'total', 'tutar', 'amount'],
  category: ['category', 'kategori', 'group', 'grup', 'division', 'trade'],
  wbsCode: ['wbs_code', 'wbs', 'work_breakdown'],
};

function findColumn(headers: string[], fieldName: string): number {
  const mappings = COLUMN_MAPPINGS[fieldName] || [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim().replace(/[^a-z0-9_\s]/g, '');
    if (mappings.some((m) => header === m || header.includes(m))) {
      return i;
    }
  }
  return -1;
}

function parseBoqFile(filePath: string): { headers: string[]; items: ParsedBoqItem[]; errors: string[] } {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

  if (rawData.length < 2) {
    return { headers: [], items: [], errors: ['File is empty or has only headers'] };
  }

  const headers = rawData[0].map((h) => String(h || '').trim());
  const errors: string[] = [];

  // Find column indices
  const codeCol = findColumn(headers, 'code');
  const nameCol = findColumn(headers, 'name');
  const unitCol = findColumn(headers, 'unit');
  const qtyCol = findColumn(headers, 'quantity');
  const priceCol = findColumn(headers, 'unitPrice');
  const totalCol = findColumn(headers, 'totalPrice');
  const catCol = findColumn(headers, 'category');
  const wbsCol = findColumn(headers, 'wbsCode');

  if (nameCol === -1) {
    errors.push('Could not find "name" or "description" column');
  }
  if (unitCol === -1) {
    errors.push('Could not find "unit" column');
  }

  const items: ParsedBoqItem[] = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.every((cell) => !cell || String(cell).trim() === '')) continue;

    const itemErrors: string[] = [];
    const code = codeCol >= 0 ? String(row[codeCol] || '').trim() : `BOQ-${String(i).padStart(4, '0')}`;
    const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    const unit = unitCol >= 0 ? String(row[unitCol] || '').trim() : '';
    const quantity = qtyCol >= 0 ? parseFloat(String(row[qtyCol] || '0').replace(',', '.')) : 0;
    const unitPrice = priceCol >= 0 ? parseFloat(String(row[priceCol] || '0').replace(',', '.')) : undefined;
    const totalPrice = totalCol >= 0 ? parseFloat(String(row[totalCol] || '0').replace(',', '.')) : undefined;
    const category = catCol >= 0 ? String(row[catCol] || '').trim() : undefined;
    const wbsCode = wbsCol >= 0 ? String(row[wbsCol] || '').trim() : undefined;

    if (!name) itemErrors.push('Missing item name/description');
    if (!unit) itemErrors.push('Missing unit');
    if (isNaN(quantity) || quantity <= 0) itemErrors.push('Invalid quantity');

    items.push({
      rowIndex: i + 1,
      code,
      name,
      unit,
      quantity: isNaN(quantity) ? 0 : quantity,
      unitPrice: unitPrice && !isNaN(unitPrice) ? unitPrice : undefined,
      totalPrice: totalPrice && !isNaN(totalPrice) ? totalPrice : undefined,
      category: category || undefined,
      wbsCode: wbsCode || undefined,
      isValid: itemErrors.length === 0,
      errors: itemErrors,
    });
  }

  return { headers, items, errors };
}

export default function boqRoutes(prisma: PrismaClient) {
  // POST /projects/:id/boq/upload — Upload and parse BOQ file
  router.post('/projects/:id/boq/upload', uploadBoq.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ data: null, error: { code: 'NO_FILE', message: 'No file uploaded' } });
      }

      const { headers, items, errors } = parseBoqFile(file.path);

      const validItems = items.filter((i) => i.isValid);
      const invalidItems = items.filter((i) => !i.isValid);

      // Update project setup
      await prisma.projectSetup.upsert({
        where: { projectId: req.params.id as string },
        create: {
          projectId: req.params.id as string,
          boqUploaded: true,
          boqFileName: file.originalname,
          boqItemCount: validItems.length,
        },
        update: {
          boqUploaded: true,
          boqFileName: file.originalname,
          boqItemCount: validItems.length,
        },
      });

      res.json({
        data: {
          fileName: file.originalname,
          headers,
          items,
          summary: {
            total: items.length,
            valid: validItems.length,
            invalid: invalidItems.length,
            hasQuantities: items.some((i) => i.quantity > 0),
            hasPrices: items.some((i) => i.unitPrice && i.unitPrice > 0),
            hasWbsCodes: items.some((i) => i.wbsCode),
            hasCategories: items.some((i) => i.category),
          },
        },
        meta: { parseErrors: errors },
        error: null,
      });
    } catch (err: any) {
      logger.error(err, 'BOQ upload failed');
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // POST /projects/:id/boq/confirm — Confirm and transfer BOQ to CostPilot
  router.post('/projects/:id/boq/confirm', async (req, res) => {
    try {
      const { items, currency } = req.body as { items: ParsedBoqItem[]; currency?: string };
      const projectId = req.params.id;

      if (!items || items.length === 0) {
        return res.status(400).json({
          data: null,
          error: { code: 'VALIDATION', message: 'No items to import' },
        });
      }

      // Get project info
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { currency: true, projectType: true },
      });

      const projectCurrency = currency || project?.currency || 'USD';

      // Transfer to CostPilot via internal API call
      // Since we're in the same database, we could also write directly if schemas align.
      // For now, we prepare the data for the cost-service API.
      const workItems = items
        .filter((i) => i.isValid)
        .map((item, index) => ({
          code: item.code,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || (item.unitPrice ? item.quantity * item.unitPrice : undefined),
          category: item.category || 'general',
          wbsCode: item.wbsCode,
          sortOrder: index,
          source: 'boq_import',
          currency: projectCurrency,
        }));

      // Store BOQ data in project settings for cross-service access
      await prisma.project.update({
        where: { id: projectId },
        data: {
          settings: {
            boqImport: {
              importedAt: new Date().toISOString(),
              itemCount: workItems.length,
              currency: projectCurrency,
              items: workItems,
            },
          },
        },
      });

      // Update setup
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: {
          projectId,
          boqUploaded: true,
          boqItemCount: workItems.length,
          completedSteps: ['boq'],
        },
        update: {
          boqUploaded: true,
          boqItemCount: workItems.length,
        },
      });

      // Transfer to CostPilot work-items (best-effort — doesn't block response)
      const authHeader = req.headers.authorization;
      const costPilotResult = await transferBoqToCostPilot(
        projectId,
        workItems,
        authHeader,
      ).catch((err) => {
        logger.warn(err, 'BOQ→CostPilot transfer failed (non-blocking)');
        return { success: false, data: { created: 0, failed: workItems.length }, error: 'Transfer failed' };
      });

      res.json({
        data: {
          imported: workItems.length,
          items: workItems,
          costPilotTransfer: {
            attempted: true,
            success: costPilotResult.success,
            created: costPilotResult.data?.created || 0,
            failed: costPilotResult.data?.failed || 0,
          },
        },
        error: null,
      });
    } catch (err: any) {
      logger.error(err, 'BOQ confirm failed');
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  // GET /projects/:id/boq/status — Check BOQ import status
  router.get('/projects/:id/boq/status', async (req, res) => {
    try {
      const setup = await prisma.projectSetup.findUnique({
        where: { projectId: req.params.id },
        select: { boqUploaded: true, boqFileName: true, boqItemCount: true },
      });

      res.json({
        data: setup || { boqUploaded: false, boqFileName: null, boqItemCount: 0 },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ data: null, error: { code: 'INTERNAL', message: err.message } });
    }
  });

  return router;
}
