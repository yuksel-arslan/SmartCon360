/**
 * EVM Deterministic Engine — Core Computation
 *
 * Earned Value Management calculations per PMI PMBOK Guide.
 * - SPI, CPI, CV, SV
 * - EAC, ETC, VAC
 * - Project Health Score (composite metric)
 *
 * Stateless. No AI. No database. No side effects.
 */

import { EvmEngineInput, EvmEngineOutput, PhsWeights } from './types';
import { ZeroDivisionError, NegativeValueError, NullInputError } from './errors';

/** Default PHS weights */
const DEFAULT_PHS_WEIGHTS: PhsWeights = { w1: 0.5, w2: 0.5 };

/**
 * Validate EVM input values.
 */
function validateInput(input: EvmEngineInput): void {
  const requiredFields: Array<{ name: string; value: unknown }> = [
    { name: 'baseline_cost', value: input.baseline_cost },
    { name: 'planned_value', value: input.planned_value },
    { name: 'earned_value', value: input.earned_value },
    { name: 'actual_cost', value: input.actual_cost },
  ];

  for (const field of requiredFields) {
    if (field.value === null || field.value === undefined) {
      throw new NullInputError(field.name);
    }
    if (typeof field.value !== 'number' || isNaN(field.value as number)) {
      throw new NullInputError(field.name);
    }
    if ((field.value as number) < 0) {
      throw new NegativeValueError(field.name, field.value as number);
    }
  }

  if (input.baseline_cost === 0) {
    throw new ZeroDivisionError('baseline_cost (BAC)');
  }
  if (input.planned_value === 0) {
    throw new ZeroDivisionError('planned_value (PV)');
  }
  if (input.actual_cost === 0) {
    throw new ZeroDivisionError('actual_cost (AC)');
  }
}

/**
 * Compute EVM metrics from input values.
 *
 * @param input - EVM input (BAC, PV, EV, AC)
 * @param weights - Optional PHS weight configuration
 * @returns Complete EVM metrics output
 */
export function computeEvm(
  input: EvmEngineInput,
  weights?: Partial<PhsWeights>,
): EvmEngineOutput {
  validateInput(input);

  const { baseline_cost: bac, planned_value: pv, earned_value: ev, actual_cost: ac } = input;
  const phsWeights: PhsWeights = { ...DEFAULT_PHS_WEIGHTS, ...weights };

  // Core indices
  const spi = ev / pv;
  const cpi = ev / ac;

  // Variances
  const cv = ev - ac;
  const sv = ev - pv;

  // Forecasting
  let eac: number;
  if (input.estimate_at_completion !== undefined && input.estimate_at_completion !== null) {
    eac = input.estimate_at_completion;
  } else {
    eac = bac / cpi;
  }

  const etc = eac - ac;
  const vac = bac - eac;

  // Project Health Score
  const phs = phsWeights.w1 * spi + phsWeights.w2 * cpi;

  return {
    spi: roundTo(spi, 4),
    cpi: roundTo(cpi, 4),
    cv: roundTo(cv, 2),
    sv: roundTo(sv, 2),
    eac: roundTo(eac, 2),
    etc: roundTo(etc, 2),
    vac: roundTo(vac, 2),
    project_health_score: roundTo(phs, 4),
  };
}

/**
 * Compute EVM for multiple periods (batch).
 *
 * @param inputs - Array of EVM inputs
 * @param weights - Optional PHS weight configuration
 * @returns Array of EVM outputs
 */
export function computeEvmBatch(
  inputs: EvmEngineInput[],
  weights?: Partial<PhsWeights>,
): EvmEngineOutput[] {
  return inputs.map((input) => computeEvm(input, weights));
}

/**
 * Round a number to specified decimal places.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
