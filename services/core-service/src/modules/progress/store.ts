import { z } from 'zod';
import prisma from '../../lib/prisma';
import type { WeeklyCommitment, PPCRecord, DailyLog, ProgressUpdate, TradeBreakdown, VarianceReasonEntry } from './types';

/**
 * Progress Storage — Prisma/PostgreSQL
 * Migrated from in-memory Maps to database persistence.
 */

// ── Helpers ─────────────────────────────────────────────

export function nowISO(): string {
  return new Date().toISOString();
}

export function dateToKey(date: string): string {
  return date.split('T')[0];
}

// ── Progress Updates ────────────────────────────────────

export async function createProgressUpdate(data: Omit<ProgressUpdate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgressUpdate> {
  const row = await prisma.progressUpdate.create({
    data: {
      projectId: data.projectId,
      assignmentId: data.assignmentId,
      zoneId: data.zoneId,
      tradeId: data.tradeId,
      reportedBy: data.reportedBy,
      percentComplete: data.percentComplete,
      previousPercent: data.previousPercent,
      status: data.status,
      notes: data.notes,
      photoUrls: data.photoUrls,
      reportedAt: data.reportedAt ? new Date(data.reportedAt) : new Date(),
    },
  });
  return {
    id: row.id,
    projectId: row.projectId,
    assignmentId: row.assignmentId,
    zoneId: row.zoneId,
    tradeId: row.tradeId,
    reportedBy: row.reportedBy,
    percentComplete: row.percentComplete,
    previousPercent: row.previousPercent,
    status: row.status as ProgressUpdate['status'],
    notes: row.notes,
    photoUrls: row.photoUrls,
    reportedAt: row.reportedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getProjectProgressUpdates(projectId: string, page?: number, limit?: number): Promise<{ data: ProgressUpdate[]; total: number }> {
  const where = { projectId };
  const total = await prisma.progressUpdate.count({ where });

  const rows = await prisma.progressUpdate.findMany({
    where,
    orderBy: { reportedAt: 'desc' },
    ...(page && limit ? { skip: (page - 1) * limit, take: limit } : {}),
  });

  const data = rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    assignmentId: row.assignmentId,
    zoneId: row.zoneId,
    tradeId: row.tradeId,
    reportedBy: row.reportedBy,
    percentComplete: row.percentComplete,
    previousPercent: row.previousPercent,
    status: row.status as ProgressUpdate['status'],
    notes: row.notes,
    photoUrls: row.photoUrls,
    reportedAt: row.reportedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { data, total };
}

export async function getProgressByAssignment(assignmentId: string, projectId?: string): Promise<ProgressUpdate[]> {
  const where: Record<string, unknown> = { assignmentId };
  if (projectId) where.projectId = projectId;

  const rows = await prisma.progressUpdate.findMany({ where, orderBy: { reportedAt: 'asc' } });
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    assignmentId: row.assignmentId,
    zoneId: row.zoneId,
    tradeId: row.tradeId,
    reportedBy: row.reportedBy,
    percentComplete: row.percentComplete,
    previousPercent: row.previousPercent,
    status: row.status as ProgressUpdate['status'],
    notes: row.notes,
    photoUrls: row.photoUrls,
    reportedAt: row.reportedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getProgressByFilter(filter: { zoneId?: string; tradeId?: string }, projectId?: string): Promise<ProgressUpdate[]> {
  const where: Record<string, unknown> = { ...filter };
  if (projectId) where.projectId = projectId;

  const rows = await prisma.progressUpdate.findMany({ where, orderBy: { reportedAt: 'desc' } });
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    assignmentId: row.assignmentId,
    zoneId: row.zoneId,
    tradeId: row.tradeId,
    reportedBy: row.reportedBy,
    percentComplete: row.percentComplete,
    previousPercent: row.previousPercent,
    status: row.status as ProgressUpdate['status'],
    notes: row.notes,
    photoUrls: row.photoUrls,
    reportedAt: row.reportedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getLatestProgressForAssignment(projectId: string, assignmentId: string): Promise<ProgressUpdate | null> {
  const row = await prisma.progressUpdate.findFirst({
    where: { projectId, assignmentId },
    orderBy: { reportedAt: 'desc' },
  });
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.projectId,
    assignmentId: row.assignmentId,
    zoneId: row.zoneId,
    tradeId: row.tradeId,
    reportedBy: row.reportedBy,
    percentComplete: row.percentComplete,
    previousPercent: row.previousPercent,
    status: row.status as ProgressUpdate['status'],
    notes: row.notes,
    photoUrls: row.photoUrls,
    reportedAt: row.reportedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Weekly Commitments ──────────────────────────────────

export async function createWeeklyCommitment(data: Omit<WeeklyCommitment, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeeklyCommitment> {
  const row = await prisma.weeklyCommitment.create({
    data: {
      projectId: data.projectId,
      weekStart: new Date(data.weekStart),
      weekEnd: new Date(data.weekEnd),
      tradeId: data.tradeId,
      tradeName: data.tradeName,
      zoneId: data.zoneId,
      zoneName: data.zoneName,
      description: data.description,
      committed: data.committed,
      completed: data.completed,
      varianceReason: data.varianceReason,
      varianceCategory: data.varianceCategory,
    },
  });
  return toWeeklyCommitment(row);
}

export async function getProjectCommitments(projectId: string, weekStart?: string): Promise<WeeklyCommitment[]> {
  const where: Record<string, unknown> = { projectId };
  if (weekStart) where.weekStart = new Date(weekStart);

  const rows = await prisma.weeklyCommitment.findMany({ where, orderBy: { weekStart: 'desc' } });
  return rows.map(toWeeklyCommitment);
}

export async function updateWeeklyCommitment(
  id: string,
  updates: { completed?: boolean; varianceReason?: string | null; varianceCategory?: string | null }
): Promise<WeeklyCommitment | null> {
  try {
    const row = await prisma.weeklyCommitment.update({
      where: { id },
      data: {
        ...(updates.completed !== undefined && { completed: updates.completed }),
        ...(updates.varianceReason !== undefined && { varianceReason: updates.varianceReason }),
        ...(updates.varianceCategory !== undefined && { varianceCategory: updates.varianceCategory }),
      },
    });
    return toWeeklyCommitment(row);
  } catch {
    return null;
  }
}

function toWeeklyCommitment(row: {
  id: string; projectId: string; weekStart: Date; weekEnd: Date;
  tradeId: string; tradeName: string; zoneId: string; zoneName: string;
  description: string; committed: boolean; completed: boolean;
  varianceReason: string | null; varianceCategory: string | null;
  createdAt: Date; updatedAt: Date;
}): WeeklyCommitment {
  return {
    id: row.id,
    projectId: row.projectId,
    weekStart: row.weekStart.toISOString().split('T')[0],
    weekEnd: row.weekEnd.toISOString().split('T')[0],
    tradeId: row.tradeId,
    tradeName: row.tradeName,
    zoneId: row.zoneId,
    zoneName: row.zoneName,
    description: row.description,
    committed: row.committed,
    completed: row.completed,
    varianceReason: row.varianceReason,
    varianceCategory: row.varianceCategory,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── PPC Records ─────────────────────────────────────────

export async function savePPCRecord(data: Omit<PPCRecord, 'id' | 'createdAt'>): Promise<PPCRecord> {
  const row = await prisma.pPCRecord.upsert({
    where: {
      projectId_weekStart: {
        projectId: data.projectId,
        weekStart: new Date(data.weekStart),
      },
    },
    update: {
      totalCommitted: data.totalCommitted,
      totalCompleted: data.totalCompleted,
      ppcPercent: data.ppcPercent,
      byTrade: data.byTrade as unknown as Record<string, unknown>[],
      topVarianceReasons: data.topVarianceReasons as unknown as Record<string, unknown>[],
    },
    create: {
      projectId: data.projectId,
      weekStart: new Date(data.weekStart),
      weekEnd: new Date(data.weekEnd),
      totalCommitted: data.totalCommitted,
      totalCompleted: data.totalCompleted,
      ppcPercent: data.ppcPercent,
      byTrade: data.byTrade as unknown as Record<string, unknown>[],
      topVarianceReasons: data.topVarianceReasons as unknown as Record<string, unknown>[],
    },
  });

  return toPPCRecord(row);
}

export async function getProjectPPCRecords(projectId: string): Promise<PPCRecord[]> {
  const rows = await prisma.pPCRecord.findMany({
    where: { projectId },
    orderBy: { weekStart: 'asc' },
  });
  return rows.map(toPPCRecord);
}

function toPPCRecord(row: {
  id: string; projectId: string; weekStart: Date; weekEnd: Date;
  totalCommitted: number; totalCompleted: number; ppcPercent: number;
  byTrade: unknown; topVarianceReasons: unknown; createdAt: Date;
}): PPCRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    weekStart: row.weekStart.toISOString().split('T')[0],
    weekEnd: row.weekEnd.toISOString().split('T')[0],
    totalCommitted: row.totalCommitted,
    totalCompleted: row.totalCompleted,
    ppcPercent: row.ppcPercent,
    byTrade: row.byTrade as unknown as TradeBreakdown[],
    topVarianceReasons: row.topVarianceReasons as unknown as VarianceReasonEntry[],
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Daily Logs ──────────────────────────────────────────

export async function createOrUpdateDailyLog(data: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>): Promise<DailyLog> {
  const logDate = new Date(data.date);

  const row = await prisma.dailyLog.upsert({
    where: {
      projectId_date: { projectId: data.projectId, date: logDate },
    },
    update: {
      weather: data.weather,
      temperature: data.temperature,
      crewCount: data.crewCount,
      notes: data.notes,
      issues: data.issues as unknown as Record<string, unknown>[],
    },
    create: {
      projectId: data.projectId,
      date: logDate,
      weather: data.weather,
      temperature: data.temperature,
      crewCount: data.crewCount,
      notes: data.notes,
      issues: data.issues as unknown as Record<string, unknown>[],
      createdBy: data.createdBy,
    },
  });

  return toDailyLog(row);
}

export async function getProjectDailyLogs(projectId: string): Promise<DailyLog[]> {
  const rows = await prisma.dailyLog.findMany({
    where: { projectId },
    orderBy: { date: 'desc' },
  });
  return rows.map(toDailyLog);
}

export async function getDailyLogByDate(projectId: string, date: string): Promise<DailyLog | null> {
  const row = await prisma.dailyLog.findUnique({
    where: { projectId_date: { projectId, date: new Date(date) } },
  });
  if (!row) return null;
  return toDailyLog(row);
}

function toDailyLog(row: {
  id: string; projectId: string; date: Date; weather: string | null;
  temperature: number | null; crewCount: number | null; notes: string | null;
  issues: unknown; createdBy: string; createdAt: Date; updatedAt: Date;
}): DailyLog {
  return {
    id: row.id,
    projectId: row.projectId,
    date: row.date.toISOString().split('T')[0],
    weather: row.weather,
    temperature: row.temperature,
    crewCount: row.crewCount,
    notes: row.notes,
    issues: row.issues as unknown as DailyLog['issues'],
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Validation ──────────────────────────────────────────

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}
