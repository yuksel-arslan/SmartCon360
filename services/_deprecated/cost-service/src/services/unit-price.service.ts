// Unit Price Analysis Service — Birim Fiyat Analizi

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import type { Prisma } from '@prisma/client';

export interface CreateUnitPriceAnalysisInput {
  workItemId: string;
  version?: number;
  analysisDate?: Date | string;
  overheadPct?: number;
  profitPct?: number;
  source?: string;
  notes?: string;
  resources: Array<{
    resourceType: 'labor' | 'material' | 'equipment';
    code?: string;
    name: string;
    unit: string;
    quantity: number;
    unitRate: number;
    rateSource?: string;
    rateDate?: Date | string;
  }>;
}

export class UnitPriceService {
  /**
   * Create new unit price analysis with resources
   */
  async create(input: CreateUnitPriceAnalysisInput) {
    const { resources, analysisDate, ...restData } = input;
    const analysisData = {
      ...restData,
      ...(analysisDate ? { analysisDate: new Date(analysisDate) } : {}),
    };

    // Calculate totals from resources
    let laborCost = 0;
    let materialCost = 0;
    let equipmentCost = 0;

    const resourcesWithTotals = resources.map((r, idx) => {
      const total = r.quantity * r.unitRate;

      if (r.resourceType === 'labor') laborCost += total;
      else if (r.resourceType === 'material') materialCost += total;
      else if (r.resourceType === 'equipment') equipmentCost += total;

      const { rateDate, ...restR } = r;
      return {
        ...restR,
        ...(rateDate ? { rateDate: new Date(rateDate) } : {}),
        total,
        sortOrder: idx,
      };
    });

    const subtotal = laborCost + materialCost + equipmentCost;
    const overheadPct = input.overheadPct || 0;
    const profitPct = input.profitPct || 0;

    const overheadAmount = (subtotal * overheadPct) / 100;
    const profitAmount = (subtotal * profitPct) / 100;
    const unitPrice = subtotal + overheadAmount + profitAmount;

    return await prisma.unitPriceAnalysis.create({
      data: {
        ...analysisData,
        laborCost,
        materialCost,
        equipmentCost,
        subtotal,
        overheadAmount,
        profitAmount,
        unitPrice,
        resources: {
          create: resourcesWithTotals,
        },
      },
      include: {
        resources: true,
      },
    });
  }

  /**
   * Get active analysis for work item
   */
  async findByWorkItem(workItemId: string) {
    return await prisma.unitPriceAnalysis.findMany({
      where: { workItemId, isActive: true },
      include: {
        resources: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Get latest active analysis
   */
  async findLatestByWorkItem(workItemId: string) {
    const analysis = await prisma.unitPriceAnalysis.findFirst({
      where: { workItemId, isActive: true },
      include: {
        resources: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (!analysis) {
      throw new NotFoundError('Unit price analysis for work item', workItemId);
    }

    return analysis;
  }

  /**
   * Get analysis by ID
   */
  async findById(id: string) {
    const analysis = await prisma.unitPriceAnalysis.findUnique({
      where: { id },
      include: {
        resources: {
          orderBy: { sortOrder: 'asc' },
        },
        workItem: true,
      },
    });

    if (!analysis) {
      throw new NotFoundError('Unit price analysis', id);
    }

    return analysis;
  }

  /**
   * Update analysis (creates new version)
   */
  async update(id: string, input: CreateUnitPriceAnalysisInput) {
    const existing = await this.findById(id);

    // Deactivate old version
    await prisma.unitPriceAnalysis.update({
      where: { id },
      data: { isActive: false },
    });

    // Create new version
    return await this.create({
      ...input,
      workItemId: existing.workItemId,
      version: existing.version + 1,
    });
  }

  /**
   * Bulk recalculate unit prices (e.g., after rayic update)
   */
  async bulkRecalculate(workItemIds: string[]) {
    // TODO: Implement bulk recalculation logic
    // This would re-fetch latest rayic rates and update analyses
    return { updated: 0, failed: 0 };
  }
}

export const unitPriceService = new UnitPriceService();
