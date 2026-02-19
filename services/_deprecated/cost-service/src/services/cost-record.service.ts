// Cost Record Service — Maliyet Kayitlari

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export interface CreateCostRecordInput {
  projectId: string;
  budgetItemId?: string;
  amount: number;
  type: 'commitment' | 'actual' | 'forecast';
  date: Date | string;
  description?: string;
  invoiceRef?: string;
  vendor?: string;
  approvedBy?: string;
}

export class CostRecordService {
  async create(input: CreateCostRecordInput) {
    const record = await prisma.costRecord.create({
      data: {
        ...input,
        date: new Date(input.date),
      },
    });

    // Update budget item actual amount if applicable
    if (input.budgetItemId && input.type === 'actual') {
      await prisma.budgetItem.update({
        where: { id: input.budgetItemId },
        data: {
          actualAmount: { increment: input.amount },
        },
      });
    }

    return record;
  }

  async findById(id: string) {
    const record = await prisma.costRecord.findUnique({
      where: { id },
      include: {
        budgetItem: true,
      },
    });

    if (!record) {
      throw new NotFoundError('Cost record', id);
    }

    return record;
  }

  async findByProject(
    projectId: string,
    options?: {
      type?: string;
      startDate?: Date | string;
      endDate?: Date | string;
    }
  ) {
    const where: any = { projectId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = new Date(options.startDate);
      if (options.endDate) where.date.lte = new Date(options.endDate);
    }

    return await prisma.costRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async getTotalByType(projectId: string) {
    const records = await this.findByProject(projectId);

    return records.reduce(
      (acc, record) => {
        const amount = parseFloat(record.amount.toString());
        acc[record.type] = (acc[record.type] || 0) + amount;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  async delete(id: string) {
    const record = await this.findById(id);

    // Reverse budget item update if applicable
    if (record.budgetItemId && record.type === 'actual') {
      await prisma.budgetItem.update({
        where: { id: record.budgetItemId },
        data: {
          actualAmount: {
            decrement: parseFloat(record.amount.toString()),
          },
        },
      });
    }

    return await prisma.costRecord.delete({
      where: { id },
    });
  }
}

export const costRecordService = new CostRecordService();
