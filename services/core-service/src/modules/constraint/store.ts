import { z } from 'zod';
import prisma from '../../lib/prisma';
import type { Constraint as PrismaConstraint } from '@prisma/client';
import type { Constraint, ConstraintStats, CRRData } from './types';

/**
 * Constraint Storage — Prisma/PostgreSQL
 * Migrated from in-memory Map to database persistence.
 */

// ── Helpers ─────────────────────────────────────────────

function toDomain(row: PrismaConstraint): Constraint {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category as Constraint['category'],
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as Constraint['status'],
    priority: row.priority as Constraint['priority'],
    zoneId: row.zoneId ?? undefined,
    tradeId: row.tradeId ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    dueDate: row.dueDate ?? undefined,
    resolvedDate: row.resolvedDate ?? undefined,
    resolutionNotes: row.resolutionNotes ?? undefined,
    raisedBy: row.assignedTo ?? '', // TODO: add raisedBy column if needed
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function nowISO(): string {
  return new Date().toISOString();
}

export async function createConstraint(
  data: Omit<Constraint, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Constraint> {
  const row = await prisma.constraint.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status,
      priority: data.priority,
      zoneId: data.zoneId,
      tradeId: data.tradeId,
      assignedTo: data.assignedTo,
      dueDate: data.dueDate,
      resolvedDate: data.resolvedDate,
      resolutionNotes: data.resolutionNotes,
    },
  });
  return toDomain(row);
}

export async function getConstraintById(id: string): Promise<Constraint | undefined> {
  const row = await prisma.constraint.findUnique({ where: { id } });
  return row ? toDomain(row) : undefined;
}

export async function updateConstraint(
  id: string,
  updates: Partial<Constraint>
): Promise<Constraint | null> {
  try {
    const row = await prisma.constraint.update({
      where: { id },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.assignedTo !== undefined && { assignedTo: updates.assignedTo }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
        ...(updates.resolvedDate !== undefined && { resolvedDate: updates.resolvedDate }),
        ...(updates.resolutionNotes !== undefined && { resolutionNotes: updates.resolutionNotes }),
      },
    });
    return toDomain(row);
  } catch {
    return null;
  }
}

export async function deleteConstraint(id: string): Promise<boolean> {
  try {
    await prisma.constraint.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function listConstraints(filters?: {
  projectId?: string;
  category?: string;
  status?: string;
  priority?: string;
  zoneId?: string;
  tradeId?: string;
  assignedTo?: string;
  overdue?: boolean;
}): Promise<Constraint[]> {
  const where: Record<string, unknown> = {};

  if (filters) {
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.category) where.category = filters.category;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.zoneId) where.zoneId = filters.zoneId;
    if (filters.tradeId) where.tradeId = filters.tradeId;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.overdue) {
      where.status = { not: 'resolved' };
      where.dueDate = { lt: new Date() };
    }
  }

  const rows = await prisma.constraint.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(toDomain);
}

export async function getConstraintStats(projectId?: string): Promise<ConstraintStats> {
  const where = projectId ? { projectId } : {};

  const rows = await prisma.constraint.findMany({ where });

  const stats: ConstraintStats = {
    total: rows.length,
    byCategory: {
      design: 0,
      material: 0,
      equipment: 0,
      labor: 0,
      space: 0,
      predecessor: 0,
      permit: 0,
      information: 0,
    },
    byStatus: {
      open: 0,
      in_progress: 0,
      resolved: 0,
      cancelled: 0,
    },
    byPriority: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    overdueCount: 0,
  };

  const now = new Date();
  for (const row of rows) {
    const cat = row.category as keyof typeof stats.byCategory;
    const st = row.status as keyof typeof stats.byStatus;
    const pr = row.priority as keyof typeof stats.byPriority;
    if (stats.byCategory[cat] !== undefined) stats.byCategory[cat]++;
    if (stats.byStatus[st] !== undefined) stats.byStatus[st]++;
    if (stats.byPriority[pr] !== undefined) stats.byPriority[pr]++;
    if (row.status !== 'resolved' && row.dueDate && row.dueDate < now) {
      stats.overdueCount++;
    }
  }

  return stats;
}

export async function getCRR(projectId?: string, weeks: number = 6): Promise<CRRData[]> {
  const where = projectId ? { projectId } : {};
  const rows = await prisma.constraint.findMany({ where });

  const result: CRRData[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7 + now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const identified = rows.filter(
      (c) => c.createdAt >= weekStart && c.createdAt < weekEnd
    ).length;

    const resolved = rows.filter(
      (c) =>
        c.resolvedDate &&
        c.resolvedDate >= weekStart &&
        c.resolvedDate < weekEnd
    ).length;

    const crr = identified > 0 ? (resolved / identified) * 100 : 0;

    result.push({
      weekNumber: weeks - i,
      weekStartDate: weekStart.toISOString().split('T')[0],
      constraintsIdentified: identified,
      constraintsResolved: resolved,
      crr: Math.round(crr * 10) / 10,
    });
  }

  return result;
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}
