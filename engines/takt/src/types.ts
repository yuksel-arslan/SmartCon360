/**
 * Takt Deterministic Engine — Type Definitions
 *
 * Pure data types for takt grid computation.
 * No framework dependencies.
 */

/** A physical location (zone) in the project */
export interface TaktLocation {
  id: string;
  name: string;
  sequence: number;
}

/** A wagon (trade) that flows through locations */
export interface TaktWagon {
  id: string;
  name: string;
  sequence: number;
}

/** Duration map: key is "locationIndex,wagonIndex" → duration in days */
export type DurationMap = Record<string, number>;

/** Dependency map: key is "locationIndex,wagonIndex" → array of predecessor keys */
export type DependencyMap = Record<string, string[]>;

/** Input to the Takt Engine */
export interface TaktEngineInput {
  locations: TaktLocation[];
  wagons: TaktWagon[];
  durations: DurationMap;
  dependencies: DependencyMap;
}

/** A single scheduled cell in the takt grid */
export interface CellSchedule {
  locationIndex: number;
  wagonIndex: number;
  locationId: string;
  wagonId: string;
  start: number;
  finish: number;
  duration: number;
  isCritical: boolean;
}

/** Output from the Takt Engine */
export interface TaktEngineOutput {
  project_finish_date: number;
  cell_schedule: CellSchedule[];
  critical_cells: string[];
  total_takt_variance: number;
}

/** Input for delay propagation */
export interface DelayInput {
  locationIndex: number;
  wagonIndex: number;
  delayDays: number;
}
