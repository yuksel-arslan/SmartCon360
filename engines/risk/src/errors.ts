/**
 * AI Risk Engine — Custom Errors
 */

export class RiskEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiskEngineError';
  }
}
