/**
 * @smartcon360/evm-engine
 *
 * EVM Deterministic Engine — V1
 * Earned Value Management computation per PMI PMBOK Guide.
 *
 * Stateless | No AI | No Database | Deterministic
 */

export { computeEvm, computeEvmBatch } from './evm-engine';

export type {
  EvmEngineInput,
  EvmEngineOutput,
  PhsWeights,
} from './types';

export {
  EvmEngineError,
  ZeroDivisionError,
  NegativeValueError,
  NullInputError,
} from './errors';
