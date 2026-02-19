// Cost Records Routes — Maliyet Kayıtları

import { Router } from 'express';
import { costRecordService } from '../services/cost-record.service';
import { createCostRecordSchema } from '../schemas';

const router = Router();

/**
 * POST /cost/cost-records
 * Create new cost record
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createCostRecordSchema.parse(req.body);
    const record = await costRecordService.create(validated);
    res.status(201).json({ data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/cost-records/project/:projectId
 * Get all cost records for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const records = await costRecordService.findByProject(req.params.projectId, {
      type: type as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ data: records });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/cost-records/project/:projectId/totals
 * Get cost totals by type for a project
 */
router.get('/project/:projectId/totals', async (req, res, next) => {
  try {
    const totals = await costRecordService.getTotalByType(req.params.projectId);
    res.json({ data: totals });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/cost-records/:id
 * Get cost record by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const record = await costRecordService.findById(req.params.id);
    res.json({ data: record });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /cost/cost-records/:id
 * Delete cost record
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await costRecordService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
