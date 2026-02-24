/**
 * EVM Engine — Type Definitions
 *
 * Pure data types for Earned Value Management computation.
 * No framework dependencies.
 */

/** Input to the EVM Engine */
export interface EvmEngineInput {
  /** Budget at Completion — total baseline budget */
  baseline_cost: number;
  /** Planned Value — budgeted cost of work scheduled */
  planned_value: number;
  /** Earned Value — budgeted cost of work performed */
  earned_value: number;
  /** Actual Cost — actual cost of work performed */
  actual_cost: number;
  /** Optional manual EAC override */
  estimate_at_completion?: number;
}

/** Output from the EVM Engine */
export interface EvmEngineOutput {
  /** Schedule Performance Index: EV / PV */
  spi: number;
  /** Cost Performance Index: EV / AC */
  cpi: number;
  /** Cost Variance: EV - AC */
  cv: number;
  /** Schedule Variance: EV - PV */
  sv: number;
  /** Estimate at Completion: BAC / CPI */
  eac: number;
  /** Estimate to Complete: EAC - AC */
  etc: number;
  /** Variance at Completion: BAC - EAC */
  vac: number;
  /** Project Health Score: weighted composite of SPI and CPI */
  project_health_score: number;
}

/** Configuration for PHS weights */
export interface PhsWeights {
  /** Weight for SPI in PHS (default 0.5) */
  w1: number;
  /** Weight for CPI in PHS (default 0.5) */
  w2: number;
}
