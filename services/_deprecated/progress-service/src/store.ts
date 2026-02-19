import { z } from 'zod';
import type { ProgressUpdate, WeeklyCommitment, PPCRecord, DailyLog } from './types';

// ── In-Memory Storage ───────────────────────────────────
export const progressUpdates: Map<string, ProgressUpdate[]> = new Map();
export const weeklyCommitments: Map<string, WeeklyCommitment[]> = new Map();
export const ppcRecords: Map<string, PPCRecord[]> = new Map();
export const dailyLogs: Map<string, DailyLog[]> = new Map();

// ── Helpers ─────────────────────────────────────────────
export function nowISO(): string {
  return new Date().toISOString();
}

export function dateToKey(date: string): string {
  return date.split('T')[0];
}

export function getProjectProgressUpdates(projectId: string): ProgressUpdate[] {
  return progressUpdates.get(projectId) || [];
}

export function getProjectCommitments(projectId: string): WeeklyCommitment[] {
  return weeklyCommitments.get(projectId) || [];
}

export function getProjectPPCRecords(projectId: string): PPCRecord[] {
  return ppcRecords.get(projectId) || [];
}

export function getProjectDailyLogs(projectId: string): DailyLog[] {
  return dailyLogs.get(projectId) || [];
}

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}
