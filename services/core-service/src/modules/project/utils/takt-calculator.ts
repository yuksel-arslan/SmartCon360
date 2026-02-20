/**
 * Core takt planning computation algorithms.
 * Ported from frontend/src/lib/core/takt-calculator.ts
 */

export interface ZoneInput {
  id: string;
  name: string;
  sequence: number;
  areaSqm?: number;
}

export interface WagonInput {
  id: string;
  tradeId: string;
  sequence: number;
  durationDays: number;
  bufferAfter: number;
}

export interface Assignment {
  zoneId: string;
  wagonId: string;
  periodNumber: number;
  plannedStart: Date;
  plannedEnd: Date;
}

export interface TradeStackingConflict {
  zoneId: string;
  wagon1: string;
  wagon2: string;
  period1: number;
  period2: number;
  overlapStart: string;
  overlapEnd: string;
}

/**
 * Calculate total takt periods needed.
 * Formula: zones + trades - 1 + buffer_periods
 */
export function calculateTotalPeriods(
  numZones: number,
  numTrades: number,
  bufferSize: number = 0,
): number {
  const bufferPeriods = bufferSize * (numTrades - 1);
  return numZones + numTrades - 1 + bufferPeriods;
}

/**
 * Add N working days to a date, skipping non-working days.
 */
export function addWorkingDays(
  start: Date,
  days: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Date {
  const current = new Date(start);
  let added = 0;

  while (added < days) {
    current.setDate(current.getDate() + 1);
    if (workingDays.includes(current.getDay())) {
      added++;
    }
  }

  return current;
}

/**
 * Generate the full takt assignment grid.
 */
export function generateTaktGrid(
  zones: ZoneInput[],
  wagons: WagonInput[],
  startDate: Date,
  taktTime: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Assignment[] {
  const sortedZones = [...zones].sort((a, b) => a.sequence - b.sequence);
  const sortedWagons = [...wagons].sort((a, b) => a.sequence - b.sequence);

  const bufferOffsets = [0];
  for (let i = 1; i < sortedWagons.length; i++) {
    bufferOffsets.push(bufferOffsets[i - 1] + sortedWagons[i - 1].bufferAfter);
  }

  const assignments: Assignment[] = [];

  for (const zone of sortedZones) {
    for (let i = 0; i < sortedWagons.length; i++) {
      const wagon = sortedWagons[i];
      const period = zone.sequence + i + bufferOffsets[i];

      const daysOffset = (period - 1) * taktTime;
      const plannedStart = addWorkingDays(startDate, daysOffset, workingDays);
      const plannedEnd = addWorkingDays(plannedStart, wagon.durationDays - 1, workingDays);

      assignments.push({
        zoneId: zone.id,
        wagonId: wagon.id,
        periodNumber: period,
        plannedStart,
        plannedEnd,
      });
    }
  }

  return assignments;
}

/**
 * Detect zones where multiple trades overlap in the same period.
 */
export function detectTradeStacking(assignments: Assignment[]): TradeStackingConflict[] {
  const conflicts: TradeStackingConflict[] = [];

  const zoneAssignments = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const list = zoneAssignments.get(a.zoneId) || [];
    list.push(a);
    zoneAssignments.set(a.zoneId, list);
  }

  for (const [zoneId, zoneAssigns] of zoneAssignments) {
    for (let i = 0; i < zoneAssigns.length; i++) {
      for (let j = i + 1; j < zoneAssigns.length; j++) {
        const a1 = zoneAssigns[i];
        const a2 = zoneAssigns[j];

        if (a1.plannedStart <= a2.plannedEnd && a2.plannedStart <= a1.plannedEnd) {
          conflicts.push({
            zoneId,
            wagon1: a1.wagonId,
            wagon2: a2.wagonId,
            period1: a1.periodNumber,
            period2: a2.periodNumber,
            overlapStart: a1.plannedStart > a2.plannedStart
              ? a1.plannedStart.toISOString().split('T')[0]
              : a2.plannedStart.toISOString().split('T')[0],
            overlapEnd: a1.plannedEnd < a2.plannedEnd
              ? a1.plannedEnd.toISOString().split('T')[0]
              : a2.plannedEnd.toISOString().split('T')[0],
          });
        }
      }
    }
  }

  return conflicts;
}
