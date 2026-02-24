/**
 * Takt Engine — Custom Errors
 */

export class TaktEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaktEngineError';
  }
}

export class CircularDependencyError extends TaktEngineError {
  constructor(details?: string) {
    super(`Circular dependency detected${details ? ': ' + details : ''}`);
    this.name = 'CircularDependencyError';
  }
}

export class NegativeDurationError extends TaktEngineError {
  constructor(cellKey: string, duration: number) {
    super(`Negative duration (${duration}) for cell ${cellKey}`);
    this.name = 'NegativeDurationError';
  }
}

export class MissingDependencyError extends TaktEngineError {
  constructor(cellKey: string, missingDep: string) {
    super(`Missing dependency: cell ${cellKey} depends on non-existent cell ${missingDep}`);
    this.name = 'MissingDependencyError';
  }
}

export class NullDurationError extends TaktEngineError {
  constructor(cellKey: string) {
    super(`Null or undefined duration for cell ${cellKey}`);
    this.name = 'NullDurationError';
  }
}
