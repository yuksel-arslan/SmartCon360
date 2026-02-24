/**
 * Takt Deterministic Engine — Tests
 *
 * Test coverage targets:
 * - Test 1: Simple linear grid (3 locations × 3 wagons)
 * - Test 2: Parallel flow (two independent wagons)
 * - Test 3: Delay scenario (+2 days, chain effect)
 * - Test 4: Circular dependency detection
 * - Additional edge cases for ≥90% coverage
 */

import {
  computeTaktGrid,
  applyDelayAndRecompute,
  TaktEngineInput,
  CircularDependencyError,
  NegativeDurationError,
  MissingDependencyError,
  NullDurationError,
} from '../src';

// ─── Helper: build a simple grid input ───

function buildLinearGrid(
  numLocations: number,
  numWagons: number,
  duration: number,
): TaktEngineInput {
  const locations = Array.from({ length: numLocations }, (_, i) => ({
    id: `loc-${i}`,
    name: `Location ${i}`,
    sequence: i,
  }));
  const wagons = Array.from({ length: numWagons }, (_, j) => ({
    id: `wgn-${j}`,
    name: `Wagon ${j}`,
    sequence: j,
  }));

  const durations: Record<string, number> = {};
  const dependencies: Record<string, string[]> = {};

  for (let i = 0; i < numLocations; i++) {
    for (let j = 0; j < numWagons; j++) {
      const key = `${i},${j}`;
      durations[key] = duration;
      const deps: string[] = [];
      if (i > 0) deps.push(`${i - 1},${j}`);
      if (j > 0) deps.push(`${i},${j - 1}`);
      dependencies[key] = deps;
    }
  }

  return { locations, wagons, durations, dependencies };
}

// ─── Test 1: Simple Linear Grid ───

describe('Test 1 — Simple Linear Grid (3×3)', () => {
  const input = buildLinearGrid(3, 3, 5);

  it('should compute correct project finish date', () => {
    const result = computeTaktGrid(input);
    // 3 locations × 3 wagons, each 5 days, sequential flow
    // S(0,0)=0 F=5, S(1,0)=5 F=10, S(2,0)=10 F=15
    // S(0,1)=5 F=10, S(1,1)=10 F=15, S(2,1)=15 F=20
    // S(0,2)=10 F=15, S(1,2)=15 F=20, S(2,2)=20 F=25
    expect(result.project_finish_date).toBe(25);
  });

  it('should produce correct number of cell schedules', () => {
    const result = computeTaktGrid(input);
    expect(result.cell_schedule.length).toBe(9);
  });

  it('should identify critical path cells', () => {
    const result = computeTaktGrid(input);
    // Critical path: diagonal (0,0)→(1,0)→(1,1)→(2,1)→(2,2) or similar
    expect(result.critical_cells.length).toBeGreaterThan(0);
    // All cells on the diagonal should be critical for uniform durations
    expect(result.critical_cells).toContain('0,0');
    expect(result.critical_cells).toContain('2,2');
  });

  it('should have correct start/finish for first cell', () => {
    const result = computeTaktGrid(input);
    const firstCell = result.cell_schedule.find(
      (c) => c.locationIndex === 0 && c.wagonIndex === 0,
    )!;
    expect(firstCell.start).toBe(0);
    expect(firstCell.finish).toBe(5);
  });

  it('should have correct start/finish for last cell', () => {
    const result = computeTaktGrid(input);
    const lastCell = result.cell_schedule.find(
      (c) => c.locationIndex === 2 && c.wagonIndex === 2,
    )!;
    expect(lastCell.start).toBe(20);
    expect(lastCell.finish).toBe(25);
  });

  it('should calculate takt variance', () => {
    const result = computeTaktGrid(input);
    // All durations are equal (5), so variance should be 0
    expect(result.total_takt_variance).toBe(0);
  });
});

// ─── Test 2: Parallel Flow ───

describe('Test 2 — Parallel Flow (independent wagons)', () => {
  it('should handle two independent wagons correctly', () => {
    const locations = [
      { id: 'loc-0', name: 'Location 0', sequence: 0 },
      { id: 'loc-1', name: 'Location 1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'Wagon A', sequence: 0 },
      { id: 'wgn-1', name: 'Wagon B', sequence: 1 },
    ];

    // Wagons are independent (no cross-wagon dependency)
    const durations: Record<string, number> = {
      '0,0': 3, '1,0': 3,
      '0,1': 4, '1,1': 4,
    };
    const dependencies: Record<string, string[]> = {
      '0,0': [],
      '1,0': ['0,0'],      // flow only
      '0,1': [],            // wagon B starts independently
      '1,1': ['0,1'],       // flow only
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);

    // Wagon A: loc0=[0,3], loc1=[3,6]
    // Wagon B: loc0=[0,4], loc1=[4,8]
    expect(result.project_finish_date).toBe(8);

    const wgnA_loc0 = result.cell_schedule.find(
      (c) => c.locationIndex === 0 && c.wagonIndex === 0,
    )!;
    expect(wgnA_loc0.start).toBe(0);
    expect(wgnA_loc0.finish).toBe(3);

    const wgnB_loc1 = result.cell_schedule.find(
      (c) => c.locationIndex === 1 && c.wagonIndex === 1,
    )!;
    expect(wgnB_loc1.start).toBe(4);
    expect(wgnB_loc1.finish).toBe(8);
  });
});

// ─── Test 3: Delay Scenario ───

describe('Test 3 — Delay Propagation', () => {
  const input = buildLinearGrid(3, 3, 5);

  it('should propagate +2 day delay through the grid', () => {
    const original = computeTaktGrid(input);
    const delayed = applyDelayAndRecompute(input, {
      locationIndex: 0,
      wagonIndex: 0,
      delayDays: 2,
    });

    // Original project finish: 25
    // Cell (0,0) now takes 7 instead of 5
    // Chain effect should push project finish to 27
    expect(delayed.project_finish_date).toBe(original.project_finish_date + 2);
  });

  it('should show delayed cell with increased duration', () => {
    const delayed = applyDelayAndRecompute(input, {
      locationIndex: 0,
      wagonIndex: 0,
      delayDays: 2,
    });

    const delayedCell = delayed.cell_schedule.find(
      (c) => c.locationIndex === 0 && c.wagonIndex === 0,
    )!;
    expect(delayedCell.duration).toBe(7);
    expect(delayedCell.finish).toBe(7);
  });

  it('should cascade delay to downstream cells', () => {
    const delayed = applyDelayAndRecompute(input, {
      locationIndex: 0,
      wagonIndex: 0,
      delayDays: 2,
    });

    // Cell (1,0) depends on (0,0). Original start=5, now should be 7
    const cell10 = delayed.cell_schedule.find(
      (c) => c.locationIndex === 1 && c.wagonIndex === 0,
    )!;
    expect(cell10.start).toBe(7);
    expect(cell10.finish).toBe(12);
  });

  it('should handle delay on non-critical cell with minimal impact', () => {
    // Delay on a cell that has float should not change project finish as much
    // For uniform grid, all diagonal cells are critical — delay on (0,2) should still propagate
    const delayed = applyDelayAndRecompute(input, {
      locationIndex: 2,
      wagonIndex: 2,
      delayDays: 3,
    });
    // Cell (2,2) is the last cell, delay adds 3 to its finish
    expect(delayed.project_finish_date).toBe(28);
  });
});

// ─── Test 4: Circular Dependency ───

describe('Test 4 — Circular Dependency Detection', () => {
  it('should throw CircularDependencyError', () => {
    const locations = [
      { id: 'loc-0', name: 'Location 0', sequence: 0 },
      { id: 'loc-1', name: 'Location 1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'Wagon 0', sequence: 0 },
      { id: 'wgn-1', name: 'Wagon 1', sequence: 1 },
    ];

    const durations: Record<string, number> = {
      '0,0': 3, '1,0': 3,
      '0,1': 3, '1,1': 3,
    };

    // Circular: (0,0) → (0,1) → (1,1) → (1,0) → (0,0)
    const dependencies: Record<string, string[]> = {
      '0,0': ['1,0'],
      '0,1': ['0,0'],
      '1,0': ['1,1'],
      '1,1': ['0,1'],
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    expect(() => computeTaktGrid(input)).toThrow(CircularDependencyError);
  });
});

// ─── Additional Edge Cases ───

describe('Edge Cases', () => {
  it('should throw NegativeDurationError for negative duration', () => {
    const input = buildLinearGrid(2, 2, 5);
    input.durations['0,0'] = -1;

    expect(() => computeTaktGrid(input)).toThrow(NegativeDurationError);
  });

  it('should throw NullDurationError for missing duration', () => {
    const input = buildLinearGrid(2, 2, 5);
    delete (input.durations as Record<string, number | undefined>)['0,0'];

    expect(() => computeTaktGrid(input)).toThrow(NullDurationError);
  });

  it('should throw MissingDependencyError for invalid dependency reference', () => {
    const input = buildLinearGrid(2, 2, 5);
    input.dependencies['0,0'] = ['99,99'];

    expect(() => computeTaktGrid(input)).toThrow(MissingDependencyError);
  });

  it('should handle 1×1 grid', () => {
    const input = buildLinearGrid(1, 1, 10);
    const result = computeTaktGrid(input);
    expect(result.project_finish_date).toBe(10);
    expect(result.cell_schedule.length).toBe(1);
    expect(result.critical_cells).toContain('0,0');
  });

  it('should handle zero-duration cells', () => {
    const input = buildLinearGrid(2, 2, 0);
    const result = computeTaktGrid(input);
    expect(result.project_finish_date).toBe(0);
  });

  it('should handle varying durations', () => {
    const locations = [
      { id: 'loc-0', name: 'L0', sequence: 0 },
      { id: 'loc-1', name: 'L1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'W0', sequence: 0 },
      { id: 'wgn-1', name: 'W1', sequence: 1 },
    ];
    const durations: Record<string, number> = {
      '0,0': 3, '1,0': 5,
      '0,1': 4, '1,1': 2,
    };
    const dependencies: Record<string, string[]> = {
      '0,0': [],
      '1,0': ['0,0'],
      '0,1': ['0,0'],
      '1,1': ['1,0', '0,1'],
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);

    // (0,0): S=0, F=3
    // (1,0): S=3, F=8
    // (0,1): S=3, F=7
    // (1,1): S=max(8,7)=8, F=10
    expect(result.project_finish_date).toBe(10);
    expect(result.total_takt_variance).toBeGreaterThan(0);
  });

  it('should produce deterministic output (same input → same output)', () => {
    const input = buildLinearGrid(3, 3, 5);
    const result1 = computeTaktGrid(input);
    const result2 = computeTaktGrid(input);
    expect(result1).toEqual(result2);
  });

  it('should handle large grid (100×100 = 10,000 cells)', () => {
    const input = buildLinearGrid(100, 100, 1);
    const result = computeTaktGrid(input);
    expect(result.cell_schedule.length).toBe(10000);
    // For uniform 1-day duration in 100×100 grid: project finish = 100 + 100 - 1 = 199
    expect(result.project_finish_date).toBe(199);
  });

  it('should correctly assign location and wagon IDs in output', () => {
    const input = buildLinearGrid(2, 2, 3);
    const result = computeTaktGrid(input);

    const cell = result.cell_schedule.find(
      (c) => c.locationIndex === 1 && c.wagonIndex === 1,
    )!;
    expect(cell.locationId).toBe('loc-1');
    expect(cell.wagonId).toBe('wgn-1');
  });

  it('should handle default dependencies when not all cells have explicit deps', () => {
    const locations = [
      { id: 'loc-0', name: 'L0', sequence: 0 },
      { id: 'loc-1', name: 'L1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'W0', sequence: 0 },
      { id: 'wgn-1', name: 'W1', sequence: 1 },
    ];
    const durations: Record<string, number> = {
      '0,0': 5, '1,0': 5,
      '0,1': 5, '1,1': 5,
    };
    // Only provide some explicit dependencies, let defaults fill in
    const dependencies: Record<string, string[]> = {};

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);

    // Default deps: (0,0)=[], (1,0)=[(0,0)], (0,1)=[(0,0)], (1,1)=[(0,1),(1,0)]
    // S(0,0)=0 F=5, S(1,0)=5 F=10, S(0,1)=5 F=10, S(1,1)=10 F=15
    expect(result.project_finish_date).toBe(15);
  });

  it('should throw NullDurationError in applyDelayAndRecompute for invalid cell', () => {
    const input = buildLinearGrid(2, 2, 5);
    expect(() =>
      applyDelayAndRecompute(input, {
        locationIndex: 99,
        wagonIndex: 99,
        delayDays: 1,
      }),
    ).toThrow(NullDurationError);
  });

  it('should handle mixed explicit and default dependencies', () => {
    const locations = [
      { id: 'loc-0', name: 'L0', sequence: 0 },
      { id: 'loc-1', name: 'L1', sequence: 1 },
      { id: 'loc-2', name: 'L2', sequence: 2 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'W0', sequence: 0 },
    ];
    const durations: Record<string, number> = {
      '0,0': 3, '1,0': 4, '2,0': 5,
    };
    // Only provide explicit dep for first cell
    const dependencies: Record<string, string[]> = {
      '0,0': [],
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);
    expect(result.project_finish_date).toBe(12);
  });

  it('should handle unsorted sequences in locations', () => {
    const locations = [
      { id: 'loc-2', name: 'L2', sequence: 2 },
      { id: 'loc-0', name: 'L0', sequence: 0 },
      { id: 'loc-1', name: 'L1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'W0', sequence: 0 },
    ];
    const durations: Record<string, number> = {
      '0,0': 3, '1,0': 4, '2,0': 5,
    };
    const dependencies: Record<string, string[]> = {
      '0,0': [],
      '1,0': ['0,0'],
      '2,0': ['1,0'],
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);
    expect(result.project_finish_date).toBe(12);
    expect(result.cell_schedule[0].locationId).toBe('loc-0');
  });

  it('should distinguish critical and non-critical cells', () => {
    const locations = [
      { id: 'loc-0', name: 'L0', sequence: 0 },
      { id: 'loc-1', name: 'L1', sequence: 1 },
    ];
    const wagons = [
      { id: 'wgn-0', name: 'W0', sequence: 0 },
      { id: 'wgn-1', name: 'W1', sequence: 1 },
    ];
    const durations: Record<string, number> = {
      '0,0': 10, '1,0': 10,
      '0,1': 2, '1,1': 2,
    };
    const dependencies: Record<string, string[]> = {
      '0,0': [],
      '1,0': ['0,0'],
      '0,1': ['0,0'],
      '1,1': ['1,0', '0,1'],
    };

    const input: TaktEngineInput = { locations, wagons, durations, dependencies };
    const result = computeTaktGrid(input);

    const cell01 = result.cell_schedule.find(
      (c) => c.locationIndex === 0 && c.wagonIndex === 1,
    )!;
    const cell10 = result.cell_schedule.find(
      (c) => c.locationIndex === 1 && c.wagonIndex === 0,
    )!;
    expect(cell10.isCritical).toBe(true);
    expect(cell01.isCritical).toBe(false);
  });

  it('should instantiate error classes correctly', () => {
    const e1 = new CircularDependencyError();
    expect(e1.name).toBe('CircularDependencyError');
    expect(e1.message).toContain('Circular dependency');

    const e2 = new CircularDependencyError('test');
    expect(e2.message).toContain('test');

    const e3 = new NegativeDurationError('0,0', -5);
    expect(e3.name).toBe('NegativeDurationError');

    const e4 = new MissingDependencyError('0,0', '99,99');
    expect(e4.name).toBe('MissingDependencyError');

    const e5 = new NullDurationError('0,0');
    expect(e5.name).toBe('NullDurationError');
  });
});
