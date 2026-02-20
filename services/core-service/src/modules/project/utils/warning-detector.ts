/**
 * AI-3 Core: Algorithmic warning system.
 * Detects trade stacking, predecessor violations, and buffer warnings.
 * Layer 1 — no AI dependency, pure algorithmic detection.
 */

import {
  generateTaktGrid,
  detectTradeStacking,
  type ZoneInput,
  type WagonInput,
  type Assignment,
  type TradeStackingConflict,
} from './takt-calculator';

export interface PredecessorViolation {
  tradeCode: string;
  tradeName: string;
  predecessorCode: string;
  predecessorName: string;
  zoneName: string;
  zoneId: string;
  tradeStart: string;
  predecessorEnd: string;
  overlapDays: number;
}

export interface BufferWarning {
  trade1Code: string;
  trade1Name: string;
  trade2Code: string;
  trade2Name: string;
  bufferDays: number;
  recommendedBuffer: number;
  severity: 'critical' | 'warning';
}

export interface TradeInfo {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  predecessorCodes: string[];
}

export interface PlanWarnings {
  stackingConflicts: TradeStackingConflict[];
  predecessorViolations: PredecessorViolation[];
  bufferWarnings: BufferWarning[];
}

function detectPredecessorViolations(
  assignments: Assignment[],
  wagons: WagonInput[],
  zones: ZoneInput[],
  trades: TradeInfo[],
): PredecessorViolation[] {
  const violations: PredecessorViolation[] = [];

  const wagonTradeMap = new Map<string, TradeInfo>();
  for (const wagon of wagons) {
    const trade = trades.find((t) => t.id === wagon.tradeId);
    if (trade) wagonTradeMap.set(wagon.id, trade);
  }

  const tradeCodeToWagon = new Map<string, string>();
  for (const wagon of wagons) {
    const trade = wagonTradeMap.get(wagon.id);
    if (trade) tradeCodeToWagon.set(trade.code, wagon.id);
  }

  const zoneAssignments = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const list = zoneAssignments.get(a.zoneId) || [];
    list.push(a);
    zoneAssignments.set(a.zoneId, list);
  }

  const zoneNameMap = new Map(zones.map((z) => [z.id, z.name]));

  for (const [zoneId, zoneAssigns] of zoneAssignments) {
    for (const assignment of zoneAssigns) {
      const trade = wagonTradeMap.get(assignment.wagonId);
      if (!trade || trade.predecessorCodes.length === 0) continue;

      for (const predCode of trade.predecessorCodes) {
        const predWagonId = tradeCodeToWagon.get(predCode);
        if (!predWagonId) continue;

        const predAssignment = zoneAssigns.find((a) => a.wagonId === predWagonId);
        if (!predAssignment) continue;

        if (assignment.plannedStart < predAssignment.plannedEnd) {
          const overlapMs = predAssignment.plannedEnd.getTime() - assignment.plannedStart.getTime();
          const overlapDays = Math.ceil(overlapMs / (1000 * 60 * 60 * 24));

          const predTrade = wagonTradeMap.get(predWagonId);
          violations.push({
            tradeCode: trade.code,
            tradeName: trade.name,
            predecessorCode: predCode,
            predecessorName: predTrade?.name || predCode,
            zoneName: zoneNameMap.get(zoneId) || zoneId,
            zoneId,
            tradeStart: assignment.plannedStart.toISOString().split('T')[0],
            predecessorEnd: predAssignment.plannedEnd.toISOString().split('T')[0],
            overlapDays,
          });
        }
      }
    }
  }

  return violations;
}

function detectBufferWarnings(
  wagons: WagonInput[],
  trades: TradeInfo[],
  taktTime: number,
): BufferWarning[] {
  const warnings: BufferWarning[] = [];
  const sorted = [...wagons].sort((a, b) => a.sequence - b.sequence);
  const recommendedBuffer = taktTime <= 3 ? 1 : 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const w1 = sorted[i];
    const t1 = trades.find((t) => t.id === w1.tradeId);
    const w2 = sorted[i + 1];
    const t2 = trades.find((t) => t.id === w2.tradeId);

    if (!t1 || !t2) continue;

    const bufferTakts = w1.bufferAfter;
    const bufferDays = bufferTakts * taktTime;

    if (bufferDays === 0 && recommendedBuffer > 0) {
      warnings.push({
        trade1Code: t1.code,
        trade1Name: t1.name,
        trade2Code: t2.code,
        trade2Name: t2.name,
        bufferDays: 0,
        recommendedBuffer: recommendedBuffer * taktTime,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

/**
 * Run full plan validation.
 */
export function validatePlan(
  zones: ZoneInput[],
  wagons: WagonInput[],
  startDate: Date,
  taktTime: number,
  trades: TradeInfo[],
  workingDays: number[] = [1, 2, 3, 4, 5],
): PlanWarnings {
  const assignments = generateTaktGrid(zones, wagons, startDate, taktTime, workingDays);
  const stackingConflicts = detectTradeStacking(assignments);
  const predecessorViolations = detectPredecessorViolations(assignments, wagons, zones, trades);
  const bufferWarnings = detectBufferWarnings(wagons, trades, taktTime);

  return {
    stackingConflicts,
    predecessorViolations,
    bufferWarnings,
  };
}
