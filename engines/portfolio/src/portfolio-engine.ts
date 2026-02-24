/**
 * Portfolio Intelligence Engine — Core Computation
 *
 * Multi-project portfolio analysis and program-level KPIs.
 * - Average SPI/CPI across projects
 * - Budget-weighted portfolio risk
 * - Resource conflict detection
 * - Aggregate cash flow
 * - Portfolio health score
 * - Executive summary generation
 *
 * Stateless. No AI. No database. No side effects.
 * Plan changes are never made — only analysis and recommendations.
 */

import {
  PortfolioEngineInput,
  PortfolioEngineOutput,
  PortfolioHealthWeights,
  ProjectAtRisk,
} from './types';

/** Default portfolio health weights */
const DEFAULT_HEALTH_WEIGHTS: PortfolioHealthWeights = {
  w1: 0.25,
  w2: 0.25,
  w3: 0.25,
  w4: 0.25,
};

/**
 * Round to specified decimal places.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamp a value between 0 and 1.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Compute standard deviation.
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compute portfolio analysis.
 *
 * @param input - Array of project data and global constraints
 * @param weights - Optional portfolio health weight configuration
 * @returns Complete portfolio analysis output
 */
export function computePortfolio(
  input: PortfolioEngineInput,
  weights?: Partial<PortfolioHealthWeights>,
): PortfolioEngineOutput {
  const { projects, global_constraints } = input;
  const healthWeights: PortfolioHealthWeights = {
    ...DEFAULT_HEALTH_WEIGHTS,
    ...weights,
  };

  // Handle empty portfolio
  if (projects.length === 0) {
    return {
      portfolio_spi_avg: 0,
      portfolio_cpi_avg: 0,
      portfolio_risk_score: 0,
      resource_conflict_score: 0,
      aggregate_cash_flow: [],
      projects_at_risk: [],
      portfolio_health_score: 0,
      executive_summary: 'No projects in portfolio.',
    };
  }

  const n = projects.length;

  // 4.1 Average Performance
  const spiAvg = projects.reduce((sum, p) => sum + p.spi, 0) / n;
  const cpiAvg = projects.reduce((sum, p) => sum + p.cpi, 0) / n;

  // 4.2 Budget-weighted Risk
  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const portfolioRisk =
    totalBudget > 0
      ? projects.reduce((sum, p) => sum + p.risk_score * p.budget, 0) / totalBudget
      : 0;

  // 4.3 Resource Conflict Score
  let resourceConflict: number;
  if (global_constraints.total_resources > 0) {
    // RC = ΣDemand / TotalCapacity
    const totalDemand = projects.reduce((sum, p) => sum + p.resource_demand, 0);
    resourceConflict = totalDemand / global_constraints.total_resources;
  } else {
    // Fallback to std deviation of demands normalized
    const demands = projects.map((p) => p.resource_demand);
    const maxDemand = Math.max(...demands, 1);
    resourceConflict = standardDeviation(demands) / maxDemand;
  }

  // 4.4 Aggregate Cash Flow
  const maxPeriods = Math.max(
    ...projects.map((p) => p.cash_flow?.length ?? 0),
    0,
  );
  const aggregateCashFlow: number[] = [];
  for (let period = 0; period < maxPeriods; period++) {
    let periodTotal = 0;
    for (const project of projects) {
      if (project.cash_flow && period < project.cash_flow.length) {
        periodTotal += project.cash_flow[period];
      }
    }
    aggregateCashFlow.push(roundTo(periodTotal, 2));
  }

  // Projects at risk: those with risk_score > 0.5 or SPI < 0.9 or CPI < 0.9
  const projectsAtRisk: ProjectAtRisk[] = projects
    .filter((p) => p.risk_score > 0.5 || p.spi < 0.9 || p.cpi < 0.9)
    .map((p) => ({
      project_id: p.project_id,
      risk_score: p.risk_score,
      spi: p.spi,
      cpi: p.cpi,
      risk_exposure: roundTo(p.risk_score * p.budget, 2),
    }))
    .sort((a, b) => b.risk_score - a.risk_score);

  // Top 3 riskiest
  const topRiskProjects = projectsAtRisk.slice(0, 3);

  // Portfolio Health Score
  const phs =
    healthWeights.w1 * clamp01(spiAvg) +
    healthWeights.w2 * clamp01(cpiAvg) +
    healthWeights.w3 * clamp01(1 - portfolioRisk) +
    healthWeights.w4 * clamp01(1 - Math.min(resourceConflict, 1));

  // Executive Summary
  const summary = generateExecutiveSummary(
    n,
    spiAvg,
    cpiAvg,
    portfolioRisk,
    resourceConflict,
    topRiskProjects,
    phs,
    global_constraints.currency,
  );

  return {
    portfolio_spi_avg: roundTo(spiAvg, 4),
    portfolio_cpi_avg: roundTo(cpiAvg, 4),
    portfolio_risk_score: roundTo(portfolioRisk, 4),
    resource_conflict_score: roundTo(resourceConflict, 4),
    aggregate_cash_flow: aggregateCashFlow,
    projects_at_risk: topRiskProjects,
    portfolio_health_score: roundTo(phs, 4),
    executive_summary: summary,
  };
}

/**
 * Generate a deterministic executive summary string.
 */
function generateExecutiveSummary(
  projectCount: number,
  spiAvg: number,
  cpiAvg: number,
  portfolioRisk: number,
  resourceConflict: number,
  topRisk: ProjectAtRisk[],
  phs: number,
  currency: string,
): string {
  const parts: string[] = [];

  parts.push(`Portfolio: ${projectCount} project(s), Health Score: ${roundTo(phs, 2)}.`);

  // Schedule performance
  if (spiAvg >= 1.0) {
    parts.push(`Schedule: On-track (avg SPI ${roundTo(spiAvg, 2)}).`);
  } else if (spiAvg >= 0.9) {
    parts.push(`Schedule: Minor delay risk (avg SPI ${roundTo(spiAvg, 2)}).`);
  } else {
    parts.push(`Schedule: Significant delay (avg SPI ${roundTo(spiAvg, 2)}).`);
  }

  // Cost performance
  if (cpiAvg >= 1.0) {
    parts.push(`Cost: Under budget (avg CPI ${roundTo(cpiAvg, 2)}).`);
  } else if (cpiAvg >= 0.9) {
    parts.push(`Cost: Minor overrun risk (avg CPI ${roundTo(cpiAvg, 2)}).`);
  } else {
    parts.push(`Cost: Significant overrun (avg CPI ${roundTo(cpiAvg, 2)}).`);
  }

  // Resource conflict
  if (resourceConflict > 1.0) {
    parts.push(`Resources: Over-allocated (${roundTo(resourceConflict * 100, 0)}% utilization).`);
  } else if (resourceConflict > 0.85) {
    parts.push(`Resources: Near capacity (${roundTo(resourceConflict * 100, 0)}% utilization).`);
  }

  // Top risk projects
  if (topRisk.length > 0) {
    const riskIds = topRisk.map((p) => p.project_id).join(', ');
    const totalExposure = topRisk.reduce((sum, p) => sum + p.risk_exposure, 0);
    parts.push(
      `Top risk: ${riskIds}. Total risk exposure: ${currency} ${roundTo(totalExposure, 0).toLocaleString()}.`,
    );
  }

  return parts.join(' ');
}
