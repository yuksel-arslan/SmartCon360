// Budget Service — Bütçe Yönetimi

import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export interface CreateBudgetInput {
  projectId: string;
  estimateId?: string;
  name: string;
  totalAmount: number;
  currency?: string;
}

export interface CreateBudgetItemInput {
  workItemId?: string;
  wbsCode?: string;
  description: string;
  tradeId?: string;
  plannedAmount: number;
  category: string;
}

export class BudgetService {
  async create(input: CreateBudgetInput) {
    return await prisma.budget.create({
      data: {
        ...input,
        currency: input.currency || 'TRY',
      },
    });
  }

  async findById(id: string) {
    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workItem: true,
          },
        },
      },
    });

    if (!budget) {
      throw new NotFoundError('Budget', id);
    }

    return budget;
  }

  async findByProject(projectId: string) {
    return await prisma.budget.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addItems(budgetId: string, items: CreateBudgetItemInput[]) {
    await prisma.budgetItem.createMany({
      data: items.map((item) => ({
        budgetId,
        ...item,
      })),
    });

    return await this.findById(budgetId);
  }

  async createFromEstimate(estimateId: string, name: string) {
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: { items: true },
    });

    if (!estimate) {
      throw new NotFoundError('Estimate', estimateId);
    }

    const budget = await this.create({
      projectId: estimate.projectId,
      estimateId,
      name,
      totalAmount: parseFloat(estimate.totalAmount.toString()),
    });

    const budgetItems: CreateBudgetItemInput[] = estimate.items.map((item) => ({
      workItemId: item.workItemId,
      description: `Budget item from estimate ${estimate.name}`,
      plannedAmount: parseFloat(item.totalPrice.toString()),
      category: 'material', // TODO: Determine from work item
    }));

    return await this.addItems(budget.id, budgetItems);
  }

  async approve(budgetId: string, approvedBy: string) {
    return await prisma.budget.update({
      where: { id: budgetId },
      data: {
        status: 'approved',
        approvedBy,
      },
    });
  }

  async getVariance(budgetId: string) {
    const budget = await this.findById(budgetId);

    return budget.items.map((item) => ({
      ...item,
      variance:
        parseFloat(item.plannedAmount.toString()) -
        parseFloat(item.actualAmount.toString()),
      variancePct:
        (parseFloat(item.actualAmount.toString()) /
          parseFloat(item.plannedAmount.toString())) *
        100,
    }));
  }
}

export const budgetService = new BudgetService();
