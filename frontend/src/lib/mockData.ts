// ── Mock data for Phase 1 frontend ─────────────────────

export const DEMO_ZONES = [
  { id: 'z1', name: 'Zone A — Ground Floor', y_index: 0 },
  { id: 'z2', name: 'Zone B — 1st Floor', y_index: 1 },
  { id: 'z3', name: 'Zone C — 2nd Floor', y_index: 2 },
  { id: 'z4', name: 'Zone D — 3rd Floor', y_index: 3 },
  { id: 'z5', name: 'Zone E — 4th Floor', y_index: 4 },
  { id: 'z6', name: 'Zone F — 5th Floor', y_index: 5 },
];

export const DEMO_TRADES = [
  { name: 'Structure', color: '#3B82F6' },
  { name: 'MEP Rough', color: '#8B5CF6' },
  { name: 'Drywall', color: '#F59E0B' },
  { name: 'MEP Finish', color: '#06B6D4' },
  { name: 'Flooring', color: '#10B981' },
  { name: 'Paint', color: '#EC4899' },
  { name: 'Finishes', color: '#F97316' },
];

export interface FlowlineSegment {
  zone_index: number;
  x_start: number;
  x_end: number;
  y: number;
  status: 'completed' | 'in_progress' | 'planned' | 'delayed';
}

export interface FlowlineWagon {
  trade_name: string;
  color: string;
  segments: FlowlineSegment[];
}

// Generate flowline mock data
const TAKT_TIME = 1;
const BUFFER = 1;
const TOTAL_PERIODS = DEMO_ZONES.length + DEMO_TRADES.length - 1 + (DEMO_TRADES.length - 1) * BUFFER;
const TODAY_PERIOD = Math.floor(TOTAL_PERIODS * 0.45);

export const DEMO_FLOWLINE: FlowlineWagon[] = DEMO_TRADES.map((trade, tradeIdx) => {
  const tradeOffset = tradeIdx * (1 + BUFFER);
  const segments: FlowlineSegment[] = DEMO_ZONES.map((_, zoneIdx) => {
    const xStart = tradeOffset + zoneIdx * TAKT_TIME;
    const xEnd = xStart + TAKT_TIME;
    let status: FlowlineSegment['status'] = 'planned';
    if (xEnd <= TODAY_PERIOD) status = 'completed';
    else if (xStart <= TODAY_PERIOD && xEnd > TODAY_PERIOD) status = 'in_progress';
    return { zone_index: zoneIdx, x_start: xStart, x_end: xEnd, y: zoneIdx, status };
  });
  return { trade_name: trade.name, color: trade.color, segments };
});

export const DEMO_TODAY_X = TODAY_PERIOD;
export const DEMO_TOTAL_PERIODS = TOTAL_PERIODS;

// ── KPIs ───────────────────────────────────────────────
export const DEMO_KPIS = {
  ppc: 93,
  ppcTrend: +5,
  taktPeriod: 5,
  totalPeriods: 11,
  openConstraints: 3,
  criticalConstraints: 1,
  aiScore: 87,
  activeProjects: 2,
  totalTrades: 7,
  totalZones: 6,
};

// ── Recent Activity ────────────────────────────────────
export const DEMO_ACTIVITIES = [
  { id: '1', type: 'progress' as const, message: 'Structure completed Zone D — 3rd Floor', time: '2 hours ago', color: '#3B82F6' },
  { id: '2', type: 'constraint' as const, message: 'New constraint: MEP material delivery delayed', time: '4 hours ago', color: '#EF4444' },
  { id: '3', type: 'ai' as const, message: 'AI detected potential trade stacking in Zone E', time: '5 hours ago', color: '#8B5CF6' },
  { id: '4', type: 'progress' as const, message: 'MEP Rough completed Zone B — 1st Floor', time: '6 hours ago', color: '#8B5CF6' },
  { id: '5', type: 'milestone' as const, message: 'Takt Period T4 completed — all trades on schedule', time: 'Yesterday', color: '#10B981' },
  { id: '6', type: 'constraint' as const, message: 'Constraint resolved: Elevator shaft access cleared', time: 'Yesterday', color: '#10B981' },
];

// ── Constraints ────────────────────────────────────────
export const DEMO_CONSTRAINTS = [
  { id: 'c1', category: 'material' as const, title: 'MEP duct delivery delayed', status: 'open' as const, priority: 'critical' as const, trade: 'MEP Rough', zone: 'Zone E', dueDate: '2026-02-18' },
  { id: 'c2', category: 'labor' as const, title: 'Drywall crew shortage', status: 'open' as const, priority: 'high' as const, trade: 'Drywall', zone: 'Zone D', dueDate: '2026-02-20' },
  { id: 'c3', category: 'design' as const, title: 'RFI #042 — ceiling detail revision', status: 'open' as const, priority: 'medium' as const, trade: 'Finishes', zone: 'Zone C', dueDate: '2026-02-25' },
  { id: 'c4', category: 'predecessor' as const, title: 'Structure inspection pending', status: 'in_progress' as const, priority: 'high' as const, trade: 'MEP Rough', zone: 'Zone E', dueDate: '2026-02-15' },
  { id: 'c5', category: 'equipment' as const, title: 'Tower crane maintenance scheduled', status: 'in_progress' as const, priority: 'medium' as const, trade: 'Structure', zone: 'All', dueDate: '2026-02-16' },
];

// ── Takt Grid (for Takt Editor page) ───────────────────
export const DEMO_TAKT_GRID = DEMO_TRADES.map((trade, tradeIdx) => ({
  trade: trade.name,
  color: trade.color,
  zones: DEMO_ZONES.map((zone, zoneIdx) => {
    const period = tradeIdx * 2 + zoneIdx + 1;
    let status: 'completed' | 'in_progress' | 'planned' = 'planned';
    if (period <= 7) status = 'completed';
    else if (period <= 9) status = 'in_progress';
    return {
      zone: zone.name,
      period,
      status,
      startDate: `T${period}`,
    };
  }),
}));

// ── Projects ───────────────────────────────────────────
export const DEMO_PROJECTS = [
  {
    id: 'p1',
    name: 'Hotel Sapphire',
    type: 'hotel' as const,
    status: 'active' as const,
    location: 'Istanbul, Turkey',
    floors: 12,
    zones: 6,
    trades: 7,
    ppc: 93,
    progress: 45,
    startDate: '2026-01-06',
    endDate: '2026-08-15',
  },
  {
    id: 'p2',
    name: 'City Medical Center',
    type: 'hospital' as const,
    status: 'planning' as const,
    location: 'Ankara, Turkey',
    floors: 8,
    zones: 10,
    trades: 9,
    ppc: 0,
    progress: 0,
    startDate: '2026-03-01',
    endDate: '2026-12-30',
  },
];
