/**
 * Takt Plans Store — API-backed
 * All operations go through the core-service REST API.
 */

import api from '../api';

export interface TaktPlanSummary {
  id: string;
  projectId: string;
  name: string;
  version: number;
  status: string;
  taktTime: number;
  startDate: string;
  endDate: string | null;
  totalPeriods: number | null;
  numZones: number;
  numTrades: number;
  numAssignments: number;
  createdAt: string;
}

export interface TaktPlanDetail {
  id: string;
  projectId: string;
  name: string;
  version: number;
  status: string;
  taktTime: number;
  startDate: string;
  endDate: string | null;
  bufferType: string;
  bufferSize: number;
  generatedBy: string;
  totalPeriods: number | null;
  zones: { id: string; name: string; code: string; sequence: number; locationId?: string }[];
  wagons: { id: string; tradeId: string; tradeName: string; tradeCode: string; tradeColor: string; sequence: number; durationDays: number; bufferAfter: number; crewSize?: number }[];
  assignments: { id: string; zoneId: string; wagonId: string; periodNumber: number; plannedStart: string; plannedEnd: string; actualStart?: string; actualEnd?: string; status: string; progressPct: number; notes?: string }[];
}

export async function listPlans(projectId: string): Promise<TaktPlanSummary[]> {
  return api<TaktPlanSummary[]>(`/projects/${projectId}/takt-plans`);
}

export async function getPlan(projectId: string, planId: string): Promise<TaktPlanDetail> {
  return api<TaktPlanDetail>(`/projects/${projectId}/takt-plans/${planId}`);
}

export async function generatePlan(projectId: string): Promise<TaktPlanDetail> {
  return api<TaktPlanDetail>(`/projects/${projectId}/plan/generate`, { method: 'POST' });
}

export async function savePlan(projectId: string, planId: string, data: Record<string, unknown>): Promise<TaktPlanDetail> {
  return api<TaktPlanDetail>(`/projects/${projectId}/takt-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateAssignment(
  projectId: string,
  assignmentId: string,
  data: { status?: string; progressPct?: number; actualStart?: string; actualEnd?: string; notes?: string }
): Promise<Record<string, unknown>> {
  return api<Record<string, unknown>>(`/projects/${projectId}/takt-assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getFlowlineData(projectId: string, planId: string): Promise<Record<string, unknown>> {
  return api<Record<string, unknown>>(`/projects/${projectId}/flowline/${planId}`);
}
