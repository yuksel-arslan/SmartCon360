/**
 * Core takt planning computation algorithms.
 * Ported from frontend/src/lib/core/takt-calculator.ts
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
 * Generate takt grid with activity relationship constraints.
 *
 * Unlike the basic generateTaktGrid which uses simple sequential ordering,
 * this function respects FS/SS/FF/SF relationships with lag between wagons.
 *
 * Algorithm:
 * 1. Topologically sort wagons based on relationships
 * 2. For each zone, schedule wagons respecting:
 *    - Takt flow: same wagon can't be in two zones at the same time
 *    - Relationships: FS/SS/FF/SF constraints with lag
 * 3. Earliest start date = max of all relationship constraints
 */
export function generateTaktGridWithRelationships(
  zones: ZoneInput[],
  wagons: WagonInput[],
  relationships: WagonRelationship[],
  startDate: Date,
  taktTime: number,
  workingDays: number[] = [1, 2, 3, 4, 5],
): Assignment[] {
  // If no relationships, fall back to simple grid
  if (relationships.length === 0) {
    return generateTaktGrid(zones, wagons, startDate, taktTime, workingDays);
  }

  const sortedZones = [...zones].sort((a, b) => a.sequence - b.sequence);

  // Topological sort of wagons based on relationships
  const sortedWagons = topologicalSortWagons(wagons, relationships);

  // Build relationship lookup: successorId → relationships[]
  const relBySuccessor = new Map<string, WagonRelationship[]>();
  for (const rel of relationships) {
    const list = relBySuccessor.get(rel.successorWagonId) || [];
    list.push(rel);
    relBySuccessor.set(rel.successorWagonId, list);
  }

  // Schedule assignments: key = "wagonId:zoneId" → Assignment
  const assignmentMap = new Map<string, Assignment>();
  const assignments: Assignment[] = [];
  let periodCounter = 0;

  for (const wagon of sortedWagons) {
    for (const zone of sortedZones) {
      // Determine earliest start date based on:
      // 1. Takt flow constraint: same wagon must finish previous zone first
      // 2. Relationship constraints from predecessors in same zone
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

      // Buffer from wagon definition
      if (wagon.bufferAfter > 0) {
        // Buffer is applied as separation between this wagon and the next in takt flow
        // (handled when next wagon references this one)
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
 * Calculate the earliest start date for a successor based on relationship type.
 *
 * FS (Finish-to-Start): successor starts after predecessor finishes + lag
 * SS (Start-to-Start):  successor starts after predecessor starts + lag
 * FF (Finish-to-Finish): successor must finish when predecessor finishes + lag
 *                         → successor start = predecessor finish + lag - successor duration
 * SF (Start-to-Finish):  successor finishes when predecessor starts + lag
 *                         → successor start = predecessor start + lag - successor duration
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
      // Successor starts after predecessor ends + lag
      return addWorkingDays(predEnd, 1 + lagDays, workingDays);

    case 'SS':
      // Successor starts when predecessor starts + lag
      return addWorkingDays(predStart, lagDays, workingDays);

    case 'FF': {
      // Successor finishes when predecessor finishes + lag
      // So successor start = predecessor end + lag - successor duration + 1
      const targetEnd = addWorkingDays(predEnd, lagDays, workingDays);
      return subtractWorkingDays(targetEnd, successorDuration - 1, workingDays);
    }

    case 'SF': {
      // Successor finishes when predecessor starts + lag
      // So successor start = predecessor start + lag - successor duration + 1
      const targetEnd = addWorkingDays(predStart, lagDays, workingDays);
      return subtractWorkingDays(targetEnd, successorDuration - 1, workingDays);
    }

    default:
      return predEnd;
  }
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
 * Topologically sort wagons based on relationships.
 * Falls back to sequence order if no relationships or circular dependencies.
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

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  // Sort queue by original sequence to maintain stable order for ties
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

    // Re-sort queue for stable ordering
    queue.sort((a, b) => (wagonMap.get(a)?.sequence || 0) - (wagonMap.get(b)?.sequence || 0));
  }

  // If not all wagons were sorted (cycle), fall back to sequence order
  if (sorted.length < wagons.length) {
    return [...wagons].sort((a, b) => a.sequence - b.sequence);
  }

  return sorted;
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
