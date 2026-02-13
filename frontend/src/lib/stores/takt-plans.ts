/**
 * In-memory takt plans store (Phase 1).
 * Will be replaced with PostgreSQL in a future phase.
 */

const plansDb: Record<string, Record<string, unknown>> = {};

export function getPlan(planId: string): Record<string, unknown> | undefined {
  return plansDb[planId];
}

export function savePlan(planId: string, plan: Record<string, unknown>): void {
  plansDb[planId] = plan;
}

export function deletePlan(planId: string): boolean {
  if (!plansDb[planId]) return false;
  delete plansDb[planId];
  return true;
}
