import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import * as XLSX from 'xlsx';

const BOQ_EXTENSIONS = ['xlsx', 'xls', 'csv'];

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
    if (mappings.some((m) => header === m || header.includes(m))) return i;
  }
  return -1;
}

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/boq/upload — Upload and parse BOQ file
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_FILE', message: 'No file uploaded' } },
        { status: 400 },
      );
    }

    const nameParts = file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : '';
    if (!BOQ_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { data: null, error: { code: 'INVALID_TYPE', message: `Unsupported file: .${ext}. Allowed: ${BOQ_EXTENSIONS.map(e => '.' + e).join(', ')}` } },
        { status: 400 },
      );
    }

    // Parse from buffer directly — no filesystem needed
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    if (rawData.length < 2) {
      return NextResponse.json({
        data: { fileName: file.name, headers: [], items: [], summary: { total: 0, valid: 0, invalid: 0 } },
        meta: { parseErrors: ['File is empty or has only headers'] },
        error: null,
      });
    }

    const headers = rawData[0].map((h) => String(h || '').trim());
    const parseErrors: string[] = [];

    const codeCol = findColumn(headers, 'code');
    const nameCol = findColumn(headers, 'name');
    const unitCol = findColumn(headers, 'unit');
    const qtyCol = findColumn(headers, 'quantity');
    const priceCol = findColumn(headers, 'unitPrice');
    const totalCol = findColumn(headers, 'totalPrice');
    const catCol = findColumn(headers, 'category');
    const wbsCol = findColumn(headers, 'wbsCode');

    if (nameCol === -1) parseErrors.push('Could not find "name" or "description" column');
    if (unitCol === -1) parseErrors.push('Could not find "unit" column');

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
        rowIndex: i + 1, code, name, unit,
        quantity: isNaN(quantity) ? 0 : quantity,
        unitPrice: unitPrice && !isNaN(unitPrice) ? unitPrice : undefined,
        totalPrice: totalPrice && !isNaN(totalPrice) ? totalPrice : undefined,
        category: category || undefined,
        wbsCode: wbsCode || undefined,
        isValid: itemErrors.length === 0,
        errors: itemErrors,
      });
    }

    const validItems = items.filter((i) => i.isValid);

    // Update project setup
    await prisma.projectSetup.upsert({
      where: { projectId },
      create: { projectId, boqUploaded: true, boqFileName: file.name, boqItemCount: validItems.length },
      update: { boqUploaded: true, boqFileName: file.name, boqItemCount: validItems.length },
    });

    return NextResponse.json({
      data: {
        fileName: file.name,
        headers,
        items,
        summary: {
          total: items.length,
          valid: validItems.length,
          invalid: items.length - validItems.length,
          hasQuantities: items.some((i) => i.quantity > 0),
          hasPrices: items.some((i) => i.unitPrice && i.unitPrice > 0),
          hasWbsCodes: items.some((i) => i.wbsCode),
          hasCategories: items.some((i) => i.category),
        },
      },
      meta: { parseErrors },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
