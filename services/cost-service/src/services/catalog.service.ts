// Price Catalog Service — Bayindirlik, Iller Bankasi, Custom unit price libraries

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export interface CreateCatalogInput {
  projectId?: string;
  name: string;
  source: string;
  year: number;
  period?: string;
  currency?: string;
  description?: string;
  fileName?: string;
  fileType?: string;
  uploadedBy?: string;
}

export interface CatalogItemInput {
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  category?: string;
  subcategory?: string;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
  notes?: string;
}

export class CatalogService {
  /** Create a new price catalog */
  async createCatalog(input: CreateCatalogInput) {
    return await prisma.priceCatalog.create({
      data: input,
      include: { _count: { select: { items: true } } },
    });
  }

  /** List all catalogs, optionally filtered */
  async listCatalogs(opts?: { source?: string; year?: number; projectId?: string }) {
    const where: Record<string, unknown> = { isActive: true };
    if (opts?.source) where.source = opts.source;
    if (opts?.year) where.year = opts.year;
    if (opts?.projectId) {
      where.OR = [{ projectId: opts.projectId }, { projectId: null }];
    }
    return await prisma.priceCatalog.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });
  }

  /** Get catalog detail with items */
  async getCatalog(id: string) {
    const catalog = await prisma.priceCatalog.findUnique({
      where: { id },
      include: { items: { orderBy: { code: 'asc' } } },
    });
    if (!catalog) throw new NotFoundError('Price catalog', id);
    return catalog;
  }

  /** Delete catalog */
  async deleteCatalog(id: string) {
    await prisma.priceCatalog.delete({ where: { id } });
  }

  /** Import items into a catalog (bulk) */
  async importItems(catalogId: string, items: CatalogItemInput[]) {
    // Validate catalog exists
    const catalog = await prisma.priceCatalog.findUnique({ where: { id: catalogId } });
    if (!catalog) throw new NotFoundError('Price catalog', catalogId);

    // Bulk create items
    const created = await prisma.priceCatalogItem.createMany({
      data: items.map(item => ({
        catalogId,
        code: item.code,
        name: item.name,
        unit: item.unit,
        unitPrice: item.unitPrice,
        category: item.category,
        subcategory: item.subcategory,
        laborCost: item.laborCost,
        materialCost: item.materialCost,
        equipmentCost: item.equipmentCost,
        notes: item.notes,
      })),
    });

    // Update item count
    const count = await prisma.priceCatalogItem.count({ where: { catalogId } });
    await prisma.priceCatalog.update({
      where: { id: catalogId },
      data: { itemCount: count },
    });

    return { imported: created.count, total: count };
  }

  /** Search items across catalogs */
  async searchItems(opts: {
    catalogId?: string;
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (opts.catalogId) where.catalogId = opts.catalogId;
    if (opts.category) where.category = opts.category;
    if (opts.search) {
      where.OR = [
        { code: { contains: opts.search, mode: 'insensitive' } },
        { name: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.priceCatalogItem.findMany({
        where,
        include: { catalog: { select: { name: true, source: true, year: true } } },
        orderBy: { code: 'asc' },
        skip,
        take: limit,
      }),
      prisma.priceCatalogItem.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, pages: Math.ceil(total / limit), limit },
    };
  }

  /** Get categories in a catalog */
  async getCatalogCategories(catalogId: string) {
    const items = await prisma.priceCatalogItem.findMany({
      where: { catalogId },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return items.map(i => i.category).filter(Boolean);
  }

  /** Copy catalog items to project work items */
  async copyToWorkItems(
    catalogId: string,
    itemIds: string[],
    projectId: string,
  ) {
    const catalogItems = await prisma.priceCatalogItem.findMany({
      where: { id: { in: itemIds }, catalogId },
      include: { catalog: true },
    });

    const created = [];
    for (const ci of catalogItems) {
      // Check if work item with same code already exists
      const existing = await prisma.workItem.findFirst({
        where: { projectId, code: ci.code },
      });
      if (existing) continue;

      const workItem = await prisma.workItem.create({
        data: {
          projectId,
          code: ci.code,
          name: ci.name,
          unit: ci.unit,
          category: ci.category || 'General',
          subcategory: ci.subcategory,
          source: ci.catalog.source,
          sourceYear: ci.catalog.year,
        },
      });

      // Auto-create unit price analysis from catalog data
      await prisma.unitPriceAnalysis.create({
        data: {
          workItemId: workItem.id,
          version: 1,
          laborCost: ci.laborCost || 0,
          materialCost: ci.materialCost || 0,
          equipmentCost: ci.equipmentCost || 0,
          subtotal: ci.unitPrice,
          unitPrice: ci.unitPrice,
          source: ci.catalog.source,
        },
      });

      created.push(workItem);
    }

    return { created: created.length, skipped: itemIds.length - created.length };
  }
}

export const catalogService = new CatalogService();
