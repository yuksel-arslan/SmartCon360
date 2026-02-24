/**
 * Portfolio Intelligence Engine — Type Definitions
 *
 * Pure data types for multi-project portfolio analysis.
 * No framework dependencies.
 */

/** Individual project data for portfolio analysis */
export interface PortfolioProject {
  project_id: string;
  spi: number;
  cpi: number;
  risk_score: number;
  planned_finish: string;
  budget: number;
  resource_demand: number;
  /** Optional cash flow per period */
  cash_flow?: number[];
}

/** Global constraints for the portfolio */
export interface GlobalConstraints {
  total_resources: number;
  currency: string;
  reporting_period: string;
}

/** Input to the Portfolio Engine */
export interface PortfolioEngineInput {
  projects: PortfolioProject[];
  global_constraints: GlobalConstraints;
}

/** A project identified as at-risk */
export interface ProjectAtRisk {
  project_id: string;
  risk_score: number;
  spi: number;
  cpi: number;
  risk_exposure: number;
}

/** Output from the Portfolio Engine */
export interface PortfolioEngineOutput {
  portfolio_spi_avg: number;
  portfolio_cpi_avg: number;
  portfolio_risk_score: number;
  resource_conflict_score: number;
  aggregate_cash_flow: number[];
  projects_at_risk: ProjectAtRisk[];
  portfolio_health_score: number;
  executive_summary: string;
}

/** Configurable weights for portfolio health score */
export interface PortfolioHealthWeights {
  w1: number; // SPI avg weight
  w2: number; // CPI avg weight
  w3: number; // (1 - PortfolioRisk) weight
  w4: number; // (1 - ResourceConflict) weight
}
