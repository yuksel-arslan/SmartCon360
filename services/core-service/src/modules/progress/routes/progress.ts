import { Router, Request, Response } from 'express';
import { createProgressUpdateSchema } from '../schemas';
import type { ProgressUpdate } from '../types';
import {
  createProgressUpdate,
  getProjectProgressUpdates,
  getProgressByAssignment,
  getProgressByFilter,
  getLatestProgressForAssignment,
  nowISO,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/update — Submit progress update
router.post('/progress/update', async (req: Request, res: Response) => {
  const validation = validateRequest(createProgressUpdateSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;

  const latest = await getLatestProgressForAssignment(input.projectId, input.assignmentId);
  const previousPercent = latest ? latest.percentComplete : 0;

  let status: ProgressUpdate['status'] = input.status ?? 'in_progress';
  if (input.percentComplete >= 100) {
    status = 'completed';
  } else if (input.percentComplete > 0 && status === 'not_started') {
    status = 'in_progress';
  }

  const update = await createProgressUpdate({
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
  });

  logger.info({ projectId: input.projectId, assignmentId: input.assignmentId, percent: input.percentComplete }, 'Progress update recorded');
  res.status(201).json({ data: update });
});

// GET /progress/assignment/:assignmentId
router.get('/progress/assignment/:assignmentId', async (req: Request, res: Response) => {
  const { assignmentId } = req.params;
  const projectId = req.query.projectId as string | undefined;
  const results = await getProgressByAssignment(assignmentId, projectId);
  res.json({ data: results, meta: { count: results.length } });
});

// GET /progress/zone/:zoneId
router.get('/progress/zone/:zoneId', async (req: Request, res: Response) => {
  const { zoneId } = req.params;
  const projectId = req.query.projectId as string | undefined;
  const results = await getProgressByFilter({ zoneId }, projectId);
  res.json({ data: results, meta: { count: results.length } });
});

// GET /progress/trade/:tradeId
router.get('/progress/trade/:tradeId', async (req: Request, res: Response) => {
  const { tradeId } = req.params;
  const projectId = req.query.projectId as string | undefined;
  const results = await getProgressByFilter({ tradeId }, projectId);
  res.json({ data: results, meta: { count: results.length } });
});

// GET /progress/project/:projectId
router.get('/progress/project/:projectId', async (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '50', 10);
  const { data, total } = await getProjectProgressUpdates(projectId, page, limit);
  res.json({
    data,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
