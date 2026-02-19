import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createDailyLogSchema } from '../schemas';
import { DailyLog } from '../types';
import {
  dailyLogs,
  getProjectDailyLogs,
  nowISO,
  dateToKey,
  validateRequest,
} from '../store';
import { logger } from '../index';

const router = Router();

// POST /progress/daily-log — Submit daily log
router.post('/progress/daily-log', (req: Request, res: Response) => {
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
router.get('/progress/daily-log/:projectId/:date', (req: Request, res: Response) => {
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

export default router;
