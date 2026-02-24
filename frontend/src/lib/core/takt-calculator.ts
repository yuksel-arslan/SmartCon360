/**
 * Core takt planning computation algorithms.
 * Ported from Python takt-engine/src/core/calculator.py
 *
 * Supports activity relationships (FS, SS, FF, SF) with lag/lead
 * per PMI PMBOK Guide and ISO 21500 scheduling standards.
 */

export type RelationshipType = 'FS' | 'SS' | 'FF' | 'SF';

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

/** Activity relationship between two wagons (trades) */
export interface WagonRelationship {
  predecessorWagonId: string;
  successorWagonId: string;
  type: RelationshipType;
  lagDays: number;
  mandatory: boolean;
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
 * Generate the full takt assignment grid (day-based).
 *
 * Each column represents one WORKING DAY. Wagon cells span taktTime columns.
 * Buffer between wagons = bufferAfter days (empty day columns).
 *
 * For each zone z (0-indexed) and wagon w (0-indexed):
 *   dayOffset = z * taktTime + w * taktTime + cumulativeBufferDays(w)
 *   periodNumber = dayOffset + 1 (1-indexed day position = start day)
 *   start = project_start + dayOffset working days
 *   end = start + wagon.durationDays - 1 working days
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
      const periodNumber = dayOffset + 1; // 1-indexed start day

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
 * Subtract N working days from a date, skipping non-working days.
 */
export function subtractWorkingDays(
  start: Date,
  days: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Date {
  const current = new Date(start);
  let subtracted = 0;

  while (subtracted < days) {
    current.setDate(current.getDate() - 1);
    if (workingDays.includes(current.getDay())) {
      subtracted++;
    }
  }

  return current;
}

/**
 * Calculate the earliest start date for a successor based on relationship type.
 */
function calculateRelationshipConstraint(
  predStart: Date,
  predEnd: Date,
  successorDuration: number,
  type: RelationshipType,
  lagDays: number,
  workingDays: number[],
): Date {
  switch (type) {
    case 'FS':
      return addWorkingDays(predEnd, 1 + lagDays, workingDays);
    case 'SS':
      return addWorkingDays(predStart, lagDays, workingDays);
    case 'FF': {
      const targetEnd = addWorkingDays(predEnd, lagDays, workingDays);
      return subtractWorkingDays(targetEnd, successorDuration - 1, workingDays);
    }
    case 'SF': {
      const targetEnd = addWorkingDays(predStart, lagDays, workingDays);
      return subtractWorkingDays(targetEnd, successorDuration - 1, workingDays);
    }
    default:
      return predEnd;
  }
}

/**
 * Topologically sort wagons based on relationships.
 */
function topologicalSortWagons(
  wagons: WagonInput[],
  relationships: WagonRelationship[],
): WagonInput[] {
  const wagonMap = new Map(wagons.map((w) => [w.id, w]));
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const w of wagons) {
    inDegree.set(w.id, 0);
    graph.set(w.id, []);
  }

  for (const rel of relationships) {
    if (!wagonMap.has(rel.predecessorWagonId) || !wagonMap.has(rel.successorWagonId)) continue;
    graph.get(rel.predecessorWagonId)!.push(rel.successorWagonId);
    inDegree.set(rel.successorWagonId, (inDegree.get(rel.successorWagonId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }
  queue.sort((a, b) => (wagonMap.get(a)?.sequence || 0) - (wagonMap.get(b)?.sequence || 0));

  const sorted: WagonInput[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(wagonMap.get(nodeId)!);

    for (const neighbor of graph.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
    queue.sort((a, b) => (wagonMap.get(a)?.sequence || 0) - (wagonMap.get(b)?.sequence || 0));
  }

  if (sorted.length < wagons.length) {
    return [...wagons].sort((a, b) => a.sequence - b.sequence);
  }

  return sorted;
}

/**
 * Generate takt grid with activity relationship constraints.
 * Respects FS/SS/FF/SF relationships with lag between wagons.
 */
export function generateTaktGridWithRelationships(
  zones: ZoneInput[],
  wagons: WagonInput[],
  relationships: WagonRelationship[],
  startDate: Date,
  taktTime: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Assignment[] {
  if (relationships.length === 0) {
    return generateTaktGrid(zones, wagons, startDate, taktTime, workingDays);
  }

  const sortedZones = [...zones].sort((a, b) => a.sequence - b.sequence);
  const sortedWagons = topologicalSortWagons(wagons, relationships);

  const relBySuccessor = new Map<string, WagonRelationship[]>();
  for (const rel of relationships) {
    const list = relBySuccessor.get(rel.successorWagonId) || [];
    list.push(rel);
    relBySuccessor.set(rel.successorWagonId, list);
  }

  const assignmentMap = new Map<string, Assignment>();
  const assignments: Assignment[] = [];
  let periodCounter = 0;

  for (const wagon of sortedWagons) {
    for (const zone of sortedZones) {
      let earliestStart = new Date(startDate);

      // Takt flow: previous zone for same wagon
      const prevZoneIdx = sortedZones.indexOf(zone) - 1;
      if (prevZoneIdx >= 0) {
        const prevZone = sortedZones[prevZoneIdx];
        const prevAssignment = assignmentMap.get(`${wagon.id}:${prevZone.id}`);
        if (prevAssignment) {
          const afterPrev = addWorkingDays(prevAssignment.plannedEnd, 1, workingDays);
          if (afterPrev > earliestStart) earliestStart = afterPrev;
        }
      }

      // Relationship constraints from predecessors
      const rels = relBySuccessor.get(wagon.id) || [];
      for (const rel of rels) {
        const predAssignment = assignmentMap.get(`${rel.predecessorWagonId}:${zone.id}`);
        if (!predAssignment) continue;

        const constraintDate = calculateRelationshipConstraint(
          predAssignment.plannedStart,
          predAssignment.plannedEnd,
          wagon.durationDays,
          rel.type,
          rel.lagDays,
          workingDays,
        );

        if (constraintDate > earliestStart) earliestStart = constraintDate;
      }

      periodCounter++;
      const plannedEnd = addWorkingDays(earliestStart, wagon.durationDays - 1, workingDays);

      const assignment: Assignment = {
        zoneId: zone.id,
        wagonId: wagon.id,
        periodNumber: periodCounter,
        plannedStart: earliestStart,
        plannedEnd,
      };

      assignmentMap.set(`${wagon.id}:${zone.id}`, assignment);
      assignments.push(assignment);
    }
  }

  // Recalculate period numbers based on start dates
  assignments.sort((a, b) => a.plannedStart.getTime() - b.plannedStart.getTime());
  const startTimestamps = [...new Set(assignments.map((a) => a.plannedStart.getTime()))].sort((a, b) => a - b);
  const periodMap = new Map(startTimestamps.map((ts, i) => [ts, i + 1]));
  for (const a of assignments) {
    a.periodNumber = periodMap.get(a.plannedStart.getTime()) || a.periodNumber;
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
        const xStart = a.periodNumber - 1; // 0-indexed day position
        const xEnd = xStart + wagon.durationDays; // spans durationDays columns

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
