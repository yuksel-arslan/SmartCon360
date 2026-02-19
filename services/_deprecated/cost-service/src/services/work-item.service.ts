// Work Item Service — Poz (Iş Kalemi) yönetimi

import { prisma } from '../utils/prisma';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { Prisma } from '@prisma/client';

export interface CreateWorkItemInput {
  projectId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  category: string;
  subcategory?: string;
  tradeId?: string;
  source?: string;
  sourceYear?: number;
}

export interface UpdateWorkItemInput {
  code?: string;
  name?: string;
  description?: string;
  unit?: string;
  category?: string;
  subcategory?: string;
  tradeId?: string;
  isActive?: boolean;
}

export class WorkItemService {
  /**
   * Create new work item (poz)
   */
  async create(input: CreateWorkItemInput) {
    // Check for duplicate code in project
    const existing = await prisma.workItem.findFirst({
      where: {
        projectId: input.projectId,
        code: input.code,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Work item with code ${input.code} already exists in this project`
      );
    }

    return await prisma.workItem.create({
      data: input,
    });
  }

  /**
   * Get all work items for a project
   */
  async findByProject(
    projectId: string,
    options?: {
      category?: string;
      tradeId?: string;
      search?: string;
      isActive?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: Prisma.WorkItemWhereInput = {
      projectId,
      ...(options?.category && { category: options.category }),
      ...(options?.tradeId && { tradeId: options.tradeId }),
      ...(options?.isActive !== undefined && { isActive: options.isActive }),
      ...(options?.search && {
        OR: [
          { code: { contains: options.search, mode: 'insensitive' } },
          { name: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.workItem.findMany({
        where,
        orderBy: { code: 'asc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      prisma.workItem.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get work item by ID
   */
  async findById(id: string) {
    const item = await prisma.workItem.findUnique({
      where: { id },
      include: {
        unitPriceAnalyses: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
          include: {
            resources: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Work item', id);
    }

    return item;
  }

  /**
   * Update work item
   */
  async update(id: string, input: UpdateWorkItemInput) {
    const existing = await this.findById(id);

    // Check for code conflict if code is being changed
    if (input.code && input.code !== existing.code) {
      const duplicate = await prisma.workItem.findFirst({
        where: {
          projectId: existing.projectId,
          code: input.code,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictError(
          `Work item with code ${input.code} already exists in this project`
        );
      }
    }

    return await prisma.workItem.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Delete work item
   */
  async delete(id: string) {
    await this.findById(id); // Check existence

    return await prisma.workItem.delete({
      where: { id },
    });
  }

  /**
   * Import work items from Bayindirlik standard poz list
   */
  async importBayindirlik(projectId: string, year: number, category: string) {
    // TODO: Implement Bayindirlik rayiç import
    // This would read from a reference database of standard pozlar
    // For now, return empty array
    return [];
  }

  /**
   * Get work item categories for a project
   */
  async getCategories(projectId: string) {
    const result = await prisma.workItem.groupBy({
      by: ['category', 'subcategory'],
      where: { projectId, isActive: true },
      _count: true,
    });

    return result;
  }
}

export const workItemService = new WorkItemService();
