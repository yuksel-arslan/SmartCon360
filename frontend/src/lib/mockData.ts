// ── Mock data for Phase 1 + Phase 2 frontend ─────────────────────

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

export interface SegmentTask {
  id: string;
  name: string;
  status: 'done' | 'active' | 'todo';
  progress: number; // 0-100
}

export interface FlowlineSegment {
  zone_index: number;
  x_start: number;
  x_end: number;
  y: number;
  status: 'completed' | 'in_progress' | 'planned' | 'delayed';
  percentComplete: number;
  isCriticalPath: boolean;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  crew?: string;
  tasks: SegmentTask[];
}

export interface FlowlineWagon {
  trade_name: string;
  color: string;
  segments: FlowlineSegment[];
}

export interface BufferZone {
  tradeBeforeName: string;
  tradeAfterName: string;
  colorBefore: string;
  colorAfter: string;
  segments: {
    zone_index: number;
    y: number;
    x_start: number;
    x_end: number;
    health: 'healthy' | 'warning' | 'critical';
  }[];
}

// Generate flowline mock data
const TAKT_TIME = 1;
const BUFFER = 1;
const TOTAL_PERIODS = (DEMO_ZONES.length + DEMO_TRADES.length - 1) * TAKT_TIME + (DEMO_TRADES.length - 1) * BUFFER;
const TODAY_PERIOD = Math.floor(TOTAL_PERIODS * 0.45);

// Critical path: first and last trades are on critical path
const CRITICAL_TRADES = new Set(['Structure', 'Finishes']);

// Some segments are delayed for realism
const DELAYED_SEGMENTS: Record<string, Set<number>> = {
  'MEP Rough': new Set([4]),
  'Drywall': new Set([3]),
};

// Project start date for readable dates
const PROJECT_START = new Date('2026-01-12');
function taktPeriodToDate(period: number): string {
  const d = new Date(PROJECT_START);
  d.setDate(d.getDate() + period * 5); // 5 calendar days per takt period
  return d.toISOString().split('T')[0];
}

const CREW_NAMES: Record<string, string> = {
  'Structure': 'Alpha Crew (12)',
  'MEP Rough': 'Bravo MEP (8)',
  'Drywall': 'Charlie DW (6)',
  'MEP Finish': 'Delta MEP (5)',
  'Flooring': 'Echo Floor (4)',
  'Paint': 'Foxtrot Paint (6)',
  'Finishes': 'Golf Finish (8)',
};

// Tasks per trade — realistic construction activities
const TRADE_TASKS: Record<string, string[]> = {
  'Structure': ['Formwork setup', 'Rebar placement', 'Concrete pour', 'Curing & strip'],
  'MEP Rough': ['Duct rough-in', 'Pipe rough-in', 'Electrical conduit', 'Fire sprinkler'],
  'Drywall': ['Metal framing', 'Board hanging', 'Taping & mud', 'Sanding'],
  'MEP Finish': ['Fixture install', 'Panel termination', 'Pipe trim-out', 'Testing & balance'],
  'Flooring': ['Substrate prep', 'Underlayment', 'Floor install', 'Transition strips'],
  'Paint': ['Surface prep', 'Primer coat', 'Finish coat', 'Touch-up & punch'],
  'Finishes': ['Door & hardware', 'Millwork install', 'Accessories', 'Final clean'],
};

function generateTasks(tradeName: string, segStatus: FlowlineSegment['status'], segPercent: number): SegmentTask[] {
  const taskNames = TRADE_TASKS[tradeName] ?? ['Task A', 'Task B', 'Task C'];
  return taskNames.map((name, i) => {
    const id = `${tradeName.toLowerCase().replace(/\s+/g, '-')}-${i}`;
    let status: SegmentTask['status'] = 'todo';
    let progress = 0;

    if (segStatus === 'completed') {
      status = 'done';
      progress = 100;
    } else if (segStatus === 'planned') {
      status = 'todo';
      progress = 0;
    } else {
      // in_progress or delayed — distribute progress across tasks
      const taskThreshold = (i / taskNames.length) * 100;
      const taskEnd = ((i + 1) / taskNames.length) * 100;
      if (segPercent >= taskEnd) {
        status = 'done';
        progress = 100;
      } else if (segPercent > taskThreshold) {
        status = 'active';
        progress = Math.round(((segPercent - taskThreshold) / (taskEnd - taskThreshold)) * 100);
      } else {
        status = 'todo';
        progress = 0;
      }
    }
    return { id, name, status, progress };
  });
}

export const DEMO_FLOWLINE: FlowlineWagon[] = DEMO_TRADES.map((trade, tradeIdx) => {
  const tradeOffset = tradeIdx * (TAKT_TIME + BUFFER);
  const segments: FlowlineSegment[] = DEMO_ZONES.map((_, zoneIdx) => {
    const xStart = tradeOffset + zoneIdx * TAKT_TIME;
    const xEnd = xStart + TAKT_TIME;
    const isDelayed = DELAYED_SEGMENTS[trade.name]?.has(zoneIdx) ?? false;

    let status: FlowlineSegment['status'] = 'planned';
    if (isDelayed && xStart <= TODAY_PERIOD) {
      status = 'delayed';
    } else if (xEnd <= TODAY_PERIOD) {
      status = 'completed';
    } else if (xStart <= TODAY_PERIOD && xEnd > TODAY_PERIOD) {
      status = 'in_progress';
    }

    let percentComplete = 0;
    if (status === 'completed') percentComplete = 100;
    else if (status === 'in_progress') percentComplete = Math.floor(30 + Math.random() * 50);
    else if (status === 'delayed') percentComplete = Math.floor(10 + Math.random() * 40);

    const seg: FlowlineSegment = {
      zone_index: zoneIdx,
      x_start: xStart,
      x_end: xEnd,
      y: zoneIdx,
      status,
      percentComplete,
      isCriticalPath: CRITICAL_TRADES.has(trade.name),
      plannedStart: taktPeriodToDate(xStart),
      plannedEnd: taktPeriodToDate(xEnd),
      actualStart: status !== 'planned' ? taktPeriodToDate(xStart + (isDelayed ? 0.5 : 0)) : undefined,
      actualEnd: status === 'completed' ? taktPeriodToDate(xEnd + (isDelayed ? 0.5 : 0)) : undefined,
      crew: CREW_NAMES[trade.name],
      tasks: [],
    };
    seg.tasks = generateTasks(trade.name, seg.status, seg.percentComplete);
    return seg;
  });
  return { trade_name: trade.name, color: trade.color, segments };
});

// Buffer zones between consecutive trades
export const DEMO_BUFFERS: BufferZone[] = DEMO_TRADES.slice(0, -1).map((trade, tradeIdx) => {
  const nextTrade = DEMO_TRADES[tradeIdx + 1];
  const tradeOffset = tradeIdx * (TAKT_TIME + BUFFER);
  const nextTradeOffset = (tradeIdx + 1) * (TAKT_TIME + BUFFER);

  const segments = DEMO_ZONES.map((_, zoneIdx) => {
    const bufferStart = tradeOffset + zoneIdx * TAKT_TIME + TAKT_TIME;
    const bufferEnd = nextTradeOffset + zoneIdx * TAKT_TIME;
    const isNearToday = Math.abs(bufferStart - TODAY_PERIOD) <= 2;
    const hasDelay = DELAYED_SEGMENTS[trade.name]?.has(zoneIdx) || DELAYED_SEGMENTS[nextTrade.name]?.has(zoneIdx);

    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (hasDelay) health = 'critical';
    else if (isNearToday) health = 'warning';

    return {
      zone_index: zoneIdx,
      y: zoneIdx,
      x_start: bufferStart,
      x_end: bufferEnd,
      health,
    };
  });

  return {
    tradeBeforeName: trade.name,
    tradeAfterName: nextTrade.name,
    colorBefore: trade.color,
    colorAfter: nextTrade.color,
    segments,
  };
});

// Simulation comparison data (slightly shifted)
export const DEMO_SIMULATION_FLOWLINE: FlowlineWagon[] = DEMO_TRADES.map((trade, tradeIdx) => {
  const tradeOffset = tradeIdx * (TAKT_TIME + BUFFER);
  const segments: FlowlineSegment[] = DEMO_ZONES.map((_, zoneIdx) => {
    const jitter = (Math.random() - 0.3) * 0.6;
    const xStart = tradeOffset + zoneIdx * TAKT_TIME + jitter;
    const xEnd = xStart + TAKT_TIME;
    return {
      zone_index: zoneIdx,
      x_start: xStart,
      x_end: xEnd,
      y: zoneIdx,
      status: 'planned' as const,
      percentComplete: 0,
      isCriticalPath: false,
      plannedStart: taktPeriodToDate(xStart),
      plannedEnd: taktPeriodToDate(xEnd),
      crew: CREW_NAMES[trade.name],
      tasks: [],
    };
  });
  return { trade_name: trade.name, color: trade.color, segments };
});

export const DEMO_TODAY_X = TODAY_PERIOD;
export const DEMO_TOTAL_PERIODS = TOTAL_PERIODS;

// Flowline stats
export const DEMO_FLOWLINE_STATS = {
  totalDuration: TOTAL_PERIODS,
  stackingConflicts: 1,
  bufferHealthy: 4,
  bufferWarning: 1,
  bufferCritical: 1,
  overallProgress: 42,
  ppc: 93,
  criticalPathLength: DEMO_ZONES.length * 2,
};

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
