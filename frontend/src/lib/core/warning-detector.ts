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

// ── Types ──

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

export interface AutoDetectedConstraint {
  title: string;
  description: string;
  category: 'space' | 'predecessor';
  priority: 'critical' | 'high' | 'medium';
  tradeCode: string;
  zoneName: string;
  source: 'auto-detected';
}

export interface PlanWarnings {
  stackingConflicts: TradeStackingConflict[];
  predecessorViolations: PredecessorViolation[];
  bufferWarnings: BufferWarning[];
  autoConstraints: AutoDetectedConstraint[];
}

// ── Trade info needed for detection ──

export interface TradeInfo {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  predecessorCodes: string[];
}

// ── Detection Functions ──

/**
 * Detect predecessor violations: trade starts in a zone before
 * its predecessor finishes in the same zone.
 */
export function detectPredecessorViolations(
  assignments: Assignment[],
  wagons: WagonInput[],
  zones: ZoneInput[],
  trades: TradeInfo[],
): PredecessorViolation[] {
  const violations: PredecessorViolation[] = [];

  // Build wagon→trade mapping
  const wagonTradeMap = new Map<string, TradeInfo>();
  for (const wagon of wagons) {
    const trade = trades.find((t) => t.id === wagon.tradeId);
    if (trade) wagonTradeMap.set(wagon.id, trade);
  }

  // Build trade code → wagon id mapping
  const tradeCodeToWagon = new Map<string, string>();
  for (const wagon of wagons) {
    const trade = wagonTradeMap.get(wagon.id);
    if (trade) tradeCodeToWagon.set(trade.code, wagon.id);
  }

  // Group assignments by zone
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

        // Violation: trade starts before predecessor ends
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

/**
 * Detect buffer warnings: gaps between consecutive trades
 * that are too small for reliable execution.
 */
export function detectBufferWarnings(
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
 * Run full plan validation and generate auto-detected constraints.
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

  // Generate auto-detected constraints from findings
  const autoConstraints: AutoDetectedConstraint[] = [];

  for (const conflict of stackingConflicts) {
    const t1 = trades.find((t) => t.id === wagons.find((w) => w.id === conflict.wagon1)?.tradeId);
    const t2 = trades.find((t) => t.id === wagons.find((w) => w.id === conflict.wagon2)?.tradeId);
    const zone = zones.find((z) => z.id === conflict.zoneId);

    autoConstraints.push({
      title: `Trade stacking: ${t1?.name || conflict.wagon1} & ${t2?.name || conflict.wagon2}`,
      description: `Trades overlap in ${zone?.name || conflict.zoneId} from ${conflict.overlapStart} to ${conflict.overlapEnd}. Reschedule or add buffer to prevent stacking.`,
      category: 'space',
      priority: 'critical',
      tradeCode: t1?.code || '',
      zoneName: zone?.name || '',
      source: 'auto-detected',
    });
  }

  for (const violation of predecessorViolations) {
    autoConstraints.push({
      title: `Predecessor violation: ${violation.tradeName} starts before ${violation.predecessorName}`,
      description: `${violation.tradeName} starts on ${violation.tradeStart} but ${violation.predecessorName} finishes on ${violation.predecessorEnd} in ${violation.zoneName}. ${violation.overlapDays} day(s) overlap.`,
      category: 'predecessor',
      priority: 'high',
      tradeCode: violation.tradeCode,
      zoneName: violation.zoneName,
      source: 'auto-detected',
    });
  }

  return {
    stackingConflicts,
    predecessorViolations,
    bufferWarnings,
    autoConstraints,
  };
}
