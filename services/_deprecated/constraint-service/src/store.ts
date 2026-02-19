import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { Constraint, ConstraintStats, CRRData } from './types';

/**
 * In-Memory Constraint Storage
 * Phase 1: In-memory store
 * Phase 2+: Will migrate to Prisma/PostgreSQL
 */

export const constraints: Map<string, Constraint> = new Map();

// ── Helpers ─────────────────────────────────────────────

export function nowISO(): string {
  return new Date().toISOString();
}

export function createConstraint(data: Omit<Constraint, 'id' | 'createdAt' | 'updatedAt'>): Constraint {
  const constraint: Constraint = {
    ...data,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  constraints.set(constraint.id, constraint);
  return constraint;
}

export function getConstraintById(id: string): Constraint | undefined {
  return constraints.get(id);
}

export function updateConstraint(id: string, updates: Partial<Constraint>): Constraint | null {
  const existing = constraints.get(id);
  if (!existing) return null;

  const updated: Constraint = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  constraints.set(id, updated);
  return updated;
}

export function deleteConstraint(id: string): boolean {
  return constraints.delete(id);
}

export function listConstraints(filters?: {
  projectId?: string;
  category?: string;
  status?: string;
  priority?: string;
  zoneId?: string;
  tradeId?: string;
  assignedTo?: string;
  overdue?: boolean;
}): Constraint[] {
  let results = Array.from(constraints.values());

  if (filters) {
    if (filters.projectId) {
      results = results.filter((c) => c.projectId === filters.projectId);
    }
    if (filters.category) {
      results = results.filter((c) => c.category === filters.category);
    }
    if (filters.status) {
      results = results.filter((c) => c.status === filters.status);
    }
    if (filters.priority) {
      results = results.filter((c) => c.priority === filters.priority);
    }
    if (filters.zoneId) {
      results = results.filter((c) => c.zoneId === filters.zoneId);
    }
    if (filters.tradeId) {
      results = results.filter((c) => c.tradeId === filters.tradeId);
    }
    if (filters.assignedTo) {
      results = results.filter((c) => c.assignedTo === filters.assignedTo);
    }
    if (filters.overdue) {
      const now = new Date();
      results = results.filter(
        (c) => c.status !== 'resolved' && c.dueDate && c.dueDate < now
      );
    }
  }

  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getConstraintStats(projectId?: string): ConstraintStats {
  let data = Array.from(constraints.values());
  if (projectId) {
    data = data.filter((c) => c.projectId === projectId);
  }

  const stats: ConstraintStats = {
    total: data.length,
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
  for (const constraint of data) {
    stats.byCategory[constraint.category]++;
    stats.byStatus[constraint.status]++;
    stats.byPriority[constraint.priority]++;
    if (constraint.status !== 'resolved' && constraint.dueDate && constraint.dueDate < now) {
      stats.overdueCount++;
    }
  }

  return stats;
}

export function getCRR(projectId?: string, weeks: number = 6): CRRData[] {
  // Calculate Constraint Removal Rate for the last N weeks
  let data = Array.from(constraints.values());
  if (projectId) {
    data = data.filter((c) => c.projectId === projectId);
  }

  const result: CRRData[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7 + now.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const identified = data.filter(
      (c) => c.createdAt >= weekStart && c.createdAt < weekEnd
    ).length;

    const resolved = data.filter(
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
