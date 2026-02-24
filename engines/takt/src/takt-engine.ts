/**
 * Takt Deterministic Engine — Core Computation
 *
 * Pure mathematical takt grid calculation.
 * - Forward pass: S(i,j) = max(F(predecessors)), F(i,j) = S(i,j) + D(i,j)
 * - Critical path identification via backward pass
 * - Delay propagation via full recalculation
 *
 * Stateless. No AI. No database. No side effects.
 */

import {
  TaktEngineInput,
  TaktEngineOutput,
  CellSchedule,
  DelayInput,
  DurationMap,
  DependencyMap,
} from './types';

import {
  CircularDependencyError,
  NegativeDurationError,
  MissingDependencyError,
  NullDurationError,
} from './errors';

/**
 * Build the cell key string from location and wagon indices.
 */
function cellKey(locationIndex: number, wagonIndex: number): string {
  return `${locationIndex},${wagonIndex}`;
}

/**
 * Get dependencies for a cell, returning empty array if not defined.
 */
function getDeps(dependencies: DependencyMap, cell: string): string[] {
  return dependencies[cell] ?? [];
}

/**
 * Validate all inputs before computation.
 * After this passes, all durations exist and are non-negative,
 * all dependency references are valid, and there are no cycles.
 */
function validateInput(
  validCells: Set<string>,
  durations: DurationMap,
  dependencies: DependencyMap,
): void {
  // Validate durations
  for (const key of validCells) {
    const duration = durations[key];
    if (duration === null || duration === undefined) {
      throw new NullDurationError(key);
    }
    if (duration < 0) {
      throw new NegativeDurationError(key, duration);
    }
  }

  // Validate dependencies reference valid cells
  for (const key of validCells) {
    for (const dep of getDeps(dependencies, key)) {
      if (!validCells.has(dep)) {
        throw new MissingDependencyError(key, dep);
      }
    }
  }

  // Detect circular dependencies via topological sort
  detectCircularDependencies(validCells, dependencies);
}

/**
 * Detect circular dependencies using Kahn's algorithm.
 */
function detectCircularDependencies(
  validCells: Set<string>,
  dependencies: DependencyMap,
): void {
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const cell of validCells) {
    inDegree.set(cell, 0);
    successors.set(cell, []);
  }

  for (const cell of validCells) {
    for (const dep of getDeps(dependencies, cell)) {
      successors.get(dep)!.push(cell);
      inDegree.set(cell, inDegree.get(cell)! + 1);
    }
  }

  const queue: string[] = [];
  for (const [cell, degree] of inDegree) {
    if (degree === 0) queue.push(cell);
  }

  let processedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processedCount++;

    for (const succ of successors.get(current)!) {
      const newDegree = inDegree.get(succ)! - 1;
      inDegree.set(succ, newDegree);
      if (newDegree === 0) queue.push(succ);
    }
  }

  if (processedCount < validCells.size) {
    throw new CircularDependencyError(
      `${validCells.size - processedCount} cells involved in cycle`,
    );
  }
}

/**
 * Compute topological order of cells based on dependencies.
 * Assumes input has been validated (no cycles, all refs valid).
 */
function topologicalOrder(
  validCells: Set<string>,
  dependencies: DependencyMap,
): string[] {
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const cell of validCells) {
    inDegree.set(cell, 0);
    successors.set(cell, []);
  }

  for (const cell of validCells) {
    for (const dep of getDeps(dependencies, cell)) {
      successors.get(dep)!.push(cell);
      inDegree.set(cell, inDegree.get(cell)! + 1);
    }
  }

  const queue: string[] = [];
  for (const [cell, degree] of inDegree) {
    if (degree === 0) queue.push(cell);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    queue.sort();
    const current = queue.shift()!;
    order.push(current);

    for (const succ of successors.get(current)!) {
      const newDegree = inDegree.get(succ)! - 1;
      inDegree.set(succ, newDegree);
      if (newDegree === 0) queue.push(succ);
    }
  }

  return order;
}

/**
 * Build default dependencies for a standard takt grid.
 * Each cell (i,j) depends on:
 *   - (i-1,j): same wagon in previous location (flow constraint)
 *   - (i,j-1): previous wagon in same location (zone constraint)
 */
function buildDefaultDependencies(
  numLocations: number,
  numWagons: number,
  explicitDeps: DependencyMap,
): DependencyMap {
  const deps: DependencyMap = {};

  for (let i = 0; i < numLocations; i++) {
    for (let j = 0; j < numWagons; j++) {
      const key = cellKey(i, j);

      if (explicitDeps[key] !== undefined) {
        deps[key] = explicitDeps[key];
        continue;
      }

      const cellDeps: string[] = [];
      if (i > 0) cellDeps.push(cellKey(i - 1, j));
      if (j > 0) cellDeps.push(cellKey(i, j - 1));
      deps[key] = cellDeps;
    }
  }

  return deps;
}

/**
 * Forward pass: compute start and finish times for all cells.
 * Processes cells in topological order, so all predecessors are already scheduled.
 */
function forwardPass(
  durations: DurationMap,
  dependencies: DependencyMap,
  order: string[],
): Map<string, { start: number; finish: number }> {
  const schedule = new Map<string, { start: number; finish: number }>();

  for (const cell of order) {
    let start = 0;

    for (const dep of getDeps(dependencies, cell)) {
      const depFinish = schedule.get(dep)!.finish;
      if (depFinish > start) {
        start = depFinish;
      }
    }

    const duration = durations[cell];
    schedule.set(cell, { start, finish: start + duration });
  }

  return schedule;
}

/**
 * Backward pass: compute latest start/finish and identify critical path.
 */
function identifyCriticalPath(
  validCells: Set<string>,
  durations: DurationMap,
  dependencies: DependencyMap,
  schedule: Map<string, { start: number; finish: number }>,
  projectFinish: number,
): Set<string> {
  // Build successor map
  const successors = new Map<string, string[]>();
  for (const cell of validCells) {
    successors.set(cell, []);
  }
  for (const cell of validCells) {
    for (const dep of getDeps(dependencies, cell)) {
      successors.get(dep)!.push(cell);
    }
  }

  const lateFinish = new Map<string, number>();
  const lateStart = new Map<string, number>();

  const order = topologicalOrder(validCells, dependencies);

  for (const cell of validCells) {
    lateFinish.set(cell, projectFinish);
  }

  // Process in reverse topological order
  for (let idx = order.length - 1; idx >= 0; idx--) {
    const cell = order[idx];
    const succs = successors.get(cell)!;

    if (succs.length > 0) {
      let minLateStart = Infinity;
      for (const succ of succs) {
        const succLS = lateStart.get(succ)!;
        if (succLS < minLateStart) {
          minLateStart = succLS;
        }
      }
      lateFinish.set(cell, minLateStart);
    }

    const duration = durations[cell];
    lateStart.set(cell, lateFinish.get(cell)! - duration);
  }

  // Critical cells: where early start === late start (zero float)
  const criticalCells = new Set<string>();
  for (const cell of validCells) {
    const earlyStart = schedule.get(cell)!.start;
    const ls = lateStart.get(cell)!;
    if (Math.abs(earlyStart - ls) < 1e-10) {
      criticalCells.add(cell);
    }
  }

  return criticalCells;
}

/**
 * Compute the takt grid schedule.
 *
 * @param input - Locations, wagons, durations, and dependencies
 * @returns Complete schedule with critical path and variance
 */
export function computeTaktGrid(input: TaktEngineInput): TaktEngineOutput {
  const { locations, wagons, durations } = input;

  const sortedLocations = [...locations].sort((a, b) => a.sequence - b.sequence);
  const sortedWagons = [...wagons].sort((a, b) => a.sequence - b.sequence);

  const numLocations = sortedLocations.length;
  const numWagons = sortedWagons.length;

  const fullDependencies = buildDefaultDependencies(
    numLocations,
    numWagons,
    input.dependencies,
  );

  const validCells = new Set<string>();
  for (let i = 0; i < numLocations; i++) {
    for (let j = 0; j < numWagons; j++) {
      validCells.add(cellKey(i, j));
    }
  }

  // Validate all inputs
  validateInput(validCells, durations, fullDependencies);

  // Topological order
  const order = topologicalOrder(validCells, fullDependencies);

  // Forward pass
  const schedule = forwardPass(durations, fullDependencies, order);

  // Project finish
  let projectFinish = 0;
  for (const { finish } of schedule.values()) {
    if (finish > projectFinish) projectFinish = finish;
  }

  // Critical path
  const criticalCells = identifyCriticalPath(
    validCells,
    durations,
    fullDependencies,
    schedule,
    projectFinish,
  );

  // Build output
  const cellSchedule: CellSchedule[] = [];
  let totalVariance = 0;

  const durationValues = Object.values(durations);
  const avgDuration =
    durationValues.reduce((sum, d) => sum + d, 0) / durationValues.length;

  for (let i = 0; i < numLocations; i++) {
    for (let j = 0; j < numWagons; j++) {
      const key = cellKey(i, j);
      const cellSched = schedule.get(key)!;
      const duration = durations[key];
      const isCritical = criticalCells.has(key);

      totalVariance += Math.pow(duration - avgDuration, 2);

      cellSchedule.push({
        locationIndex: i,
        wagonIndex: j,
        locationId: sortedLocations[i].id,
        wagonId: sortedWagons[j].id,
        start: cellSched.start,
        finish: cellSched.finish,
        duration,
        isCritical,
      });
    }
  }

  totalVariance = totalVariance / cellSchedule.length;

  return {
    project_finish_date: projectFinish,
    cell_schedule: cellSchedule,
    critical_cells: Array.from(criticalCells),
    total_takt_variance: Math.round(totalVariance * 1000) / 1000,
  };
}

/**
 * Apply a delay to a specific cell and recompute the entire grid.
 *
 * @param input - Original takt input
 * @param delay - Cell to delay and delay amount
 * @returns New schedule reflecting the delay propagation
 */
export function applyDelayAndRecompute(
  input: TaktEngineInput,
  delay: DelayInput,
): TaktEngineOutput {
  const key = cellKey(delay.locationIndex, delay.wagonIndex);
  const newDurations: DurationMap = { ...input.durations };
  const originalDuration = newDurations[key];

  if (originalDuration === null || originalDuration === undefined) {
    throw new NullDurationError(key);
  }

  newDurations[key] = originalDuration + delay.delayDays;

  return computeTaktGrid({
    ...input,
    durations: newDurations,
  });
}
