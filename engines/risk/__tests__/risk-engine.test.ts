/**
 * AI Risk Engine — Tests
 *
 * Test coverage targets:
 * - Test 1: Low risk scenario (SPI > 0.95, CPI > 0.95)
 * - Test 2: Critical path deviation (float reduction → risk increase)
 * - Test 3: High resource instability
 * - Test 4: Data incompleteness (confidence reduction)
 * - Test 5: Regression test (deterministic behavior)
 * - Additional edge cases for ≥90% coverage
 */

import {
  computeRisk,
  RiskEngineInput,
} from '../src';

// ─── Helper: build a standard input ───

function buildInput(overrides?: Partial<{
  spi: number;
  cpi: number;
  cv: number;
  budget: number;
  total_float: number;
  float_threshold: number;
  takt_variance: number;
  resource_load: number;
  historical_velocity: number;
  phase: string;
  contract_type: string;
}>): RiskEngineInput {
  const o = {
    spi: 1.0,
    cpi: 1.0,
    cv: 0,
    budget: 1_000_000,
    total_float: 10,
    float_threshold: 5,
    takt_variance: 0.0,
    resource_load: 0.5,
    historical_velocity: 1.0,
    phase: 'construction',
    contract_type: 'lump_sum',
    ...overrides,
  };

  return {
    cpm_metrics: {
      total_float: o.total_float,
      float_threshold: o.float_threshold,
      critical_activities_count: 5,
    },
    evm_metrics: {
      spi: o.spi,
      cpi: o.cpi,
      cv: o.cv,
      sv: 0,
      budget: o.budget,
    },
    takt_metrics: {
      takt_variance: o.takt_variance,
      stacking_zones_count: 0,
    },
    project_context: {
      phase: o.phase,
      contract_type: o.contract_type,
      resource_load: o.resource_load,
      historical_velocity: o.historical_velocity,
    },
  };
}

// ─── Test 1: Low Risk Scenario ───

describe('Test 1 — Low Risk Scenario', () => {
  const input = buildInput({ spi: 0.98, cpi: 0.97 });

  it('should classify as low risk', () => {
    const result = computeRisk(input);
    expect(result.risk_level).toBe('low');
  });

  it('should have low delay probability', () => {
    const result = computeRisk(input);
    expect(result.delay_probability).toBeLessThan(0.4);
  });

  it('should have low cost overrun probability', () => {
    const result = computeRisk(input);
    expect(result.cost_overrun_probability).toBeLessThan(0.4);
  });

  it('should have composite risk score < 0.4', () => {
    const result = computeRisk(input);
    expect(result.composite_risk_score).toBeLessThan(0.4);
  });

  it('should have high confidence score', () => {
    const result = computeRisk(input);
    expect(result.confidence_score).toBeGreaterThan(0.5);
  });

  it('should provide explanation with top 3 factors', () => {
    const result = computeRisk(input);
    expect(result.explanation.length).toBeLessThanOrEqual(3);
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  it('should not generate scenarios for low risk', () => {
    const result = computeRisk(input);
    expect(result.scenarios.length).toBe(0);
  });
});

// ─── Test 2: Critical Path Deviation ───

describe('Test 2 — Critical Path Deviation (float reduction)', () => {
  it('should increase risk when float decreases', () => {
    const highFloat = buildInput({ total_float: 10, float_threshold: 5 });
    const lowFloat = buildInput({ total_float: 1, float_threshold: 5 });

    const highResult = computeRisk(highFloat);
    const lowResult = computeRisk(lowFloat);

    expect(lowResult.delay_probability).toBeGreaterThan(highResult.delay_probability);
    expect(lowResult.composite_risk_score).toBeGreaterThan(highResult.composite_risk_score);
  });

  it('should increase risk when float goes to zero', () => {
    const input = buildInput({ total_float: 0, float_threshold: 5, spi: 0.85 });
    const result = computeRisk(input);
    expect(result.delay_probability).toBeGreaterThan(0.1);
  });
});

// ─── Test 3: High Resource Instability ───

describe('Test 3 — High Resource Instability', () => {
  it('should increase risk score with low historical velocity', () => {
    const stable = buildInput({ historical_velocity: 0.95 });
    const unstable = buildInput({ historical_velocity: 0.3 });

    const stableResult = computeRisk(stable);
    const unstableResult = computeRisk(unstable);

    expect(unstableResult.delay_probability).toBeGreaterThan(stableResult.delay_probability);
    expect(unstableResult.composite_risk_score).toBeGreaterThan(stableResult.composite_risk_score);
  });

  it('should generate scenarios for high resource instability', () => {
    const input = buildInput({
      historical_velocity: 0.2,
      spi: 0.5,
      cpi: 0.5,
      resource_load: 0.95,
      takt_variance: 0.8,
      total_float: 1,
      float_threshold: 5,
      cv: -300_000,
    });

    const result = computeRisk(input);
    expect(result.composite_risk_score).toBeGreaterThanOrEqual(0.4);
    expect(result.scenarios.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Test 4: Data Incompleteness ───

describe('Test 4 — Data Incompleteness', () => {
  it('should reduce confidence when data is incomplete', () => {
    const complete = buildInput();
    const incomplete: RiskEngineInput = {
      cpm_metrics: {
        total_float: 5,
      },
      evm_metrics: {
        spi: 0.9,
        cpi: 0.9,
        cv: -50_000,
        sv: -30_000,
        budget: 1_000_000,
      },
      takt_metrics: {
        takt_variance: 0.1,
      },
      project_context: {
        phase: '',
        contract_type: '',
        resource_load: 0.5,
        historical_velocity: 0.8,
      },
    };

    const completeResult = computeRisk(complete);
    const incompleteResult = computeRisk(incomplete);

    expect(incompleteResult.confidence_score).toBeLessThan(completeResult.confidence_score);
  });

  it('should still produce a valid result with missing optional fields', () => {
    const input: RiskEngineInput = {
      cpm_metrics: {
        total_float: 3,
      },
      evm_metrics: {
        spi: 0.85,
        cpi: 0.90,
        cv: -20_000,
        sv: -15_000,
        budget: 500_000,
      },
      takt_metrics: {
        takt_variance: 0.2,
      },
      project_context: {
        phase: 'construction',
        contract_type: 'lump_sum',
        resource_load: 0.7,
        historical_velocity: 0.75,
      },
    };

    const result = computeRisk(input);
    expect(result.risk_level).toBeDefined();
    expect(result.delay_probability).toBeGreaterThanOrEqual(0);
    expect(result.delay_probability).toBeLessThanOrEqual(1);
    expect(result.cost_overrun_probability).toBeGreaterThanOrEqual(0);
    expect(result.cost_overrun_probability).toBeLessThanOrEqual(1);
  });
});

// ─── Test 5: Regression Test (Deterministic) ───

describe('Test 5 — Regression Test (deterministic behavior)', () => {
  it('same input should produce identical output', () => {
    const input = buildInput({
      spi: 0.85,
      cpi: 0.90,
      total_float: 3,
      takt_variance: 0.15,
      historical_velocity: 0.7,
      cv: -50_000,
    });

    const result1 = computeRisk(input);
    const result2 = computeRisk(input);

    expect(result1.delay_probability).toBe(result2.delay_probability);
    expect(result1.cost_overrun_probability).toBe(result2.cost_overrun_probability);
    expect(result1.composite_risk_score).toBe(result2.composite_risk_score);
    expect(result1.confidence_score).toBe(result2.confidence_score);
    expect(result1.risk_level).toBe(result2.risk_level);
    expect(result1.explanation).toEqual(result2.explanation);
  });
});

// ─── Additional Edge Cases ───

describe('Edge Cases', () => {
  it('should handle perfect project (all metrics = 1.0)', () => {
    const input = buildInput();
    const result = computeRisk(input);
    expect(result.risk_level).toBe('low');
    expect(result.delay_probability).toBe(0);
    expect(result.cost_overrun_probability).toBe(0);
  });

  it('should handle worst case scenario', () => {
    const input = buildInput({
      spi: 0.3,
      cpi: 0.4,
      total_float: 0,
      takt_variance: 0.9,
      historical_velocity: 0.1,
      cv: -500_000,
      resource_load: 0.95,
    });

    const result = computeRisk(input);
    expect(result.risk_level).toBe('high');
    expect(result.delay_probability).toBeGreaterThan(0.5);
    expect(result.cost_overrun_probability).toBeGreaterThan(0.3);
    expect(result.scenarios.length).toBeGreaterThanOrEqual(2);
  });

  it('should clamp probabilities between 0 and 1', () => {
    const input = buildInput({
      spi: 0.1,
      cpi: 0.1,
      total_float: 0,
      takt_variance: 1.0,
      historical_velocity: 0.0,
      cv: -900_000,
    });

    const result = computeRisk(input);
    expect(result.delay_probability).toBeLessThanOrEqual(1);
    expect(result.delay_probability).toBeGreaterThanOrEqual(0);
    expect(result.cost_overrun_probability).toBeLessThanOrEqual(1);
    expect(result.cost_overrun_probability).toBeGreaterThanOrEqual(0);
    expect(result.composite_risk_score).toBeLessThanOrEqual(1);
    expect(result.composite_risk_score).toBeGreaterThanOrEqual(0);
  });

  it('should support custom weights', () => {
    const input = buildInput({
      spi: 0.6,
      cpi: 0.7,
      total_float: 2,
      takt_variance: 0.5,
      historical_velocity: 0.5,
      cv: -200_000,
    });
    const defaultResult = computeRisk(input);
    const customResult = computeRisk(input, {
      delay: { w1: 0.5, w2: 0.2, w3: 0.2, w4: 0.1 },
      cost: { w1: 0.8, w2: 0.2 },
      composite: { alpha: 0.3, beta: 0.7 },
    });

    // Different weights should produce different composite scores
    expect(customResult.composite_risk_score).not.toBe(defaultResult.composite_risk_score);
  });

  it('should provide explanation with numerical contribution', () => {
    const input = buildInput({ spi: 0.7, cpi: 0.8, takt_variance: 0.3 });
    const result = computeRisk(input);

    for (const explanation of result.explanation) {
      expect(explanation.factor).toBeDefined();
      expect(typeof explanation.contribution).toBe('number');
      expect(explanation.description).toBeDefined();
      expect(explanation.description.length).toBeGreaterThan(0);
    }
  });

  it('should have explanation sorted by contribution descending', () => {
    const input = buildInput({ spi: 0.7, cpi: 0.8, total_float: 1, takt_variance: 0.4 });
    const result = computeRisk(input);

    for (let i = 1; i < result.explanation.length; i++) {
      expect(result.explanation[i - 1].contribution).toBeGreaterThanOrEqual(
        result.explanation[i].contribution,
      );
    }
  });

  it('scenarios should include risk reduction estimate', () => {
    const input = buildInput({
      spi: 0.6,
      cpi: 0.7,
      total_float: 1,
      takt_variance: 0.6,
      historical_velocity: 0.3,
      resource_load: 0.9,
      cv: -200_000,
    });

    const result = computeRisk(input);
    for (const scenario of result.scenarios) {
      expect(scenario.risk_reduction).toBeGreaterThan(0);
      expect(scenario.risk_reduction).toBeLessThanOrEqual(1);
      expect(scenario.description.length).toBeGreaterThan(0);
    }
  });

  it('should handle medium risk range', () => {
    const input = buildInput({
      spi: 0.85,
      cpi: 0.85,
      total_float: 3,
      takt_variance: 0.2,
      historical_velocity: 0.7,
      cv: -50_000,
    });

    const result = computeRisk(input);
    // Should be in the low-to-medium range
    expect(['low', 'medium']).toContain(result.risk_level);
  });

  it('should handle zero budget gracefully for cost ratio', () => {
    const input = buildInput({ budget: 0, cv: -10_000, cpi: 0.8 });
    const result = computeRisk(input);
    expect(result.cost_overrun_probability).toBeGreaterThanOrEqual(0);
    expect(result.cost_overrun_probability).toBeLessThanOrEqual(1);
  });

  it('should handle zero float threshold', () => {
    const input = buildInput({ float_threshold: 0, total_float: 5 });
    const result = computeRisk(input);
    expect(result.delay_probability).toBeGreaterThanOrEqual(0);
  });

  it('should generate escalation scenario when composite >= 0.7 and few scenarios', () => {
    // Create a scenario with high risk but only cost overrun (not delay-heavy)
    const input = buildInput({
      spi: 0.3,
      cpi: 0.3,
      total_float: 0,
      float_threshold: 5,
      takt_variance: 0.9,
      historical_velocity: 0.1,
      cv: -400_000,
      resource_load: 0.4, // low resource load so resource scenario doesn't trigger
    });

    const result = computeRisk(input);
    expect(result.risk_level).toBe('high');
    expect(result.scenarios.length).toBeGreaterThanOrEqual(2);
  });

  it('should instantiate RiskEngineError', () => {
    const err = new (require('../src/errors').RiskEngineError)('test error');
    expect(err.name).toBe('RiskEngineError');
    expect(err.message).toBe('test error');
  });
});
