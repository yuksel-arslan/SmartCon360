/**
 * AI Risk Engine — Core Computation
 *
 * Deterministic risk scoring with explainable output.
 * - Delay probability from SPI, float, takt variance, resource stability
 * - Cost overrun probability from CPI, CV/Budget
 * - Composite risk score with configurable weights
 * - Confidence scoring based on data completeness
 * - Scenario generation for high-risk situations
 *
 * Stateless. Deterministic. Explainable. No side effects.
 * AI ONLY RECOMMENDS — never modifies plans.
 */

import {
  RiskEngineInput,
  RiskEngineOutput,
  RiskWeights,
  RiskLevel,
  RiskExplanation,
  RiskScenario,
} from './types';

/** Default weights per specification */
const DEFAULT_WEIGHTS: RiskWeights = {
  delay: { w1: 0.30, w2: 0.25, w3: 0.25, w4: 0.20 },
  cost: { w1: 0.60, w2: 0.40 },
  composite: { alpha: 0.60, beta: 0.40 },
};

/** Model version for tracking */
const MODEL_VERSION = 'risk-engine-v1.0.0';

/**
 * Clamp a value between 0 and 1.
 */
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Round to specified decimals.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Determine risk level from composite score.
 */
function scoreToLevel(score: number): RiskLevel {
  if (score < 0.4) return 'low';
  if (score < 0.7) return 'medium';
  return 'high';
}

/**
 * Calculate data completeness from the input.
 * Measures how many fields have meaningful (non-default) data.
 */
function calculateDataCompleteness(input: RiskEngineInput): number {
  let available = 0;
  let total = 0;

  // CPM metrics
  total++;
  if (input.cpm_metrics.total_float !== undefined) available++;
  total++;
  if (input.cpm_metrics.critical_activities_count !== undefined) available++;

  // EVM metrics
  const evmFields = ['spi', 'cpi', 'cv', 'sv', 'budget'] as const;
  for (const field of evmFields) {
    total++;
    if (input.evm_metrics[field] !== undefined && input.evm_metrics[field] !== null) available++;
  }

  // Takt metrics
  total++;
  if (input.takt_metrics.takt_variance !== undefined) available++;
  total++;
  if (input.takt_metrics.stacking_zones_count !== undefined) available++;

  // Project context
  total++;
  if (input.project_context.phase) available++;
  total++;
  if (input.project_context.contract_type) available++;
  total++;
  if (input.project_context.resource_load !== undefined) available++;
  total++;
  if (input.project_context.historical_velocity !== undefined) available++;

  return total > 0 ? available / total : 0;
}

/**
 * Calculate model stability (fixed for V1 deterministic engine).
 */
function calculateModelStability(): number {
  return 0.95; // Deterministic model has high stability
}

/**
 * Calculate delay probability.
 *
 * P(delay) = w1*(1-SPI) + w2*(1-min(Float/Threshold, 1)) + w3*TaktVariance + w4*ResourceInstability
 */
function calculateDelayProbability(
  input: RiskEngineInput,
  weights: RiskWeights,
): { probability: number; factors: RiskExplanation[] } {
  const { cpm_metrics, evm_metrics, takt_metrics, project_context } = input;
  const { w1, w2, w3, w4 } = weights.delay;

  const floatThreshold = cpm_metrics.float_threshold ?? 5;

  // Factor 1: SPI deviation
  const spiContribution = clamp01(1 - evm_metrics.spi);
  const spiWeighted = w1 * spiContribution;

  // Factor 2: Float shortage
  const floatRatio = floatThreshold > 0
    ? Math.min(cpm_metrics.total_float / floatThreshold, 1)
    : 1;
  const floatContribution = clamp01(1 - floatRatio);
  const floatWeighted = w2 * floatContribution;

  // Factor 3: Takt variance
  const taktContribution = clamp01(takt_metrics.takt_variance);
  const taktWeighted = w3 * taktContribution;

  // Factor 4: Resource instability (inverse of historical velocity)
  const resourceInstability = clamp01(1 - project_context.historical_velocity);
  const resourceWeighted = w4 * resourceInstability;

  const probability = clamp01(spiWeighted + floatWeighted + taktWeighted + resourceWeighted);

  const factors: RiskExplanation[] = [
    {
      factor: 'SPI Deviation',
      contribution: roundTo(spiWeighted, 4),
      description: `SPI = ${evm_metrics.spi.toFixed(3)}, deviation contribution = ${roundTo(spiContribution, 3)}`,
    },
    {
      factor: 'Float Shortage',
      contribution: roundTo(floatWeighted, 4),
      description: `Float = ${cpm_metrics.total_float} days (threshold: ${floatThreshold}), shortage contribution = ${roundTo(floatContribution, 3)}`,
    },
    {
      factor: 'Takt Variance',
      contribution: roundTo(taktWeighted, 4),
      description: `Takt variance = ${takt_metrics.takt_variance.toFixed(3)}, contribution = ${roundTo(taktContribution, 3)}`,
    },
    {
      factor: 'Resource Instability',
      contribution: roundTo(resourceWeighted, 4),
      description: `Historical velocity = ${project_context.historical_velocity.toFixed(3)}, instability = ${roundTo(resourceInstability, 3)}`,
    },
  ];

  // Sort by contribution descending
  factors.sort((a, b) => b.contribution - a.contribution);

  return { probability: roundTo(probability, 4), factors };
}

/**
 * Calculate cost overrun probability.
 *
 * P(cost) = w1*(1-CPI) + w2*(|CV| / Budget)
 */
function calculateCostOverrunProbability(
  input: RiskEngineInput,
  weights: RiskWeights,
): { probability: number; factors: RiskExplanation[] } {
  const { evm_metrics } = input;
  const { w1, w2 } = weights.cost;

  // Factor 1: CPI deviation
  const cpiContribution = clamp01(1 - evm_metrics.cpi);
  const cpiWeighted = w1 * cpiContribution;

  // Factor 2: CV relative to budget
  const cvRatio = evm_metrics.budget > 0
    ? Math.abs(evm_metrics.cv) / evm_metrics.budget
    : 0;
  const cvContribution = clamp01(cvRatio);
  const cvWeighted = w2 * cvContribution;

  const probability = clamp01(cpiWeighted + cvWeighted);

  const factors: RiskExplanation[] = [
    {
      factor: 'CPI Deviation',
      contribution: roundTo(cpiWeighted, 4),
      description: `CPI = ${evm_metrics.cpi.toFixed(3)}, deviation contribution = ${roundTo(cpiContribution, 3)}`,
    },
    {
      factor: 'Cost Variance Ratio',
      contribution: roundTo(cvWeighted, 4),
      description: `|CV| / Budget = ${roundTo(cvRatio, 4)}, contribution = ${roundTo(cvContribution, 3)}`,
    },
  ];

  factors.sort((a, b) => b.contribution - a.contribution);

  return { probability: roundTo(probability, 4), factors };
}

/**
 * Generate scenario suggestions when risk is elevated.
 */
function generateScenarios(
  input: RiskEngineInput,
  delayProbability: number,
  costProbability: number,
  compositeScore: number,
): RiskScenario[] {
  if (compositeScore < 0.4) return [];

  const scenarios: RiskScenario[] = [];

  // Scenario 1: Add buffer / extend schedule
  if (delayProbability > 0.3) {
    const bufferDays = Math.ceil(input.cpm_metrics.total_float * 0.5) + 5;
    scenarios.push({
      description: `Add ${bufferDays}-day buffer to critical path activities and increase monitoring frequency`,
      estimated_finish_delta: bufferDays,
      estimated_cost_impact: roundTo(bufferDays * 0.002, 4),
      risk_reduction: roundTo(Math.min(delayProbability * 0.4, 0.3), 4),
    });
  }

  // Scenario 2: Resource reallocation
  if (input.project_context.resource_load > 0.8 || delayProbability > 0.5) {
    scenarios.push({
      description: 'Reallocate resources from non-critical to critical activities; consider additional crew mobilization',
      estimated_finish_delta: -3,
      estimated_cost_impact: roundTo(0.05, 4),
      risk_reduction: roundTo(Math.min(delayProbability * 0.3, 0.25), 4),
    });
  }

  // Scenario 3: Cost control
  if (costProbability > 0.3) {
    scenarios.push({
      description: 'Implement strict cost control measures, renegotiate subcontractor terms, review procurement strategy',
      estimated_finish_delta: 0,
      estimated_cost_impact: roundTo(-costProbability * 0.15, 4),
      risk_reduction: roundTo(Math.min(costProbability * 0.35, 0.25), 4),
    });
  }

  // Ensure at least 2 scenarios for high risk
  if (compositeScore >= 0.7 && scenarios.length < 2) {
    scenarios.push({
      description: 'Escalate to project governance board; request schedule and budget re-baselining',
      estimated_finish_delta: 10,
      estimated_cost_impact: roundTo(0.08, 4),
      risk_reduction: roundTo(0.2, 4),
    });
  }

  return scenarios;
}

/**
 * Compute risk assessment from combined engine metrics.
 *
 * @param input - CPM, EVM, Takt metrics and project context
 * @param weights - Optional risk weight configuration
 * @returns Complete risk assessment with explainable output
 */
export function computeRisk(
  input: RiskEngineInput,
  weights?: Partial<RiskWeights>,
): RiskEngineOutput {
  const resolvedWeights: RiskWeights = {
    delay: { ...DEFAULT_WEIGHTS.delay, ...weights?.delay },
    cost: { ...DEFAULT_WEIGHTS.cost, ...weights?.cost },
    composite: { ...DEFAULT_WEIGHTS.composite, ...weights?.composite },
  };

  // Calculate delay probability
  const delayResult = calculateDelayProbability(input, resolvedWeights);

  // Calculate cost overrun probability
  const costResult = calculateCostOverrunProbability(input, resolvedWeights);

  // Composite risk score
  const { alpha, beta } = resolvedWeights.composite;
  const compositeScore = clamp01(
    alpha * delayResult.probability + beta * costResult.probability,
  );

  // Confidence score
  const dataCompleteness = calculateDataCompleteness(input);
  const modelStability = calculateModelStability();
  const confidenceScore = roundTo(dataCompleteness * modelStability, 4);

  // Risk level
  const riskLevel = scoreToLevel(compositeScore);

  // Combined explanation (top 3 factors)
  const allFactors = [...delayResult.factors, ...costResult.factors];
  allFactors.sort((a, b) => b.contribution - a.contribution);
  const topFactors = allFactors.slice(0, 3);

  // Generate scenarios
  const scenarios = generateScenarios(
    input,
    delayResult.probability,
    costResult.probability,
    compositeScore,
  );

  return {
    delay_probability: delayResult.probability,
    cost_overrun_probability: costResult.probability,
    composite_risk_score: roundTo(compositeScore, 4),
    confidence_score: confidenceScore,
    risk_level: riskLevel,
    explanation: topFactors,
    scenarios,
  };
}
