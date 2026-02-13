export function generateCode(prefix: string, num: number, pad = 3): string {
  return `${prefix}-${String(num).padStart(pad, '0')}`;
}
export function buildLocationPath(parentPath: string | null, code: string): string {
  return parentPath ? `${parentPath}/${code}` : `/${code}`;
}
export function calculateTotalPeriods(zones: number, trades: number, bufferSize = 0): number {
  return zones + trades - 1 + bufferSize * (trades - 1);
}
