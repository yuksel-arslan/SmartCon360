/**
 * Portfolio Intelligence Engine — Custom Errors
 */

export class PortfolioEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortfolioEngineError';
  }
}
