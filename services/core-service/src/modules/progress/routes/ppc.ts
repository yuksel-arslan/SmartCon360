import { Router, Request, Response } from 'express';
import { calculatePPCSchema } from '../schemas';
import type { TradeBreakdown, VarianceReasonEntry } from '../types';
import {
  savePPCRecord,
  getProjectCommitments,
  getProjectPPCRecords,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/ppc/calculate — Calculate PPC for a specific week
router.post('/progress/ppc/calculate', async (req: Request, res: Response) => {
  const validation = validateRequest(calculatePPCSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const { projectId, weekStart, weekEnd } = validation.data;

  const projectCommitments = await getProjectCommitments(projectId, weekStart);
  const weekCommitments = projectCommitments.filter(c => c.committed);

  if (weekCommitments.length === 0) {
    res.status(404).json({
      error: { code: 'NO_COMMITMENTS', message: `No commitments found for project ${projectId} week starting ${weekStart}` },
    });
    return;
  }

  const totalCommitted = weekCommitments.length;
  const totalCompleted = weekCommitments.filter(c => c.completed).length;
  const ppcPercent = Math.round((totalCompleted / totalCommitted) * 100 * 10) / 10;

  // Group by trade
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

  // Variance reasons
  const failedWithReason = weekCommitments.filter(c => !c.completed && c.varianceReason);
  const reasonMap = new Map<string, { category: string; count: number }>();
  for (const c of failedWithReason) {
    if (c.varianceReason) {
      const existing = reasonMap.get(c.varianceReason) || { category: c.varianceCategory || 'unknown', count: 0 };
      existing.count += 1;
      reasonMap.set(c.varianceReason, existing);
    }
  }

  const topVarianceReasons: VarianceReasonEntry[] = Array.from(reasonMap.entries())
    .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const record = await savePPCRecord({
    projectId,
    weekStart,
    weekEnd,
    totalCommitted,
    totalCompleted,
    ppcPercent,
    byTrade,
    topVarianceReasons,
  });

  logger.info({ projectId, weekStart, ppc: ppcPercent, committed: totalCommitted, completed: totalCompleted }, 'PPC calculated');
  res.status(201).json({ data: record });
});

// GET /progress/ppc/history
router.get('/progress/ppc/history', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const sorted = await getProjectPPCRecords(projectId);
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

// GET /progress/ppc/current
router.get('/progress/ppc/current', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = await getProjectPPCRecords(projectId);
  if (records.length === 0) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No PPC records found for this project' } });
    return;
  }

  const current = records[records.length - 1];
  const previous = records.length >= 2 ? records[records.length - 2] : null;
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

// GET /progress/ppc/by-trade
router.get('/progress/ppc/by-trade', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  const weekStart = req.query.weekStart as string | undefined;

  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const records = await getProjectPPCRecords(projectId);
  let targetRecord = weekStart
    ? records.find(r => r.weekStart === weekStart)
    : records[records.length - 1];

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
