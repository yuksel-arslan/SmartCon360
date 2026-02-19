import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createWeeklyCommitmentSchema,
  bulkCreateCommitmentsSchema,
  updateCommitmentSchema,
} from '../schemas';
import { WeeklyCommitment } from '../types';
import {
  weeklyCommitments,
  getProjectCommitments,
  nowISO,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/commitments — Create weekly commitment
router.post('/progress/commitments', (req: Request, res: Response) => {
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
router.post('/progress/commitments/bulk', (req: Request, res: Response) => {
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
router.get('/progress/commitments', (req: Request, res: Response) => {
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
router.patch('/progress/commitments/:id', (req: Request, res: Response) => {
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

export default router;
