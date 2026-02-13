import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '3003', 10);
const logger = pino({ transport: { target: 'pino-pretty' } });

app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Types ──────────────────────────────────────────────
interface Zone {
  id: string;
  name: string;
  y_index: number;
}

interface Segment {
  zone_index: number;
  x_start: number;
  x_end: number;
  y: number;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
}

interface Wagon {
  trade_id: string;
  trade_name: string;
  color: string;
  segments: Segment[];
}

interface FlowlineData {
  plan_id: string;
  zones: Zone[];
  wagons: Wagon[];
  today_x: number;
  total_periods: number;
  takt_time: number;
  buffer_size: number;
}

interface BufferData {
  plan_id: string;
  buffers: {
    between: [string, string];
    size: number;
    consumed: number;
    status: 'healthy' | 'warning' | 'critical';
  }[];
}

// ── In-memory store (Phase 1) ──────────────────────────
const flowlineDb: Record<string, FlowlineData> = {};

// ── Flowline computation engine ────────────────────────
function computeFlowline(
  zones: { name: string }[],
  trades: { name: string; color: string; duration_days: number }[],
  taktTime: number,
  bufferSize: number
): Omit<FlowlineData, 'plan_id'> {
  const zoneList: Zone[] = zones.map((z, i) => ({
    id: uuidv4(),
    name: z.name,
    y_index: i,
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

      return {
        zone_index: zoneIdx,
        x_start: xStart,
        x_end: xEnd,
        y: zoneIdx,
        status,
      };
    });

    return {
      trade_id: uuidv4(),
      trade_name: trade.name,
      color: trade.color,
      segments,
    };
  });

  return {
    zones: zoneList,
    wagons,
    today_x: todayPeriod,
    total_periods: totalPeriods,
    takt_time: taktTime,
    buffer_size: bufferSize,
  };
}

function computeBuffers(data: FlowlineData): BufferData {
  const buffers = [];
  for (let i = 0; i < data.wagons.length - 1; i++) {
    const current = data.wagons[i];
    const next = data.wagons[i + 1];

    const currentMaxEnd = Math.max(...current.segments.map(s => s.x_end));
    const nextMinStart = Math.min(...next.segments.map(s => s.x_start));
    const gap = nextMinStart - currentMaxEnd;

    const consumed = Math.max(0, data.buffer_size - gap);
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (consumed / data.buffer_size > 0.7) status = 'critical';
    else if (consumed / data.buffer_size > 0.3) status = 'warning';

    buffers.push({
      between: [current.trade_name, next.trade_name] as [string, string],
      size: data.buffer_size,
      consumed,
      status,
    });
  }

  return { plan_id: data.plan_id, buffers };
}

// ── Seed demo data ─────────────────────────────────────
const demoZones = [
  { name: 'Zone A — Ground Floor' },
  { name: 'Zone B — 1st Floor' },
  { name: 'Zone C — 2nd Floor' },
  { name: 'Zone D — 3rd Floor' },
  { name: 'Zone E — 4th Floor' },
  { name: 'Zone F — 5th Floor' },
];

const demoTrades = [
  { name: 'Structure', color: '#3B82F6', duration_days: 5 },
  { name: 'MEP Rough', color: '#8B5CF6', duration_days: 5 },
  { name: 'Drywall', color: '#F59E0B', duration_days: 5 },
  { name: 'MEP Finish', color: '#06B6D4', duration_days: 5 },
  { name: 'Flooring', color: '#10B981', duration_days: 5 },
  { name: 'Paint', color: '#EC4899', duration_days: 5 },
  { name: 'Finishes', color: '#F97316', duration_days: 5 },
];

const demoFlowline = computeFlowline(demoZones, demoTrades, 1, 1);
const demoPlanId = 'demo-plan-001';
flowlineDb[demoPlanId] = { plan_id: demoPlanId, ...demoFlowline };

// ── Routes ─────────────────────────────────────────────

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'flowline-service', timestamp: new Date().toISOString() });
});

// GET /flowline/:planId — Flowline data for visualization
app.get('/flowline/:planId', (req, res) => {
  const { planId } = req.params;
  const data = flowlineDb[planId];

  if (!data) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Plan ${planId} not found` } });
    return;
  }

  res.json({ data });
});

// POST /flowline/compute — Compute flowline from plan params
app.post('/flowline/compute', (req, res) => {
  const { zones, trades, takt_time = 1, buffer_size = 1 } = req.body;

  if (!zones?.length || !trades?.length) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'zones and trades are required' } });
    return;
  }

  const planId = uuidv4();
  const flowline = computeFlowline(zones, trades, takt_time, buffer_size);
  flowlineDb[planId] = { plan_id: planId, ...flowline };

  res.status(201).json({ data: flowlineDb[planId] });
});

// GET /flowline/:planId/buffers — Buffer status
app.get('/flowline/:planId/buffers', (req, res) => {
  const data = flowlineDb[req.params.planId];
  if (!data) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    return;
  }

  res.json({ data: computeBuffers(data) });
});

// GET /flowline/:planId/comparison — Planned vs actual (mock for Phase 1)
app.get('/flowline/:planId/comparison', (req, res) => {
  const data = flowlineDb[req.params.planId];
  if (!data) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    return;
  }

  const actual = data.wagons.map(w => ({
    trade_name: w.trade_name,
    segments: w.segments.map(s => ({
      ...s,
      x_start_actual: s.status === 'completed' ? s.x_start : s.x_start + Math.random() * 0.5,
      x_end_actual: s.status === 'completed' ? s.x_end : s.x_end + Math.random() * 0.8,
    })),
  }));

  res.json({ data: { plan_id: data.plan_id, planned: data.wagons, actual } });
});

// GET /flowline/:planId/critical-path
app.get('/flowline/:planId/critical-path', (req, res) => {
  const data = flowlineDb[req.params.planId];
  if (!data) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    return;
  }

  const criticalTrades = data.wagons
    .filter(w => w.segments.some(s => s.status === 'delayed' || s.status === 'in_progress'))
    .map(w => w.trade_name);

  res.json({ data: { plan_id: data.plan_id, critical_trades: criticalTrades } });
});

// DELETE /flowline/:planId
app.delete('/flowline/:planId', (req, res) => {
  delete flowlineDb[req.params.planId];
  res.status(204).send();
});

// ── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`flowline-service running on port ${PORT}`);
  logger.info(`Demo plan available at /flowline/${demoPlanId}`);
});
