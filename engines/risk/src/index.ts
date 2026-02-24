/**
 * @smartcon360/risk-engine
 *
 * AI Risk Engine — V1
 * Deterministic risk scoring with explainable output.
 * Delay probability, cost overrun probability, composite risk score.
 *
 * Stateless | Deterministic | Explainable | No Side Effects
 * AI ONLY RECOMMENDS — never modifies plans.
 */

export { computeRisk } from './risk-engine';

export type {
  RiskEngineInput,
  RiskEngineOutput,
  RiskWeights,
  RiskLevel,
  RiskExplanation,
  RiskScenario,
  CpmMetrics,
  EvmMetrics,
  TaktMetrics,
  ProjectContext,
} from './types';

export { RiskEngineError } from './errors';
