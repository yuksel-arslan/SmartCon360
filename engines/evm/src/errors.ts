/**
 * EVM Engine — Custom Errors
 */

export class EvmEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvmEngineError';
  }
}

export class ZeroDivisionError extends EvmEngineError {
  constructor(field: string) {
    super(`Division by zero: ${field} cannot be zero`);
    this.name = 'ZeroDivisionError';
  }
}

export class NegativeValueError extends EvmEngineError {
  constructor(field: string, value: number) {
    super(`Negative value not allowed: ${field} = ${value}`);
    this.name = 'NegativeValueError';
  }
}

export class NullInputError extends EvmEngineError {
  constructor(field: string) {
    super(`Null or undefined input: ${field}`);
    this.name = 'NullInputError';
  }
}
