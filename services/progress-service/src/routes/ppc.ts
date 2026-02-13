import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { calculatePPCSchema } from '../schemas';
import { TradeBreakdown, VarianceReasonEntry, PPCRecord } from '../types';
import {
  ppcRecords,
  getProjectCommitments,
  getProjectPPCRecords,
  nowISO,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/ppc/calculate — Calculate PPC for a specific week
router.post('/progress/ppc/calculate', (req: Request, res: Response) => {
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
router.get('/progress/ppc/history', (req: Request, res: Response) => {
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
router.get('/progress/ppc/current', (req: Request, res: Response) => {
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
router.get('/progress/ppc/by-trade', (req: Request, res: Response) => {
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

export default router;
