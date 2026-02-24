/**
 * @smartcon360/takt-engine
 *
 * Takt Deterministic Engine — V1
 * Pure mathematical takt grid computation, critical path, delay propagation.
 *
 * Stateless | No AI | No Database | Deterministic
 */

export { computeTaktGrid, applyDelayAndRecompute } from './takt-engine';

export type {
  TaktEngineInput,
  TaktEngineOutput,
  TaktLocation,
  TaktWagon,
  CellSchedule,
  DurationMap,
  DependencyMap,
  DelayInput,
} from './types';

export {
  TaktEngineError,
  CircularDependencyError,
  NegativeDurationError,
  MissingDependencyError,
  NullDurationError,
} from './errors';
