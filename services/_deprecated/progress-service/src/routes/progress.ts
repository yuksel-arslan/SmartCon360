import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createProgressUpdateSchema } from '../schemas';
import { ProgressUpdate } from '../types';
import {
  progressUpdates,
  getProjectProgressUpdates,
  nowISO,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/update — Submit progress update
router.post('/progress/update', (req: Request, res: Response) => {
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
router.get('/progress/assignment/:assignmentId', (req: Request, res: Response) => {
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
router.get('/progress/zone/:zoneId', (req: Request, res: Response) => {
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
router.get('/progress/trade/:tradeId', (req: Request, res: Response) => {
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
router.get('/progress/project/:projectId', (req: Request, res: Response) => {
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

export default router;
