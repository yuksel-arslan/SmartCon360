/**
 * Progress Store — API-backed
 * All operations go through the core-service REST API (progress-service routes).
 */

import api from '../api';

// ── Types ────────────────────────────────────────────────

export interface ProgressUpdate {
  id: string;
  projectId: string;
  assignmentId: string;
  zoneId: string;
  tradeId: string;
  reportedBy: string;
  percentComplete: number;
  previousPercent: number;
  status: string;
  notes: string | null;
  photoUrls: string[];
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyCommitment {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  tradeId: string;
  tradeName: string;
  zoneId: string;
  zoneName: string;
  description: string;
  committed: boolean;
  completed: boolean;
  varianceReason: string | null;
  varianceCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PPCRecord {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  totalCommitted: number;
  totalCompleted: number;
  ppcPercent: number;
  byTrade: { tradeId: string; tradeName: string; committed: number; completed: number; ppc: number }[];
  topVarianceReasons: { reason: string; category: string; count: number }[];
  createdAt: string;
}

// ── Progress Updates ─────────────────────────────────────

export async function submitProgressUpdate(data: {
  projectId: string;
  assignmentId: string;
  zoneId: string;
  tradeId: string;
  reportedBy: string;
  percentComplete: number;
  status?: string;
  notes?: string;
  photoUrls?: string[];
}): Promise<ProgressUpdate> {
  return api<ProgressUpdate>('/progress/update', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProgressByProject(
  projectId: string,
  page = 1,
  limit = 50
): Promise<{ data: ProgressUpdate[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const result = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/progress/project/${projectId}?page=${page}&limit=${limit}`,
    { headers },
  );
  const json = await result.json();
  if (!result.ok) throw new Error(json.error?.message || `HTTP ${result.status}`);
  return { data: json.data, meta: json.meta };
}

export async function getProgressByAssignment(assignmentId: string, projectId?: string): Promise<ProgressUpdate[]> {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return api<ProgressUpdate[]>(`/progress/assignment/${assignmentId}${qs}`);
}

export async function getProgressByZone(zoneId: string, projectId?: string): Promise<ProgressUpdate[]> {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return api<ProgressUpdate[]>(`/progress/zone/${zoneId}${qs}`);
}

export async function getProgressByTrade(tradeId: string, projectId?: string): Promise<ProgressUpdate[]> {
  const qs = projectId ? `?projectId=${projectId}` : '';
  return api<ProgressUpdate[]>(`/progress/trade/${tradeId}${qs}`);
}

// ── Weekly Commitments ───────────────────────────────────

export async function getWeeklyCommitments(projectId: string, weekStart?: string): Promise<WeeklyCommitment[]> {
  const qs = weekStart ? `?weekStart=${weekStart}` : '';
  return api<WeeklyCommitment[]>(`/progress/commitments?projectId=${projectId}${qs ? `&weekStart=${weekStart}` : ''}`);
}

export async function createWeeklyCommitment(data: {
  projectId: string;
  weekStart: string;
  weekEnd: string;
  tradeId: string;
  tradeName: string;
  zoneId: string;
  zoneName: string;
  description: string;
  committed?: boolean;
}): Promise<WeeklyCommitment> {
  return api<WeeklyCommitment>('/progress/commitments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCommitment(
  id: string,
  updates: { completed?: boolean; varianceReason?: string | null; varianceCategory?: string | null }
): Promise<WeeklyCommitment> {
  return api<WeeklyCommitment>(`/progress/commitments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ── PPC ──────────────────────────────────────────────────

export async function calculatePPC(projectId: string, weekStart: string, weekEnd: string): Promise<PPCRecord> {
  return api<PPCRecord>('/progress/ppc/calculate', {
    method: 'POST',
    body: JSON.stringify({ projectId, weekStart, weekEnd }),
  });
}

export async function getPPCHistory(projectId: string): Promise<{
  data: PPCRecord[];
  meta: { count: number; averagePPC: number; latestPPC: number | null; trend: number; trendDirection: string };
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const result = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/progress/ppc/history?projectId=${projectId}`,
    { headers },
  );
  const json = await result.json();
  if (!result.ok) throw new Error(json.error?.message || `HTTP ${result.status}`);
  return { data: json.data, meta: json.meta };
}

export async function getCurrentPPC(projectId: string): Promise<{
  data: PPCRecord;
  meta: { previousWeekPPC: number | null; change: number; changeDirection: string };
}> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const result = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/progress/ppc/current?projectId=${projectId}`,
    { headers },
  );
  const json = await result.json();
  if (!result.ok) throw new Error(json.error?.message || `HTTP ${result.status}`);
  return { data: json.data, meta: json.meta };
}

export async function getPPCByTrade(
  projectId: string,
  weekStart?: string
): Promise<{ weekStart: string; weekEnd: string; overallPPC: number; byTrade: PPCRecord['byTrade'] }> {
  const qs = weekStart ? `&weekStart=${weekStart}` : '';
  return api<{ weekStart: string; weekEnd: string; overallPPC: number; byTrade: PPCRecord['byTrade'] }>(
    `/progress/ppc/by-trade?projectId=${projectId}${qs}`
  );
}

// ── Variance ─────────────────────────────────────────────

export async function getVarianceAnalysis(projectId: string): Promise<{
  topReasons: { reason: string; category: string; count: number }[];
  byCategory: { category: string; count: number; percentage: number }[];
}> {
  return api<{
    topReasons: { reason: string; category: string; count: number }[];
    byCategory: { category: string; count: number; percentage: number }[];
  }>(`/progress/variance/reasons?projectId=${projectId}`);
}
