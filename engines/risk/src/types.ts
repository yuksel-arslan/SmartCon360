/**
 * AI Risk Engine — Type Definitions
 *
 * Pure data types for risk scoring computation.
 * No framework dependencies.
 */

/** CPM (Critical Path Method) metrics */
export interface CpmMetrics {
  /** Total float in days */
  total_float: number;
  /** Float threshold in days (default: 5) */
  float_threshold?: number;
  /** Number of critical path activities */
  critical_activities_count?: number;
}

/** EVM metrics for risk calculation */
export interface EvmMetrics {
  spi: number;
  cpi: number;
  cv: number;
  sv: number;
  /** Budget at Completion */
  budget: number;
}

/** Takt-specific metrics */
export interface TaktMetrics {
  /** Takt variance (normalized 0-1) */
  takt_variance: number;
  /** Number of stacking zones */
  stacking_zones_count?: number;
}

/** Project context for risk assessment */
export interface ProjectContext {
  /** Project phase (e.g., "design", "construction", "closeout") */
  phase: string;
  /** Contract type (e.g., "lump_sum", "unit_price") */
  contract_type: string;
  /** Resource load as utilization ratio (0-1) */
  resource_load: number;
  /** Historical velocity (normalized 0-1, where 1 = on-track) */
  historical_velocity: number;
}

/** Input to the Risk Engine */
export interface RiskEngineInput {
  cpm_metrics: CpmMetrics;
  evm_metrics: EvmMetrics;
  takt_metrics: TaktMetrics;
  project_context: ProjectContext;
}

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high';

/** A single explanation factor */
export interface RiskExplanation {
  /** Factor name */
  factor: string;
  /** Contribution to risk score (0-1) */
  contribution: number;
  /** Human-readable description */
  description: string;
}

/** Scenario suggestion when risk is high */
export interface RiskScenario {
  /** Scenario description */
  description: string;
  /** Estimated new finish date offset (days) */
  estimated_finish_delta: number;
  /** Estimated cost impact ratio */
  estimated_cost_impact: number;
  /** Expected risk reduction (0-1) */
  risk_reduction: number;
}

/** Output from the Risk Engine */
export interface RiskEngineOutput {
  delay_probability: number;
  cost_overrun_probability: number;
  composite_risk_score: number;
  confidence_score: number;
  risk_level: RiskLevel;
  explanation: RiskExplanation[];
  scenarios: RiskScenario[];
}

/** Configurable weights for risk scoring */
export interface RiskWeights {
  /** Delay probability weights */
  delay: {
    w1: number; // SPI factor
    w2: number; // Float factor
    w3: number; // Takt variance factor
    w4: number; // Resource instability factor
  };
  /** Cost overrun probability weights */
  cost: {
    w1: number; // CPI factor
    w2: number; // CV/Budget factor
  };
  /** Composite risk weights */
  composite: {
    alpha: number; // Delay weight
    beta: number;  // Cost weight
  };
}
