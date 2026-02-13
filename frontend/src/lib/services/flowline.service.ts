/**
 * Flowline computation service.
 * Ported from flowline-service/src/index.ts
 */

import { v4 as uuidv4 } from 'uuid';

// ── Types ──

export interface Zone {
  id: string;
  name: string;
  yIndex: number;
}

export interface Segment {
  zoneIndex: number;
  xStart: number;
  xEnd: number;
  y: number;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
}

export interface Wagon {
  tradeId: string;
  tradeName: string;
  color: string;
  segments: Segment[];
}

export interface FlowlineData {
  planId: string;
  zones: Zone[];
  wagons: Wagon[];
  todayX: number;
  totalPeriods: number;
  taktTime: number;
  bufferSize: number;
}

export interface BufferData {
  planId: string;
  buffers: {
    between: [string, string];
    size: number;
    consumed: number;
    status: 'healthy' | 'warning' | 'critical';
  }[];
}

// ── In-memory store (Phase 1) ──

const flowlineDb: Record<string, FlowlineData> = {};

// ── Computation Engine ──

export function computeFlowline(
  zones: { name: string }[],
  trades: { name: string; color: string; durationDays: number }[],
  taktTime: number,
  bufferSize: number
): Omit<FlowlineData, 'planId'> {
  const zoneList: Zone[] = zones.map((z, i) => ({
    id: uuidv4(),
    name: z.name,
    yIndex: i,
  }));

  const totalPeriods = zones.length + trades.length - 1 + (trades.length - 1) * bufferSize;
  const todayPeriod = Math.floor(totalPeriods * 0.45);

  const wagons: Wagon[] = trades.map((trade, tradeIdx) => {
    const tradeOffset = tradeIdx * (1 + bufferSize);
    const segments: Segment[] = zoneList.map((zone, zoneIdx) => {
      const xStart = tradeOffset + zoneIdx * taktTime;
      const xEnd = xStart + taktTime;

      let status: Segment['status'] = 'planned';
      if (xEnd <= todayPeriod) status = 'completed';
      else if (xStart <= todayPeriod && xEnd > todayPeriod) status = 'in_progress';

      return { zoneIndex: zoneIdx, xStart, xEnd, y: zoneIdx, status };
    });

    return {
      tradeId: uuidv4(),
      tradeName: trade.name,
      color: trade.color,
      segments,
    };
  });

  return { zones: zoneList, wagons, todayX: todayPeriod, totalPeriods, taktTime, bufferSize };
}

export function computeBuffers(data: FlowlineData): BufferData {
  const buffers = [];
  for (let i = 0; i < data.wagons.length - 1; i++) {
    const current = data.wagons[i];
    const next = data.wagons[i + 1];

    const currentMaxEnd = Math.max(...current.segments.map((s) => s.xEnd));
    const nextMinStart = Math.min(...next.segments.map((s) => s.xStart));
    const gap = nextMinStart - currentMaxEnd;

    const consumed = Math.max(0, data.bufferSize - gap);
    const ratio = data.bufferSize > 0 ? consumed / data.bufferSize : 0;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (ratio > 0.7) status = 'critical';
    else if (ratio > 0.3) status = 'warning';

    buffers.push({
      between: [current.tradeName, next.tradeName] as [string, string],
      size: data.bufferSize,
      consumed,
      status,
    });
  }

  return { planId: data.planId, buffers };
}

// ── Store Operations ──

export function getFlowline(planId: string): FlowlineData | undefined {
  return flowlineDb[planId];
}

export function saveFlowline(planId: string, data: FlowlineData): void {
  flowlineDb[planId] = data;
}

export function deleteFlowline(planId: string): void {
  delete flowlineDb[planId];
}

// ── Seed Demo Data ──

const demoZones = [
  { name: 'Zone A — Ground Floor' },
  { name: 'Zone B — 1st Floor' },
  { name: 'Zone C — 2nd Floor' },
  { name: 'Zone D — 3rd Floor' },
  { name: 'Zone E — 4th Floor' },
  { name: 'Zone F — 5th Floor' },
];

const demoTrades = [
  { name: 'Structure', color: '#3B82F6', durationDays: 5 },
  { name: 'MEP Rough', color: '#8B5CF6', durationDays: 5 },
  { name: 'Drywall', color: '#F59E0B', durationDays: 5 },
  { name: 'MEP Finish', color: '#06B6D4', durationDays: 5 },
  { name: 'Flooring', color: '#10B981', durationDays: 5 },
  { name: 'Paint', color: '#EC4899', durationDays: 5 },
  { name: 'Finishes', color: '#F97316', durationDays: 5 },
];

const demoFlowline = computeFlowline(demoZones, demoTrades, 1, 1);
flowlineDb['demo-plan-001'] = { planId: 'demo-plan-001', ...demoFlowline };
