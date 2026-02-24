/**
 * @smartcon360/portfolio-engine
 *
 * Portfolio Intelligence Engine (PIE) — V1
 * Multi-project portfolio analysis and program-level KPIs.
 *
 * Stateless | Deterministic | No AI | No Database
 * Plan changes are never made — only analysis and recommendations.
 */

export { computePortfolio } from './portfolio-engine';

export type {
  PortfolioEngineInput,
  PortfolioEngineOutput,
  PortfolioProject,
  GlobalConstraints,
  ProjectAtRisk,
  PortfolioHealthWeights,
} from './types';

export { PortfolioEngineError } from './errors';
