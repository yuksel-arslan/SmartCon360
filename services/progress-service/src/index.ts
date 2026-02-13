import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// ── Logger ──────────────────────────────────────────────
const logger = pino({ transport: { target: 'pino-pretty' } });

// ── App Setup ───────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Types ───────────────────────────────────────────────
interface ProgressUpdate {
  id: string;
  projectId: string;
  assignmentId: string;
  zoneId: string;
  tradeId: string;
  reportedBy: string;
  percentComplete: number;
  previousPercent: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'blocked';
  notes: string | null;
  photoUrls: string[];
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface WeeklyCommitment {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  tradeId: string;
  tradeName: string;
  zoneId: string;
  zoneName: string;
  description: string;
  committed: boolean;
  completed: boolean;
  varianceReason: string | null;
  varianceCategory: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TradeBreakdown {
  tradeId: string;
  tradeName: string;
  committed: number;
  completed: number;
  ppc: number;
}

interface VarianceReasonEntry {
  reason: string;
  category: string;
  count: number;
}

interface PPCRecord {
  id: string;
  projectId: string;
  weekStart: string;
  weekEnd: string;
  totalCommitted: number;
  totalCompleted: number;
  ppcPercent: number;
  byTrade: TradeBreakdown[];
  topVarianceReasons: VarianceReasonEntry[];
  createdAt: string;
}

interface DailyLog {
  id: string;
  projectId: string;
  date: string;
  weather: string | null;
  temperature: number | null;
  crewCount: number | null;
  notes: string | null;
  issues: { description: string; severity: string }[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Validation Schemas ──────────────────────────────────
const progressStatusEnum = z.enum(['not_started', 'in_progress', 'completed', 'delayed', 'blocked']);

const varianceCategoryEnum = z.enum([
  'material', 'labor', 'equipment', 'design',
  'space', 'predecessor', 'permit', 'information',
]);

const createProgressUpdateSchema = z.object({
  projectId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  zoneId: z.string().uuid(),
  tradeId: z.string().uuid(),
  percentComplete: z.number().min(0).max(100),
  status: progressStatusEnum.optional().default('in_progress'),
  notes: z.string().optional().nullable(),
  photoUrls: z.array(z.string().url()).optional().default([]),
  reportedBy: z.string().uuid(),
});

const createWeeklyCommitmentSchema = z.object({
  projectId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  tradeId: z.string().uuid(),
  tradeName: z.string().min(1),
  zoneId: z.string().uuid(),
  zoneName: z.string().min(1),
  description: z.string().min(1),
});

const bulkCreateCommitmentsSchema = z.object({
  commitments: z.array(createWeeklyCommitmentSchema).min(1).max(100),
});

const updateCommitmentSchema = z.object({
  completed: z.boolean().optional(),
  varianceReason: z.string().optional().nullable(),
  varianceCategory: varianceCategoryEnum.optional().nullable(),
});

const calculatePPCSchema = z.object({
  projectId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
});

const createDailyLogSchema = z.object({
  projectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format'),
  weather: z.string().optional().nullable(),
  temperature: z.number().optional().nullable(),
  crewCount: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  issues: z.array(z.object({
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  })).optional().default([]),
  createdBy: z.string().uuid(),
});

// ── In-Memory Storage ───────────────────────────────────
const progressUpdates: Map<string, ProgressUpdate[]> = new Map();
const weeklyCommitments: Map<string, WeeklyCommitment[]> = new Map();
const ppcRecords: Map<string, PPCRecord[]> = new Map();
const dailyLogs: Map<string, DailyLog[]> = new Map();

// ── Helpers ─────────────────────────────────────────────
function nowISO(): string {
  return new Date().toISOString();
}

function dateToKey(date: string): string {
  return date.split('T')[0];
}

function getProjectProgressUpdates(projectId: string): ProgressUpdate[] {
  return progressUpdates.get(projectId) || [];
}

function getProjectCommitments(projectId: string): WeeklyCommitment[] {
  return weeklyCommitments.get(projectId) || [];
}

function getProjectPPCRecords(projectId: string): PPCRecord[] {
  return ppcRecords.get(projectId) || [];
}

function getProjectDailyLogs(projectId: string): DailyLog[] {
  return dailyLogs.get(projectId) || [];
}

function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return { success: false, error: messages };
  }
  return { success: true, data: result.data };
}

// ── Routes: Health ──────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    data: {
      status: 'ok',
      service: 'progress-service',
      timestamp: nowISO(),
      storage: {
        progressUpdates: Array.from(progressUpdates.values()).reduce((sum, arr) => sum + arr.length, 0),
        weeklyCommitments: Array.from(weeklyCommitments.values()).reduce((sum, arr) => sum + arr.length, 0),
        ppcRecords: Array.from(ppcRecords.values()).reduce((sum, arr) => sum + arr.length, 0),
        dailyLogs: Array.from(dailyLogs.values()).reduce((sum, arr) => sum + arr.length, 0),
      },
    },
  });
});

// ── Routes: Progress Updates ────────────────────────────

// POST /progress/update — Submit progress update
app.post('/progress/update', (req: Request, res: Response) => {
  const validation = validateRequest(createProgressUpdateSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;
  const existing = getProjectProgressUpdates(input.projectId);

  // Find the most recent update for this assignment to track previous percent
  const previousUpdates = existing.filter(u => u.assignmentId === input.assignmentId);
  const previousPercent = previousUpdates.length > 0
    ? previousUpdates[previousUpdates.length - 1].percentComplete
    : 0;

  // Auto-determine status based on percent if not explicitly provided to completed
  let status: ProgressUpdate['status'] = input.status ?? 'in_progress';
  if (input.percentComplete >= 100) {
    status = 'completed';
  } else if (input.percentComplete > 0 && status === 'not_started') {
    status = 'in_progress';
  }

  const update: ProgressUpdate = {
    id: uuidv4(),
    projectId: input.projectId,
    assignmentId: input.assignmentId,
    zoneId: input.zoneId,
    tradeId: input.tradeId,
    reportedBy: input.reportedBy,
    percentComplete: input.percentComplete,
    previousPercent,
    status,
    notes: input.notes ?? null,
    photoUrls: input.photoUrls ?? [],
    reportedAt: nowISO(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  if (!progressUpdates.has(input.projectId)) {
    progressUpdates.set(input.projectId, []);
  }
  progressUpdates.get(input.projectId)!.push(update);

  logger.info({ projectId: input.projectId, assignmentId: input.assignmentId, percent: input.percentComplete }, 'Progress update recorded');
  res.status(201).json({ data: update });
});

// GET /progress/assignment/:assignmentId — Progress history for an assignment
app.get('/progress/assignment/:assignmentId', (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  let results: ProgressUpdate[] = [];

  if (projectId) {
    results = getProjectProgressUpdates(projectId).filter(u => u.assignmentId === assignmentId);
  } else {
    // Search all projects
    for (const updates of progressUpdates.values()) {
      results.push(...updates.filter(u => u.assignmentId === assignmentId));
    }
  }

  results.sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());

  res.json({
    data: results,
    meta: { count: results.length },
  });
});

// GET /progress/zone/:zoneId — All progress for a zone
app.get('/progress/zone/:zoneId', (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  let results: ProgressUpdate[] = [];

  if (projectId) {
    results = getProjectProgressUpdates(projectId).filter(u => u.zoneId === zoneId);
  } else {
    for (const updates of progressUpdates.values()) {
      results.push(...updates.filter(u => u.zoneId === zoneId));
    }
  }

  results.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  res.json({
    data: results,
    meta: { count: results.length },
  });
});

// GET /progress/trade/:tradeId — All progress for a trade
app.get('/progress/trade/:tradeId', (req: Request, res: Response) => {
  const { tradeId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  let results: ProgressUpdate[] = [];

  if (projectId) {
    results = getProjectProgressUpdates(projectId).filter(u => u.tradeId === tradeId);
  } else {
    for (const updates of progressUpdates.values()) {
      results.push(...updates.filter(u => u.tradeId === tradeId));
    }
  }

  results.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

  res.json({
    data: results,
    meta: { count: results.length },
  });
});

// GET /progress/project/:projectId — All progress for a project
app.get('/progress/project/:projectId', (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '50', 10);

  const allUpdates = getProjectProgressUpdates(projectId);
  const sorted = [...allUpdates].sort((a, b) =>
    new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );

  const startIdx = (page - 1) * limit;
  const paginated = sorted.slice(startIdx, startIdx + limit);

  res.json({
    data: paginated,
    meta: {
      total: allUpdates.length,
      page,
      limit,
      totalPages: Math.ceil(allUpdates.length / limit),
    },
  });
});

// ── Routes: Weekly Commitments ──────────────────────────

// POST /progress/commitments — Create weekly commitment
app.post('/progress/commitments', (req: Request, res: Response) => {
  const validation = validateRequest(createWeeklyCommitmentSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;
  const now = nowISO();

  const commitment: WeeklyCommitment = {
    id: uuidv4(),
    projectId: input.projectId,
    weekStart: input.weekStart,
    weekEnd: input.weekEnd,
    tradeId: input.tradeId,
    tradeName: input.tradeName,
    zoneId: input.zoneId,
    zoneName: input.zoneName,
    description: input.description,
    committed: true,
    completed: false,
    varianceReason: null,
    varianceCategory: null,
    createdAt: now,
    updatedAt: now,
  };

  if (!weeklyCommitments.has(input.projectId)) {
    weeklyCommitments.set(input.projectId, []);
  }
  weeklyCommitments.get(input.projectId)!.push(commitment);

  logger.info({ projectId: input.projectId, tradeId: input.tradeId, weekStart: input.weekStart }, 'Weekly commitment created');
  res.status(201).json({ data: commitment });
});

// POST /progress/commitments/bulk — Bulk create commitments
app.post('/progress/commitments/bulk', (req: Request, res: Response) => {
  const validation = validateRequest(bulkCreateCommitmentsSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const { commitments: inputs } = validation.data;
  const now = nowISO();
  const created: WeeklyCommitment[] = [];

  for (const input of inputs) {
    const commitment: WeeklyCommitment = {
      id: uuidv4(),
      projectId: input.projectId,
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      tradeId: input.tradeId,
      tradeName: input.tradeName,
      zoneId: input.zoneId,
      zoneName: input.zoneName,
      description: input.description,
      committed: true,
      completed: false,
      varianceReason: null,
      varianceCategory: null,
      createdAt: now,
      updatedAt: now,
    };

    if (!weeklyCommitments.has(input.projectId)) {
      weeklyCommitments.set(input.projectId, []);
    }
    weeklyCommitments.get(input.projectId)!.push(commitment);
    created.push(commitment);
  }

  logger.info({ count: created.length }, 'Bulk weekly commitments created');
  res.status(201).json({
    data: created,
    meta: { count: created.length },
  });
});

// GET /progress/commitments — Get commitments for a week
app.get('/progress/commitments', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  const weekStart = req.query.weekStart as string | undefined;

  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  let results = getProjectCommitments(projectId);

  if (weekStart) {
    results = results.filter(c => c.weekStart === weekStart);
  }

  // Group by trade for summary
  const tradeMap = new Map<string, { tradeName: string; total: number; completed: number }>();
  for (const c of results) {
    const existing = tradeMap.get(c.tradeId) || { tradeName: c.tradeName, total: 0, completed: 0 };
    existing.total += 1;
    if (c.completed) existing.completed += 1;
    tradeMap.set(c.tradeId, existing);
  }

  const tradeSummary = Array.from(tradeMap.entries()).map(([tradeId, data]) => ({
    tradeId,
    tradeName: data.tradeName,
    total: data.total,
    completed: data.completed,
    ppc: data.total > 0 ? Math.round((data.completed / data.total) * 100 * 10) / 10 : 0,
  }));

  res.json({
    data: results,
    meta: {
      count: results.length,
      tradeSummary,
    },
  });
});

// PATCH /progress/commitments/:id — Update commitment
app.patch('/progress/commitments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const validation = validateRequest(updateCommitmentSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;

  // Find commitment across all projects
  let found: WeeklyCommitment | undefined;
  for (const commitments of weeklyCommitments.values()) {
    found = commitments.find(c => c.id === id);
    if (found) break;
  }

  if (!found) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Commitment ${id} not found` } });
    return;
  }

  if (input.completed !== undefined) {
    found.completed = input.completed;
  }
  if (input.varianceReason !== undefined) {
    found.varianceReason = input.varianceReason ?? null;
  }
  if (input.varianceCategory !== undefined) {
    found.varianceCategory = input.varianceCategory ?? null;
  }
  found.updatedAt = nowISO();

  logger.info({ commitmentId: id, completed: found.completed }, 'Commitment updated');
  res.json({ data: found });
});

// ── Routes: PPC Calculation ─────────────────────────────

// POST /progress/ppc/calculate — Calculate PPC for a specific week
app.post('/progress/ppc/calculate', (req: Request, res: Response) => {
  const validation = validateRequest(calculatePPCSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const { projectId, weekStart, weekEnd } = validation.data;

  // Get all commitments for this project and week
  const projectCommitments = getProjectCommitments(projectId);
  const weekCommitments = projectCommitments.filter(
    c => c.weekStart === weekStart && c.committed
  );

  if (weekCommitments.length === 0) {
    res.status(404).json({
      error: {
        code: 'NO_COMMITMENTS',
        message: `No commitments found for project ${projectId} week starting ${weekStart}`,
      },
    });
    return;
  }

  const totalCommitted = weekCommitments.length;
  const totalCompleted = weekCommitments.filter(c => c.completed).length;
  const ppcPercent = Math.round((totalCompleted / totalCommitted) * 100 * 10) / 10;

  // Group by trade for breakdown
  const tradeMap = new Map<string, { tradeName: string; committed: number; completed: number }>();
  for (const c of weekCommitments) {
    const existing = tradeMap.get(c.tradeId) || { tradeName: c.tradeName, committed: 0, completed: 0 };
    existing.committed += 1;
    if (c.completed) existing.completed += 1;
    tradeMap.set(c.tradeId, existing);
  }

  const byTrade: TradeBreakdown[] = Array.from(tradeMap.entries()).map(([tradeId, data]) => ({
    tradeId,
    tradeName: data.tradeName,
    committed: data.committed,
    completed: data.completed,
    ppc: data.committed > 0 ? Math.round((data.completed / data.committed) * 100 * 10) / 10 : 0,
  }));

  // Analyze variance reasons from failed commitments
  const failedCommitments = weekCommitments.filter(c => !c.completed && c.varianceReason);
  const reasonMap = new Map<string, { category: string; count: number }>();
  for (const c of failedCommitments) {
    if (c.varianceReason) {
      const key = c.varianceReason;
      const existing = reasonMap.get(key) || { category: c.varianceCategory || 'unknown', count: 0 };
      existing.count += 1;
      reasonMap.set(key, existing);
    }
  }

  const topVarianceReasons: VarianceReasonEntry[] = Array.from(reasonMap.entries())
    .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const record: PPCRecord = {
    id: uuidv4(),
    projectId,
    weekStart,
    weekEnd,
    totalCommitted,
    totalCompleted,
    ppcPercent,
    byTrade,
    topVarianceReasons,
    createdAt: nowISO(),
  };

  // Store or replace existing record for this week
  if (!ppcRecords.has(projectId)) {
    ppcRecords.set(projectId, []);
  }
  const records = ppcRecords.get(projectId)!;
  const existingIdx = records.findIndex(r => r.weekStart === weekStart);
  if (existingIdx >= 0) {
    records[existingIdx] = record;
  } else {
    records.push(record);
    records.sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
  }

  logger.info({ projectId, weekStart, ppc: ppcPercent, committed: totalCommitted, completed: totalCompleted }, 'PPC calculated');
  res.status(201).json({ data: record });
});

// GET /progress/ppc/history — PPC trend data (all weeks)
app.get('/progress/ppc/history', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = getProjectPPCRecords(projectId);
  const sorted = [...records].sort((a, b) =>
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );

  // Calculate trend
  const trend = sorted.length >= 2
    ? sorted[sorted.length - 1].ppcPercent - sorted[sorted.length - 2].ppcPercent
    : 0;

  const average = sorted.length > 0
    ? Math.round((sorted.reduce((sum, r) => sum + r.ppcPercent, 0) / sorted.length) * 10) / 10
    : 0;

  res.json({
    data: sorted,
    meta: {
      count: sorted.length,
      averagePPC: average,
      latestPPC: sorted.length > 0 ? sorted[sorted.length - 1].ppcPercent : null,
      trend: Math.round(trend * 10) / 10,
      trendDirection: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
    },
  });
});

// GET /progress/ppc/current — Latest week PPC
app.get('/progress/ppc/current', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = getProjectPPCRecords(projectId);
  if (records.length === 0) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No PPC records found for this project' } });
    return;
  }

  const sorted = [...records].sort((a, b) =>
    new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
  );

  const current = sorted[0];
  const previous = sorted.length >= 2 ? sorted[1] : null;
  const change = previous ? Math.round((current.ppcPercent - previous.ppcPercent) * 10) / 10 : 0;

  res.json({
    data: current,
    meta: {
      previousWeekPPC: previous?.ppcPercent ?? null,
      change,
      changeDirection: change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable',
    },
  });
});

// GET /progress/ppc/by-trade — PPC breakdown by trade for a specific week
app.get('/progress/ppc/by-trade', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  const weekStart = req.query.weekStart as string | undefined;

  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = getProjectPPCRecords(projectId);

  let targetRecord: PPCRecord | undefined;
  if (weekStart) {
    targetRecord = records.find(r => r.weekStart === weekStart);
  } else {
    // Default to latest week
    const sorted = [...records].sort((a, b) =>
      new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
    );
    targetRecord = sorted[0];
  }

  if (!targetRecord) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No PPC record found for specified criteria' } });
    return;
  }

  res.json({
    data: {
      weekStart: targetRecord.weekStart,
      weekEnd: targetRecord.weekEnd,
      overallPPC: targetRecord.ppcPercent,
      byTrade: targetRecord.byTrade,
    },
  });
});

// ── Routes: Variance ────────────────────────────────────

// GET /progress/variance/history — Variance trend (failed commitments over time)
app.get('/progress/variance/history', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = getProjectPPCRecords(projectId);
  const sorted = [...records].sort((a, b) =>
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );

  const varianceHistory = sorted.map(r => ({
    weekStart: r.weekStart,
    weekEnd: r.weekEnd,
    totalCommitted: r.totalCommitted,
    totalCompleted: r.totalCompleted,
    totalFailed: r.totalCommitted - r.totalCompleted,
    failureRate: Math.round(((r.totalCommitted - r.totalCompleted) / r.totalCommitted) * 100 * 10) / 10,
    ppcPercent: r.ppcPercent,
    topReasons: r.topVarianceReasons,
  }));

  // Aggregate totals
  const totalFailed = varianceHistory.reduce((sum, v) => sum + v.totalFailed, 0);
  const totalCommitted = varianceHistory.reduce((sum, v) => sum + v.totalCommitted, 0);

  res.json({
    data: varianceHistory,
    meta: {
      weeks: varianceHistory.length,
      totalFailedAcrossAllWeeks: totalFailed,
      totalCommittedAcrossAllWeeks: totalCommitted,
      overallFailureRate: totalCommitted > 0
        ? Math.round((totalFailed / totalCommitted) * 100 * 10) / 10
        : 0,
    },
  });
});

// GET /progress/variance/reasons — Top variance reasons aggregated
app.get('/progress/variance/reasons', (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  // Aggregate from commitments directly for most accurate data
  const commitments = getProjectCommitments(projectId);
  const failedWithReason = commitments.filter(c => c.committed && !c.completed && c.varianceReason);

  // By reason
  const reasonCounts = new Map<string, { category: string; count: number }>();
  for (const c of failedWithReason) {
    if (c.varianceReason) {
      const key = c.varianceReason;
      const existing = reasonCounts.get(key) || { category: c.varianceCategory || 'unknown', count: 0 };
      existing.count += 1;
      reasonCounts.set(key, existing);
    }
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
    .sort((a, b) => b.count - a.count);

  // By category
  const categoryCounts = new Map<string, number>();
  for (const c of failedWithReason) {
    const cat = c.varianceCategory || 'unknown';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
  }

  const byCategory = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: failedWithReason.length > 0
        ? Math.round((count / failedWithReason.length) * 100 * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    data: {
      topReasons,
      byCategory,
    },
    meta: {
      totalVariances: failedWithReason.length,
      totalCategories: byCategory.length,
    },
  });
});

// ── Routes: Daily Log ───────────────────────────────────

// POST /progress/daily-log — Submit daily log
app.post('/progress/daily-log', (req: Request, res: Response) => {
  const validation = validateRequest(createDailyLogSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;
  const now = nowISO();

  // Check if a log already exists for this date/project
  const existing = getProjectDailyLogs(input.projectId);
  const existingLog = existing.find(l => l.date === input.date);

  if (existingLog) {
    // Update existing log
    existingLog.weather = input.weather ?? existingLog.weather;
    existingLog.temperature = input.temperature ?? existingLog.temperature;
    existingLog.crewCount = input.crewCount ?? existingLog.crewCount;
    existingLog.notes = input.notes ?? existingLog.notes;
    existingLog.issues = input.issues ?? existingLog.issues;
    existingLog.updatedAt = now;

    logger.info({ projectId: input.projectId, date: input.date }, 'Daily log updated');
    res.json({ data: existingLog });
    return;
  }

  const log: DailyLog = {
    id: uuidv4(),
    projectId: input.projectId,
    date: input.date,
    weather: input.weather ?? null,
    temperature: input.temperature ?? null,
    crewCount: input.crewCount ?? null,
    notes: input.notes ?? null,
    issues: input.issues ?? [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  if (!dailyLogs.has(input.projectId)) {
    dailyLogs.set(input.projectId, []);
  }
  dailyLogs.get(input.projectId)!.push(log);

  logger.info({ projectId: input.projectId, date: input.date }, 'Daily log created');
  res.status(201).json({ data: log });
});

// GET /progress/daily-log/:projectId/:date — Get daily log for a date
app.get('/progress/daily-log/:projectId/:date', (req: Request, res: Response) => {
  const projectId = req.params.projectId as string;
  const date = req.params.date as string;
  const logs = getProjectDailyLogs(projectId);
  const log = logs.find(l => l.date === dateToKey(date));

  if (!log) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No daily log found for ${date}` } });
    return;
  }

  res.json({ data: log });
});

// ── Demo Data Seed ──────────────────────────────────────
function seedDemoData(): void {
  const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
  const DEMO_USER_ID = '00000000-0000-0000-0000-000000000099';

  // Demo trades
  const trades = [
    { id: '10000000-0000-0000-0000-000000000001', name: 'Structure' },
    { id: '10000000-0000-0000-0000-000000000002', name: 'MEP Rough-In' },
    { id: '10000000-0000-0000-0000-000000000003', name: 'Drywall' },
    { id: '10000000-0000-0000-0000-000000000004', name: 'MEP Finish' },
    { id: '10000000-0000-0000-0000-000000000005', name: 'Flooring' },
    { id: '10000000-0000-0000-0000-000000000006', name: 'Paint' },
    { id: '10000000-0000-0000-0000-000000000007', name: 'Final Finishes' },
  ];

  // Demo zones
  const zones = [
    { id: '20000000-0000-0000-0000-000000000001', name: 'Zone A - Ground Floor' },
    { id: '20000000-0000-0000-0000-000000000002', name: 'Zone B - 1st Floor' },
    { id: '20000000-0000-0000-0000-000000000003', name: 'Zone C - 2nd Floor' },
    { id: '20000000-0000-0000-0000-000000000004', name: 'Zone D - 3rd Floor' },
    { id: '20000000-0000-0000-0000-000000000005', name: 'Zone E - 4th Floor' },
    { id: '20000000-0000-0000-0000-000000000006', name: 'Zone F - 5th Floor' },
  ];

  // Generate 8 weeks of PPC history (improving from 65% to 93%)
  const ppcWeeks: { weekStart: string; weekEnd: string; ppc: number }[] = [
    { weekStart: '2025-12-22', weekEnd: '2025-12-26', ppc: 65.0 },
    { weekStart: '2025-12-29', weekEnd: '2026-01-02', ppc: 68.5 },
    { weekStart: '2026-01-05', weekEnd: '2026-01-09', ppc: 72.0 },
    { weekStart: '2026-01-12', weekEnd: '2026-01-16', ppc: 78.0 },
    { weekStart: '2026-01-19', weekEnd: '2026-01-23', ppc: 82.5 },
    { weekStart: '2026-01-26', weekEnd: '2026-01-30', ppc: 87.0 },
    { weekStart: '2026-02-02', weekEnd: '2026-02-06', ppc: 91.0 },
    { weekStart: '2026-02-09', weekEnd: '2026-02-13', ppc: 93.0 },
  ];

  // Variance reasons pool
  const varianceReasons: { reason: string; category: string }[] = [
    { reason: 'Material delivery delayed', category: 'material' },
    { reason: 'Crew not available', category: 'labor' },
    { reason: 'Design change pending RFI', category: 'design' },
    { reason: 'Equipment breakdown', category: 'equipment' },
    { reason: 'Preceding work not complete', category: 'predecessor' },
    { reason: 'Access restricted by other trade', category: 'space' },
    { reason: 'Permit approval pending', category: 'permit' },
    { reason: 'Missing specifications', category: 'information' },
    { reason: 'Weather delay', category: 'labor' },
    { reason: 'Scaffold not erected', category: 'equipment' },
  ];

  // Initialize storage for demo project
  weeklyCommitments.set(DEMO_PROJECT_ID, []);
  ppcRecords.set(DEMO_PROJECT_ID, []);
  progressUpdates.set(DEMO_PROJECT_ID, []);
  dailyLogs.set(DEMO_PROJECT_ID, []);

  // Generate weekly commitments and PPC records for each week
  for (const week of ppcWeeks) {
    const commitmentsPerTrade = 3; // Each trade has 3 commitments per week (one per zone in progress)
    const totalCommitted = trades.length * commitmentsPerTrade;
    const totalCompleted = Math.round(totalCommitted * (week.ppc / 100));
    const totalFailed = totalCommitted - totalCompleted;

    // Create commitments
    let completedCount = 0;
    const tradeBreakdowns: TradeBreakdown[] = [];

    for (const trade of trades) {
      let tradeCompleted = 0;
      for (let z = 0; z < commitmentsPerTrade; z++) {
        const zone = zones[z % zones.length];
        const shouldComplete = completedCount < totalCompleted;

        const commitment: WeeklyCommitment = {
          id: uuidv4(),
          projectId: DEMO_PROJECT_ID,
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          tradeId: trade.id,
          tradeName: trade.name,
          zoneId: zone.id,
          zoneName: zone.name,
          description: `${trade.name} work in ${zone.name}`,
          committed: true,
          completed: shouldComplete,
          varianceReason: shouldComplete ? null : varianceReasons[Math.floor(Math.random() * varianceReasons.length)].reason,
          varianceCategory: shouldComplete ? null : varianceReasons[Math.floor(Math.random() * varianceReasons.length)].category,
          createdAt: `${week.weekStart}T08:00:00.000Z`,
          updatedAt: `${week.weekEnd}T17:00:00.000Z`,
        };

        weeklyCommitments.get(DEMO_PROJECT_ID)!.push(commitment);
        if (shouldComplete) {
          completedCount++;
          tradeCompleted++;
        }
      }

      tradeBreakdowns.push({
        tradeId: trade.id,
        tradeName: trade.name,
        committed: commitmentsPerTrade,
        completed: tradeCompleted,
        ppc: Math.round((tradeCompleted / commitmentsPerTrade) * 100 * 10) / 10,
      });
    }

    // Aggregate variance reasons for this week's failed commitments
    const weekCommitments = weeklyCommitments.get(DEMO_PROJECT_ID)!.filter(
      c => c.weekStart === week.weekStart && !c.completed && c.varianceReason
    );
    const reasonMap = new Map<string, { category: string; count: number }>();
    for (const c of weekCommitments) {
      if (c.varianceReason) {
        const existing = reasonMap.get(c.varianceReason) || { category: c.varianceCategory || 'unknown', count: 0 };
        existing.count += 1;
        reasonMap.set(c.varianceReason, existing);
      }
    }
    const topReasons: VarianceReasonEntry[] = Array.from(reasonMap.entries())
      .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Create PPC record
    const record: PPCRecord = {
      id: uuidv4(),
      projectId: DEMO_PROJECT_ID,
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      totalCommitted,
      totalCompleted: completedCount,
      ppcPercent: Math.round((completedCount / totalCommitted) * 100 * 10) / 10,
      byTrade: tradeBreakdowns,
      topVarianceReasons: topReasons,
      createdAt: `${week.weekEnd}T18:00:00.000Z`,
    };

    ppcRecords.get(DEMO_PROJECT_ID)!.push(record);
  }

  // Generate progress updates for a few recent assignments
  const recentAssignments = [
    { assignmentId: '30000000-0000-0000-0000-000000000001', tradeIdx: 0, zoneIdx: 0, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000002', tradeIdx: 0, zoneIdx: 1, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000003', tradeIdx: 0, zoneIdx: 2, percent: 85 },
    { assignmentId: '30000000-0000-0000-0000-000000000004', tradeIdx: 1, zoneIdx: 0, percent: 100 },
    { assignmentId: '30000000-0000-0000-0000-000000000005', tradeIdx: 1, zoneIdx: 1, percent: 70 },
    { assignmentId: '30000000-0000-0000-0000-000000000006', tradeIdx: 2, zoneIdx: 0, percent: 60 },
    { assignmentId: '30000000-0000-0000-0000-000000000007', tradeIdx: 3, zoneIdx: 0, percent: 40 },
    { assignmentId: '30000000-0000-0000-0000-000000000008', tradeIdx: 4, zoneIdx: 0, percent: 20 },
  ];

  for (const assignment of recentAssignments) {
    const trade = trades[assignment.tradeIdx];
    const zone = zones[assignment.zoneIdx];

    // Create a few progress snapshots over time
    const steps = assignment.percent >= 100
      ? [25, 50, 75, 100]
      : assignment.percent >= 50
        ? [25, 50, assignment.percent]
        : [assignment.percent];

    let previousPercent = 0;
    for (let i = 0; i < steps.length; i++) {
      const daysAgo = (steps.length - i) * 2;
      const reportDate = new Date();
      reportDate.setDate(reportDate.getDate() - daysAgo);

      const status: ProgressUpdate['status'] = steps[i] >= 100
        ? 'completed'
        : steps[i] > 0
          ? 'in_progress'
          : 'not_started';

      const update: ProgressUpdate = {
        id: uuidv4(),
        projectId: DEMO_PROJECT_ID,
        assignmentId: assignment.assignmentId,
        zoneId: zone.id,
        tradeId: trade.id,
        reportedBy: DEMO_USER_ID,
        percentComplete: steps[i],
        previousPercent,
        status,
        notes: i === steps.length - 1 ? `Latest update: ${trade.name} at ${steps[i]}% in ${zone.name}` : null,
        photoUrls: [],
        reportedAt: reportDate.toISOString(),
        createdAt: reportDate.toISOString(),
        updatedAt: reportDate.toISOString(),
      };

      progressUpdates.get(DEMO_PROJECT_ID)!.push(update);
      previousPercent = steps[i];
    }
  }

  // Generate daily logs for the past 5 days
  const weatherOptions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Clear'];
  const dailyLogData = [
    { daysAgo: 4, weather: 'Sunny', temp: 12, crew: 85, notes: 'Full production day. Structure trade ahead of schedule on Zone C.' },
    { daysAgo: 3, weather: 'Partly Cloudy', temp: 10, crew: 82, notes: 'MEP rough-in started in Zone B. Minor coordination issue with drywall crew resolved on-site.' },
    { daysAgo: 2, weather: 'Overcast', temp: 8, crew: 78, notes: 'Drywall material delivery delayed by 2 hours. Crew redirected to Zone A prep work.' },
    { daysAgo: 1, weather: 'Light Rain', temp: 6, crew: 70, notes: 'Reduced exterior work due to rain. Interior trades maintained full production.' },
    { daysAgo: 0, weather: 'Clear', temp: 9, crew: 88, notes: 'Strong progress day. PPC tracking at 93% for current week.' },
  ];

  for (const entry of dailyLogData) {
    const logDate = new Date();
    logDate.setDate(logDate.getDate() - entry.daysAgo);
    const dateStr = logDate.toISOString().split('T')[0];

    const issues: { description: string; severity: string }[] = [];
    if (entry.daysAgo === 2) {
      issues.push({ description: 'Drywall material delivery 2 hours late', severity: 'medium' });
    }
    if (entry.daysAgo === 1) {
      issues.push({ description: 'Rain affecting exterior work', severity: 'low' });
      issues.push({ description: 'Scaffold inspection due tomorrow', severity: 'medium' });
    }

    const log: DailyLog = {
      id: uuidv4(),
      projectId: DEMO_PROJECT_ID,
      date: dateStr,
      weather: entry.weather,
      temperature: entry.temp,
      crewCount: entry.crew,
      notes: entry.notes,
      issues,
      createdBy: DEMO_USER_ID,
      createdAt: `${dateStr}T07:00:00.000Z`,
      updatedAt: `${dateStr}T17:00:00.000Z`,
    };

    dailyLogs.get(DEMO_PROJECT_ID)!.push(log);
  }

  const totalCommitments = weeklyCommitments.get(DEMO_PROJECT_ID)!.length;
  const totalPPCRecords = ppcRecords.get(DEMO_PROJECT_ID)!.length;
  const totalProgress = progressUpdates.get(DEMO_PROJECT_ID)!.length;
  const totalLogs = dailyLogs.get(DEMO_PROJECT_ID)!.length;

  logger.info(
    {
      projectId: DEMO_PROJECT_ID,
      commitments: totalCommitments,
      ppcRecords: totalPPCRecords,
      progressUpdates: totalProgress,
      dailyLogs: totalLogs,
    },
    'Demo data seeded successfully'
  );
}

// ── Error Handler ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// ── Start Server ────────────────────────────────────────
seedDemoData();

app.listen(PORT, () => {
  logger.info(`progress-service running on port ${PORT}`);
  logger.info('Demo project ID: 00000000-0000-0000-0000-000000000001');
  logger.info('Endpoints:');
  logger.info('  POST   /progress/update');
  logger.info('  GET    /progress/assignment/:assignmentId');
  logger.info('  GET    /progress/zone/:zoneId');
  logger.info('  GET    /progress/trade/:tradeId');
  logger.info('  GET    /progress/project/:projectId');
  logger.info('  POST   /progress/commitments');
  logger.info('  POST   /progress/commitments/bulk');
  logger.info('  GET    /progress/commitments?projectId=&weekStart=');
  logger.info('  PATCH  /progress/commitments/:id');
  logger.info('  POST   /progress/ppc/calculate');
  logger.info('  GET    /progress/ppc/history?projectId=');
  logger.info('  GET    /progress/ppc/current?projectId=');
  logger.info('  GET    /progress/ppc/by-trade?projectId=&weekStart=');
  logger.info('  GET    /progress/variance/history?projectId=');
  logger.info('  GET    /progress/variance/reasons?projectId=');
  logger.info('  POST   /progress/daily-log');
  logger.info('  GET    /progress/daily-log/:projectId/:date');
});

export default app;
