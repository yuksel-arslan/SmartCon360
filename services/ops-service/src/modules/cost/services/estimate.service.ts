// Estimate Service — Kesif / Yaklasik Maliyet

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';
import { unitPriceService } from './unit-price.service';

export interface CreateEstimateInput {
  projectId: string;
  name: string;
  type: string;
  vatPct?: number;
  createdBy: string;
  notes?: string;
}

export interface CreateEstimateItemInput {
  workItemId: string;
  locationId?: string;
  quantity: number;
  unitPrice: number;
}

export class EstimateService {
  /**
   * Create new estimate (empty)
   */
  async create(input: CreateEstimateInput) {
    return await prisma.estimate.create({
      data: {
        ...input,
        vatPct: input.vatPct || 20,
      },
    });
  }

  /**
   * Get estimate by ID
   */
  async findById(id: string) {
    const estimate = await prisma.estimate.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workItem: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!estimate) {
      throw new NotFoundError('Estimate', id);
    }

    return estimate;
  }

  /**
   * Get all estimates for a project
   */
  async findByProject(projectId: string) {
    return await prisma.estimate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Add items to estimate
   */
  async addItems(estimateId: string, items: CreateEstimateItemInput[]) {
    const estimate = await this.findById(estimateId);

    const createdItems = await prisma.estimateItem.createMany({
      data: items.map((item, idx) => ({
        estimateId,
        ...item,
        totalPrice: item.quantity * item.unitPrice,
        sortOrder: idx,
      })),
    });

    // Recalculate estimate totals
    await this.recalculateTotals(estimateId);

    return createdItems;
  }

  /**
   * Auto-generate estimate from metraj (quantity takeoffs)
   */
  async generateFromMetraj(
    projectId: string,
    name: string,
    type: string,
    createdBy: string
  ) {
    // Get all quantity takeoffs for project
    const takeoffs = await prisma.quantityTakeoff.findMany({
      where: { projectId },
      include: { workItem: true },
    });

    if (takeoffs.length === 0) {
      throw new NotFoundError('Quantity takeoffs for project', projectId);
    }

    // Create estimate
    const estimate = await this.create({
      projectId,
      name,
      type,
      createdBy,
    });

    // For each takeoff, get latest unit price and create estimate item
    const items: CreateEstimateItemInput[] = [];

    for (const takeoff of takeoffs) {
      try {
        const unitPriceAnalysis =
          await unitPriceService.findLatestByWorkItem(takeoff.workItemId);

        items.push({
          workItemId: takeoff.workItemId,
          locationId: takeoff.locationId || undefined,
          quantity: parseFloat(takeoff.quantity.toString()),
          unitPrice: parseFloat(unitPriceAnalysis.unitPrice.toString()),
        });
      } catch (error) {
        // Skip if no unit price analysis found
        continue;
      }
    }

    if (items.length > 0) {
      await this.addItems(estimate.id, items);
    }

    return await this.findById(estimate.id);
  }

  /**
   * Recalculate estimate totals
   */
  async recalculateTotals(estimateId: string) {
    const estimate = await this.findById(estimateId);

    const totalAmount = estimate.items.reduce(
      (sum, item) => sum + parseFloat(item.totalPrice.toString()),
      0
    );

    const vatPct = parseFloat(estimate.vatPct.toString());
    const vatAmount = (totalAmount * vatPct) / 100;
    const grandTotal = totalAmount + vatAmount;

    return await prisma.estimate.update({
      where: { id: estimateId },
      data: {
        totalAmount,
        vatAmount,
        grandTotal,
      },
    });
  }

  /**
   * Approve estimate
   */
  async approve(estimateId: string, approvedBy: string) {
    return await prisma.estimate.update({
      where: { id: estimateId },
      data: {
        status: 'approved',
        approvedBy,
        approvedDate: new Date(),
      },
    });
  }

  /**
   * Delete estimate
   */
  async delete(id: string) {
    await this.findById(id);

    return await prisma.estimate.delete({
      where: { id },
    });
  }
}

export const estimateService = new EstimateService();
