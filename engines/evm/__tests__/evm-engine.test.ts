/**
 * EVM Deterministic Engine — Tests
 *
 * Test coverage targets:
 * - Test 1: Normal scenario (EV < PV, EV < AC)
 * - Test 2: Cost overrun (CPI < 1, VAC negative)
 * - Test 3: Schedule delay (SPI < 1, SV negative)
 * - Test 4: Perfect project (SPI=1, CPI=1)
 * - Test 5: Edge case (PV=0 → error)
 * - Additional edge cases for ≥90% coverage
 */

import {
  computeEvm,
  computeEvmBatch,
  EvmEngineInput,
  ZeroDivisionError,
  NegativeValueError,
  NullInputError,
} from '../src';

// ─── Test 1: Normal Scenario ───

describe('Test 1 — Normal Scenario (behind schedule, over budget)', () => {
  const input: EvmEngineInput = {
    baseline_cost: 1_000_000,
    planned_value: 500_000,
    earned_value: 400_000,
    actual_cost: 450_000,
  };

  it('should calculate correct SPI', () => {
    const result = computeEvm(input);
    // SPI = EV/PV = 400000/500000 = 0.8
    expect(result.spi).toBe(0.8);
  });

  it('should calculate correct CPI', () => {
    const result = computeEvm(input);
    // CPI = EV/AC = 400000/450000 = 0.8889
    expect(result.cpi).toBeCloseTo(0.8889, 3);
  });

  it('should calculate correct CV (negative = over budget)', () => {
    const result = computeEvm(input);
    // CV = EV - AC = 400000 - 450000 = -50000
    expect(result.cv).toBe(-50_000);
  });

  it('should calculate correct SV (negative = behind schedule)', () => {
    const result = computeEvm(input);
    // SV = EV - PV = 400000 - 500000 = -100000
    expect(result.sv).toBe(-100_000);
  });

  it('should calculate correct EAC', () => {
    const result = computeEvm(input);
    // EAC = BAC/CPI = 1000000/0.8889 ≈ 1125000
    expect(result.eac).toBeCloseTo(1_125_000, -2);
  });

  it('should calculate correct ETC', () => {
    const result = computeEvm(input);
    // ETC = EAC - AC
    expect(result.etc).toBeCloseTo(result.eac - 450_000, 0);
  });

  it('should calculate correct VAC', () => {
    const result = computeEvm(input);
    // VAC = BAC - EAC (negative = cost overrun expected)
    expect(result.vac).toBeLessThan(0);
  });

  it('should calculate project health score', () => {
    const result = computeEvm(input);
    // PHS = 0.5*SPI + 0.5*CPI = 0.5*0.8 + 0.5*0.8889 ≈ 0.8444
    expect(result.project_health_score).toBeCloseTo(0.8444, 2);
  });
});

// ─── Test 2: Cost Overrun ───

describe('Test 2 — Cost Overrun', () => {
  const input: EvmEngineInput = {
    baseline_cost: 1_000_000,
    planned_value: 600_000,
    earned_value: 500_000,
    actual_cost: 700_000,
  };

  it('should have CPI < 1', () => {
    const result = computeEvm(input);
    // CPI = 500000/700000 ≈ 0.714
    expect(result.cpi).toBeLessThan(1);
  });

  it('should have negative VAC', () => {
    const result = computeEvm(input);
    expect(result.vac).toBeLessThan(0);
  });

  it('should have EAC greater than BAC', () => {
    const result = computeEvm(input);
    expect(result.eac).toBeGreaterThan(1_000_000);
  });

  it('should have negative CV', () => {
    const result = computeEvm(input);
    expect(result.cv).toBe(-200_000);
  });
});

// ─── Test 3: Schedule Delay ───

describe('Test 3 — Schedule Delay', () => {
  const input: EvmEngineInput = {
    baseline_cost: 2_000_000,
    planned_value: 1_000_000,
    earned_value: 700_000,
    actual_cost: 700_000,
  };

  it('should have SPI < 1', () => {
    const result = computeEvm(input);
    // SPI = 700000/1000000 = 0.7
    expect(result.spi).toBe(0.7);
    expect(result.spi).toBeLessThan(1);
  });

  it('should have negative SV', () => {
    const result = computeEvm(input);
    // SV = 700000 - 1000000 = -300000
    expect(result.sv).toBe(-300_000);
  });

  it('should have CPI = 1 (on budget)', () => {
    const result = computeEvm(input);
    // CPI = 700000/700000 = 1.0
    expect(result.cpi).toBe(1.0);
  });
});

// ─── Test 4: Perfect Project ───

describe('Test 4 — Perfect Project', () => {
  const input: EvmEngineInput = {
    baseline_cost: 500_000,
    planned_value: 250_000,
    earned_value: 250_000,
    actual_cost: 250_000,
  };

  it('should have SPI = 1', () => {
    const result = computeEvm(input);
    expect(result.spi).toBe(1.0);
  });

  it('should have CPI = 1', () => {
    const result = computeEvm(input);
    expect(result.cpi).toBe(1.0);
  });

  it('should have CV = 0', () => {
    const result = computeEvm(input);
    expect(result.cv).toBe(0);
  });

  it('should have SV = 0', () => {
    const result = computeEvm(input);
    expect(result.sv).toBe(0);
  });

  it('should have EAC = BAC', () => {
    const result = computeEvm(input);
    expect(result.eac).toBe(500_000);
  });

  it('should have VAC = 0', () => {
    const result = computeEvm(input);
    expect(result.vac).toBe(0);
  });

  it('should have PHS = 1.0', () => {
    const result = computeEvm(input);
    expect(result.project_health_score).toBe(1.0);
  });
});

// ─── Test 5: Edge Cases ───

describe('Test 5 — Edge Cases', () => {
  it('should throw ZeroDivisionError when PV = 0', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 0,
      earned_value: 100_000,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(ZeroDivisionError);
  });

  it('should throw ZeroDivisionError when AC = 0', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: 100_000,
      actual_cost: 0,
    };
    expect(() => computeEvm(input)).toThrow(ZeroDivisionError);
  });

  it('should throw ZeroDivisionError when BAC = 0', () => {
    const input: EvmEngineInput = {
      baseline_cost: 0,
      planned_value: 500_000,
      earned_value: 100_000,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(ZeroDivisionError);
  });

  it('should throw NegativeValueError for negative values', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: -500_000,
      earned_value: 100_000,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(NegativeValueError);
  });

  it('should throw NullInputError for null input', () => {
    const input = {
      baseline_cost: 1_000_000,
      planned_value: null as unknown as number,
      earned_value: 100_000,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(NullInputError);
  });

  it('should throw NullInputError for undefined input', () => {
    const input = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: undefined as unknown as number,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(NullInputError);
  });

  it('should throw NullInputError for NaN input', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: NaN,
      actual_cost: 100_000,
    };
    expect(() => computeEvm(input)).toThrow(NullInputError);
  });
});

// ─── Custom Weights ───

describe('Custom PHS Weights', () => {
  it('should support custom PHS weights', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: 400_000,
      actual_cost: 400_000,
    };

    const result = computeEvm(input, { w1: 0.7, w2: 0.3 });
    // SPI = 0.8, CPI = 1.0
    // PHS = 0.7*0.8 + 0.3*1.0 = 0.56 + 0.30 = 0.86
    expect(result.project_health_score).toBeCloseTo(0.86, 2);
  });
});

// ─── Manual EAC Override ───

describe('Manual EAC Override', () => {
  it('should use estimate_at_completion when provided', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: 400_000,
      actual_cost: 450_000,
      estimate_at_completion: 1_200_000,
    };

    const result = computeEvm(input);
    expect(result.eac).toBe(1_200_000);
    expect(result.etc).toBe(750_000); // 1200000 - 450000
    expect(result.vac).toBe(-200_000); // 1000000 - 1200000
  });
});

// ─── Batch Computation ───

describe('Batch Computation', () => {
  it('should compute EVM for multiple periods', () => {
    const inputs: EvmEngineInput[] = [
      { baseline_cost: 1_000_000, planned_value: 200_000, earned_value: 200_000, actual_cost: 200_000 },
      { baseline_cost: 1_000_000, planned_value: 400_000, earned_value: 380_000, actual_cost: 410_000 },
      { baseline_cost: 1_000_000, planned_value: 600_000, earned_value: 550_000, actual_cost: 620_000 },
    ];

    const results = computeEvmBatch(inputs);
    expect(results.length).toBe(3);

    // First period: perfect
    expect(results[0].spi).toBe(1.0);
    expect(results[0].cpi).toBe(1.0);

    // Second period: slight delay and overrun
    expect(results[1].spi).toBeLessThan(1.0);
    expect(results[1].cpi).toBeLessThan(1.0);
  });
});

// ─── Deterministic Behavior ───

describe('Deterministic Behavior', () => {
  it('should produce identical output for identical input', () => {
    const input: EvmEngineInput = {
      baseline_cost: 1_000_000,
      planned_value: 500_000,
      earned_value: 400_000,
      actual_cost: 450_000,
    };

    const result1 = computeEvm(input);
    const result2 = computeEvm(input);
    expect(result1).toEqual(result2);
  });
});

// ─── Floating Point Precision ───

describe('Floating Point Precision', () => {
  it('should maintain precision with large values', () => {
    const input: EvmEngineInput = {
      baseline_cost: 999_999_999,
      planned_value: 500_000_000,
      earned_value: 450_000_000,
      actual_cost: 480_000_000,
    };

    const result = computeEvm(input);
    expect(result.spi).toBeCloseTo(0.9, 1);
    expect(result.cpi).toBeCloseTo(0.9375, 3);
    expect(typeof result.eac).toBe('number');
    expect(isFinite(result.eac)).toBe(true);
  });
});
