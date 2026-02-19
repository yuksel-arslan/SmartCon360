// EVM Routes — Earned Value Management

import { Router } from 'express';
import { evmService } from '../services/evm.service';
import { createEvmSnapshotSchema } from '../schemas';

const router = Router();

/**
 * POST /api/v1/cost/evm/snapshot
 * Create EVM snapshot
 */
router.post('/snapshot', async (req, res, next) => {
  try {
    const validated = createEvmSnapshotSchema.parse(req.body);
    const metrics = await evmService.createSnapshot(
      validated.projectId,
      new Date(validated.snapshotDate),
      validated.pv,
      validated.ev,
      validated.ac,
      validated.bac
    );
    res.status(201).json({ data: metrics });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/evm/calculate/:projectId
 * Calculate EVM from project data
 */
router.post('/calculate/:projectId', async (req, res, next) => {
  try {
    const { snapshotDate } = req.body;
    const metrics = await evmService.calculateFromProject(
      req.params.projectId,
      snapshotDate ? new Date(snapshotDate) : new Date()
    );
    res.json({ data: metrics });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/evm/project/:projectId/latest
 * Get latest EVM snapshot
 */
router.get('/project/:projectId/latest', async (req, res, next) => {
  try {
    const snapshot = await evmService.getLatest(req.params.projectId);
    res.json({ data: snapshot });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/evm/project/:projectId/history
 * Get EVM history for S-curve
 */
router.get('/project/:projectId/history', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const snapshots = await evmService.getHistory(
      req.params.projectId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ data: snapshots });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/evm/project/:projectId/scurve
 * Get S-curve data for chart
 */
router.get('/project/:projectId/scurve', async (req, res, next) => {
  try {
    const data = await evmService.getSCurveData(req.params.projectId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
