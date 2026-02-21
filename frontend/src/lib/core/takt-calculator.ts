/**
 * Core takt planning computation algorithms.
 * Ported from Python takt-engine/src/core/calculator.py
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

/**
 * Calculate total schedule duration in day units.
 *
 * Formula: (zones + trades - 1) * taktTime + (numTrades - 1) * bufferSize
 * Each zone and wagon occupies taktTime days; bufferSize is in days.
 */
export function calculateTotalPeriods(
  numZones: number,
  numTrades: number,
  taktTime: number = 1,
  bufferSize: number = 0
): number {
  return (numZones + numTrades - 1) * taktTime + (numTrades - 1) * bufferSize;
}

/**
 * Add N working days to a date, skipping non-working days.
 *
 * workingDays: array of weekday numbers (0=Mon ... 6=Sun). Default Mon-Fri.
 */
export function addWorkingDays(
  start: Date,
  days: number,
  workingDays: number[] = [1, 2, 3, 4, 5] // JS: 0=Sun, 1=Mon ... 6=Sat
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
 *
 * For each zone z (0-indexed from sequence) and wagon w (0-indexed):
 *   dayOffset = z * taktTime + w * taktTime + cumulativeBufferDays(w)
 *   periodNumber = dayOffset + 1 (1-indexed day position)
 *   start = project_start + dayOffset working days
 *   end = start + wagon.durationDays - 1 working days
 *
 * Buffer is in DAYS (not periods), ensuring a 1-day buffer = 1-day gap.
 *
 * Returns list of Assignment objects.
 */
export function generateTaktGrid(
  zones: ZoneInput[],
  wagons: WagonInput[],
  startDate: Date,
  taktTime: number,
  workingDays: number[] = [1, 2, 3, 4, 5]
): Assignment[] {
  const sortedZones = [...zones].sort((a, b) => a.sequence - b.sequence);
  const sortedWagons = [...wagons].sort((a, b) => a.sequence - b.sequence);

  // Pre-compute cumulative buffer offsets in DAYS
  const bufferDayOffsets = [0];
  for (let i = 1; i < sortedWagons.length; i++) {
    bufferDayOffsets.push(bufferDayOffsets[i - 1] + sortedWagons[i - 1].bufferAfter);
  }

  const assignments: Assignment[] = [];

  for (const zone of sortedZones) {
    for (let i = 0; i < sortedWagons.length; i++) {
      const wagon = sortedWagons[i];

      // Day-based offset: zone progression + wagon progression + buffer days
      const dayOffset = (zone.sequence - 1) * taktTime + i * taktTime + bufferDayOffsets[i];
      const periodNumber = dayOffset + 1; // 1-indexed day position

      const plannedStart = addWorkingDays(startDate, dayOffset, workingDays);
      const plannedEnd = addWorkingDays(plannedStart, wagon.durationDays - 1, workingDays);

      assignments.push({
        zoneId: zone.id,
        wagonId: wagon.id,
        periodNumber,
        plannedStart,
        plannedEnd,
      });
    }
  }

  return assignments;
}

/**
 * Detect zones where multiple trades overlap in the same period.
 * Trade stacking = two different wagons active in the same zone during
 * overlapping date ranges.
 */
export function detectTradeStacking(assignments: Assignment[]): TradeStackingConflict[] {
  const conflicts: TradeStackingConflict[] = [];

  // Group by zone
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

        // Check date overlap
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
 * Compute flowline visualization data.
 * Returns data structure for D3.js rendering.
 */
export function computeFlowlineData(
  zones: ZoneInput[],
  wagons: WagonInput[],
  assignments: Assignment[],
  taktTime: number
): FlowlineData {
  const sortedZones = [...zones].sort((a, b) => a.sequence - b.sequence);

  const zoneData = sortedZones.map((z, i) => ({
    id: z.id,
    name: z.name,
    yIndex: i,
  }));

  const zoneSeqMap = new Map(sortedZones.map((z) => [z.id, z.sequence - 1]));

  const wagonData = [...wagons]
    .sort((a, b) => a.sequence - b.sequence)
    .map((wagon) => {
      const wagonAssigns = assignments
        .filter((a) => a.wagonId === wagon.id)
        .sort((a, b) => a.periodNumber - b.periodNumber);

      const segments = wagonAssigns.map((a) => {
        const y = zoneSeqMap.get(a.zoneId) ?? 0;
        const xStart = a.periodNumber - 1; // periodNumber is now day-based (1-indexed)
        const xEnd = xStart + wagon.durationDays;

        return {
          zoneIndex: y,
          xStart,
          xEnd,
          y,
          status: 'planned' as const,
          progress: 0,
        };
      });

      return {
        tradeId: wagon.tradeId,
        wagonId: wagon.id,
        segments,
      };
    });

  // Compute total days from segment extents
  const totalDays = Math.max(
    ...wagonData.flatMap((w) => w.segments.map((s) => s.xEnd)),
    0,
  );

  return {
    zones: zoneData,
    wagons: wagonData,
    totalDays,
    taktTime,
  };
}

export interface FlowlineData {
  zones: { id: string; name: string; yIndex: number }[];
  wagons: {
    tradeId: string;
    wagonId: string;
    segments: {
      zoneIndex: number;
      xStart: number;
      xEnd: number;
      y: number;
      status: string;
      progress: number;
    }[];
  }[];
  totalDays: number;
  taktTime: number;
}
