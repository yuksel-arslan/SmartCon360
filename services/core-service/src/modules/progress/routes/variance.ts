import { Router, Request, Response } from 'express';
import { getProjectPPCRecords, getProjectCommitments } from '../store';

const router = Router();

// GET /progress/variance/history — Variance trend
router.get('/progress/variance/history', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const sorted = await getProjectPPCRecords(projectId);

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
router.get('/progress/variance/reasons', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string;
  if (!projectId) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'projectId query parameter is required' } });
    return;
  }

  const commitments = await getProjectCommitments(projectId);
  const failedWithReason = commitments.filter(c => c.committed && !c.completed && c.varianceReason);

  const reasonCounts = new Map<string, { category: string; count: number }>();
  for (const c of failedWithReason) {
    if (c.varianceReason) {
      const existing = reasonCounts.get(c.varianceReason) || { category: c.varianceCategory || 'unknown', count: 0 };
      existing.count += 1;
      reasonCounts.set(c.varianceReason, existing);
    }
  }

  const topReasons = Array.from(reasonCounts.entries())
    .map(([reason, data]) => ({ reason, category: data.category, count: data.count }))
    .sort((a, b) => b.count - a.count);

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
    data: { topReasons, byCategory },
    meta: { totalVariances: failedWithReason.length, totalCategories: byCategory.length },
  });
});

export default router;
