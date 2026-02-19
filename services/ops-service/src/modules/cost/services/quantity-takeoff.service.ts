// Quantity Takeoff Service — Metraj Cetveli

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export interface CreateQuantityTakeoffInput {
  projectId: string;
  workItemId: string;
  locationId?: string;
  quantity: number;
  unit: string;
  calculationFormula?: string;
  dimensions?: any;
  source?: string;
  drawingRef?: string;
  bimElementId?: string;
  notes?: string;
  measuredBy?: string;
}

export class QuantityTakeoffService {
  async create(input: CreateQuantityTakeoffInput) {
    return await prisma.quantityTakeoff.create({
      data: input,
    });
  }

  async findById(id: string) {
    const takeoff = await prisma.quantityTakeoff.findUnique({
      where: { id },
      include: {
        workItem: true,
      },
    });

    if (!takeoff) {
      throw new NotFoundError('Quantity takeoff', id);
    }

    return takeoff;
  }

  async findByProject(
    projectId: string,
    options?: {
      workItemId?: string;
      locationId?: string;
    }
  ) {
    return await prisma.quantityTakeoff.findMany({
      where: {
        projectId,
        ...(options?.workItemId && { workItemId: options.workItemId }),
        ...(options?.locationId && { locationId: options.locationId }),
      },
      include: {
        workItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, input: Partial<CreateQuantityTakeoffInput>) {
    await this.findById(id);

    return await prisma.quantityTakeoff.update({
      where: { id },
      data: {
        ...input,
        revision: { increment: 1 },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);

    return await prisma.quantityTakeoff.delete({
      where: { id },
    });
  }

  async getSummary(projectId: string) {
    const takeoffs = await this.findByProject(projectId);

    const summary = takeoffs.reduce((acc, takeoff) => {
      const workItemId = takeoff.workItemId;
      const qty = parseFloat(takeoff.quantity.toString());

      if (!acc[workItemId]) {
        acc[workItemId] = {
          workItem: takeoff.workItem,
          totalQuantity: 0,
          count: 0,
        };
      }

      acc[workItemId].totalQuantity += qty;
      acc[workItemId].count += 1;

      return acc;
    }, {} as any);

    return Object.values(summary);
  }
}

export const quantityTakeoffService = new QuantityTakeoffService();
