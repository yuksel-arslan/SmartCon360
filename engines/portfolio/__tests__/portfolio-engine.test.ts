/**
 * Portfolio Intelligence Engine — Tests
 *
 * Test coverage targets:
 * - Test 1: 2 projects with different SPI values
 * - Test 2: High risk project (portfolio risk increase)
 * - Test 3: Resource conflict detection
 * - Test 4: Empty portfolio (graceful handling)
 * - Test 5: Large data (100+ projects performance)
 * - Additional edge cases for ≥90% coverage
 */

import {
  computePortfolio,
  PortfolioEngineInput,
  PortfolioProject,
} from '../src';

// ─── Helper: build standard projects ───

function buildProject(overrides?: Partial<PortfolioProject>): PortfolioProject {
  return {
    project_id: 'proj-1',
    spi: 1.0,
    cpi: 1.0,
    risk_score: 0.2,
    planned_finish: '2026-12-31',
    budget: 1_000_000,
    resource_demand: 50,
    ...overrides,
  };
}

// ─── Test 1: Two Projects ───

describe('Test 1 — Two Projects with different SPI', () => {
  const input: PortfolioEngineInput = {
    projects: [
      buildProject({ project_id: 'P1', spi: 0.9, cpi: 1.0, budget: 500_000 }),
      buildProject({ project_id: 'P2', spi: 1.1, cpi: 0.95, budget: 500_000 }),
    ],
    global_constraints: {
      total_resources: 100,
      currency: 'USD',
      reporting_period: '2026-Q1',
    },
  };

  it('should calculate correct average SPI', () => {
    const result = computePortfolio(input);
    // (0.9 + 1.1) / 2 = 1.0
    expect(result.portfolio_spi_avg).toBe(1.0);
  });

  it('should calculate correct average CPI', () => {
    const result = computePortfolio(input);
    // (1.0 + 0.95) / 2 = 0.975
    expect(result.portfolio_cpi_avg).toBeCloseTo(0.975, 3);
  });

  it('should calculate budget-weighted portfolio risk', () => {
    const result = computePortfolio(input);
    // Both same budget: simple average of risk scores
    expect(result.portfolio_risk_score).toBe(0.2);
  });

  it('should produce an executive summary', () => {
    const result = computePortfolio(input);
    expect(result.executive_summary).toContain('2 project(s)');
  });
});

// ─── Test 2: High Risk Project ───

describe('Test 2 — High Risk Project', () => {
  const input: PortfolioEngineInput = {
    projects: [
      buildProject({ project_id: 'SAFE', spi: 1.0, cpi: 1.0, risk_score: 0.1, budget: 500_000 }),
      buildProject({ project_id: 'RISKY', spi: 0.6, cpi: 0.7, risk_score: 0.8, budget: 2_000_000 }),
    ],
    global_constraints: {
      total_resources: 100,
      currency: 'USD',
      reporting_period: '2026-Q1',
    },
  };

  it('should have elevated portfolio risk due to high-risk project', () => {
    const result = computePortfolio(input);
    // Weighted: (0.1*500000 + 0.8*2000000) / 2500000 = (50000+1600000)/2500000 = 0.66
    expect(result.portfolio_risk_score).toBeGreaterThan(0.5);
  });

  it('should identify risky project in projects_at_risk', () => {
    const result = computePortfolio(input);
    expect(result.projects_at_risk.length).toBeGreaterThan(0);
    const risky = result.projects_at_risk.find((p) => p.project_id === 'RISKY');
    expect(risky).toBeDefined();
    expect(risky!.risk_score).toBe(0.8);
  });

  it('should calculate risk exposure correctly', () => {
    const result = computePortfolio(input);
    const risky = result.projects_at_risk.find((p) => p.project_id === 'RISKY')!;
    expect(risky.risk_exposure).toBe(1_600_000); // 0.8 * 2000000
  });

  it('should mention risky project in executive summary', () => {
    const result = computePortfolio(input);
    expect(result.executive_summary).toContain('RISKY');
  });
});

// ─── Test 3: Resource Conflict ───

describe('Test 3 — Resource Conflict', () => {
  it('should detect resource over-allocation', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', resource_demand: 60 }),
        buildProject({ project_id: 'P2', resource_demand: 70 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    // RC = (60 + 70) / 100 = 1.3
    expect(result.resource_conflict_score).toBe(1.3);
  });

  it('should report under-utilization correctly', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', resource_demand: 20 }),
        buildProject({ project_id: 'P2', resource_demand: 30 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    // RC = 50 / 100 = 0.5
    expect(result.resource_conflict_score).toBe(0.5);
  });

  it('should mention over-allocation in executive summary', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', resource_demand: 80 }),
        buildProject({ project_id: 'P2', resource_demand: 90 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    expect(result.executive_summary).toContain('Over-allocated');
  });
});

// ─── Test 4: Empty Portfolio ───

describe('Test 4 — Empty Portfolio', () => {
  it('should handle empty project list gracefully', () => {
    const input: PortfolioEngineInput = {
      projects: [],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    expect(result.portfolio_spi_avg).toBe(0);
    expect(result.portfolio_cpi_avg).toBe(0);
    expect(result.portfolio_risk_score).toBe(0);
    expect(result.resource_conflict_score).toBe(0);
    expect(result.aggregate_cash_flow).toEqual([]);
    expect(result.projects_at_risk).toEqual([]);
    expect(result.portfolio_health_score).toBe(0);
    expect(result.executive_summary).toContain('No projects');
  });
});

// ─── Test 5: Large Data (100+ projects) ───

describe('Test 5 — Large Data (100+ projects)', () => {
  it('should handle 150 projects', () => {
    const projects: PortfolioProject[] = Array.from({ length: 150 }, (_, i) => ({
      project_id: `proj-${i}`,
      spi: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
      cpi: 0.8 + Math.random() * 0.4,
      risk_score: Math.random() * 0.5,
      planned_finish: '2027-06-30',
      budget: 1_000_000 + i * 10_000,
      resource_demand: 10 + (i % 20),
      cash_flow: [100_000, 200_000, 300_000],
    }));

    const input: PortfolioEngineInput = {
      projects,
      global_constraints: {
        total_resources: 1000,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const start = Date.now();
    const result = computePortfolio(input);
    const elapsed = Date.now() - start;

    // Should complete in reasonable time
    expect(elapsed).toBeLessThan(5000);

    // Basic sanity checks
    expect(result.portfolio_spi_avg).toBeGreaterThan(0);
    expect(result.portfolio_cpi_avg).toBeGreaterThan(0);
    expect(result.portfolio_risk_score).toBeGreaterThanOrEqual(0);
    expect(result.aggregate_cash_flow.length).toBe(3);
  });
});

// ─── Cash Flow Aggregation ───

describe('Cash Flow Aggregation', () => {
  it('should aggregate cash flow across projects', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({
          project_id: 'P1',
          cash_flow: [100_000, 200_000, 300_000],
        }),
        buildProject({
          project_id: 'P2',
          cash_flow: [50_000, 150_000],
        }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    expect(result.aggregate_cash_flow).toEqual([150_000, 350_000, 300_000]);
  });

  it('should handle projects with no cash flow data', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1' }),
        buildProject({ project_id: 'P2' }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    expect(result.aggregate_cash_flow).toEqual([]);
  });
});

// ─── Portfolio Health Score ───

describe('Portfolio Health Score', () => {
  it('should calculate PHS with default weights', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', spi: 1.0, cpi: 1.0, risk_score: 0.0, resource_demand: 50 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    // PHS = 0.25*1.0 + 0.25*1.0 + 0.25*(1-0) + 0.25*(1-0.5) = 0.25+0.25+0.25+0.125 = 0.875
    expect(result.portfolio_health_score).toBeCloseTo(0.875, 3);
  });

  it('should support custom health weights', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', spi: 0.8, cpi: 0.9 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const defaultResult = computePortfolio(input);
    const customResult = computePortfolio(input, { w1: 0.5, w2: 0.3, w3: 0.1, w4: 0.1 });

    expect(customResult.portfolio_health_score).not.toBe(defaultResult.portfolio_health_score);
  });
});

// ─── Deterministic Behavior ───

describe('Deterministic Behavior', () => {
  it('same input should produce identical output', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', spi: 0.85, cpi: 0.90, risk_score: 0.45, budget: 800_000 }),
        buildProject({ project_id: 'P2', spi: 1.1, cpi: 1.05, risk_score: 0.1, budget: 1_200_000 }),
      ],
      global_constraints: {
        total_resources: 100,
        currency: 'EUR',
        reporting_period: '2026-Q2',
      },
    };

    const result1 = computePortfolio(input);
    const result2 = computePortfolio(input);

    expect(result1.portfolio_spi_avg).toBe(result2.portfolio_spi_avg);
    expect(result1.portfolio_cpi_avg).toBe(result2.portfolio_cpi_avg);
    expect(result1.portfolio_risk_score).toBe(result2.portfolio_risk_score);
    expect(result1.resource_conflict_score).toBe(result2.resource_conflict_score);
    expect(result1.portfolio_health_score).toBe(result2.portfolio_health_score);
    expect(result1.executive_summary).toBe(result2.executive_summary);
  });
});

// ─── Projects At Risk Detection ───

describe('Projects at Risk Detection', () => {
  it('should identify projects with SPI < 0.9', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'BEHIND', spi: 0.85, cpi: 1.0, risk_score: 0.3 }),
        buildProject({ project_id: 'ONTRACK', spi: 1.05, cpi: 1.0, risk_score: 0.1 }),
      ],
      global_constraints: { total_resources: 100, currency: 'USD', reporting_period: '2026-Q1' },
    };

    const result = computePortfolio(input);
    const atRisk = result.projects_at_risk.map((p) => p.project_id);
    expect(atRisk).toContain('BEHIND');
    expect(atRisk).not.toContain('ONTRACK');
  });

  it('should sort projects by risk score descending', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'MED', spi: 0.8, risk_score: 0.5 }),
        buildProject({ project_id: 'HIGH', spi: 0.7, risk_score: 0.9 }),
        buildProject({ project_id: 'LOW', spi: 0.85, risk_score: 0.3 }),
      ],
      global_constraints: { total_resources: 100, currency: 'USD', reporting_period: '2026-Q1' },
    };

    const result = computePortfolio(input);
    const riskScores = result.projects_at_risk.map((p) => p.risk_score);
    for (let i = 1; i < riskScores.length; i++) {
      expect(riskScores[i - 1]).toBeGreaterThanOrEqual(riskScores[i]);
    }
  });

  it('should return at most top 3 risky projects', () => {
    const input: PortfolioEngineInput = {
      projects: Array.from({ length: 10 }, (_, i) => buildProject({
        project_id: `P${i}`,
        spi: 0.7,
        risk_score: 0.6 + i * 0.02,
      })),
      global_constraints: { total_resources: 100, currency: 'USD', reporting_period: '2026-Q1' },
    };

    const result = computePortfolio(input);
    expect(result.projects_at_risk.length).toBeLessThanOrEqual(3);
  });
});

// ─── Resource Conflict with Zero Capacity ───

describe('Resource Conflict — Zero Total Resources', () => {
  it('should fallback to std deviation when total_resources = 0', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'P1', resource_demand: 30 }),
        buildProject({ project_id: 'P2', resource_demand: 70 }),
      ],
      global_constraints: {
        total_resources: 0,
        currency: 'USD',
        reporting_period: '2026-Q1',
      },
    };

    const result = computePortfolio(input);
    expect(result.resource_conflict_score).toBeGreaterThan(0);
  });
});

// ─── Single Project ───

describe('Single Project Portfolio', () => {
  it('should handle single project correctly', () => {
    const input: PortfolioEngineInput = {
      projects: [
        buildProject({ project_id: 'SOLO', spi: 0.95, cpi: 1.05, risk_score: 0.3, budget: 2_000_000 }),
      ],
      global_constraints: { total_resources: 100, currency: 'EUR', reporting_period: '2026-Q1' },
    };

    const result = computePortfolio(input);
    expect(result.portfolio_spi_avg).toBe(0.95);
    expect(result.portfolio_cpi_avg).toBe(1.05);
    expect(result.portfolio_risk_score).toBe(0.3);
  });
});
