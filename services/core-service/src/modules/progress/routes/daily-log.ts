import { Router, Request, Response } from 'express';
import { createDailyLogSchema } from '../schemas';
import {
  createOrUpdateDailyLog,
  getDailyLogByDate,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/daily-log — Submit daily log
router.post('/progress/daily-log', async (req: Request, res: Response) => {
  const validation = validateRequest(createDailyLogSchema, req.body);
  if (!validation.success) {
    res.status(400).json({ error: { code: 'VALIDATION', message: validation.error } });
    return;
  }

  const input = validation.data;

  const log = await createOrUpdateDailyLog({
    projectId: input.projectId,
    date: input.date,
    weather: input.weather ?? null,
    temperature: input.temperature ?? null,
    crewCount: input.crewCount ?? null,
    notes: input.notes ?? null,
    issues: input.issues ?? [],
    createdBy: input.createdBy,
  });

  logger.info({ projectId: input.projectId, date: input.date }, 'Daily log saved');
  res.status(201).json({ data: log });
});

// GET /progress/daily-log/:projectId/:date — Get daily log for a date
router.get('/progress/daily-log/:projectId/:date', async (req: Request, res: Response) => {
  const { projectId, date } = req.params;

  const log = await getDailyLogByDate(projectId, date);

  if (!log) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No daily log found for ${date}` } });
    return;
  }

  res.json({ data: log });
});

export default router;
