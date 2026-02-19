// Estimates Routes — Kesif yönetimi

import { Router } from 'express';
import { estimateService } from '../services/estimate.service';
import { createEstimateSchema, addEstimateItemsSchema } from '../schemas';

const router = Router();

/**
 * POST /api/v1/cost/estimates
 * Create new estimate
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createEstimateSchema.parse(req.body);
    const estimate = await estimateService.create(validated);
    res.status(201).json({ data: estimate });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/estimates/project/:projectId
 * Get all estimates for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const estimates = await estimateService.findByProject(req.params.projectId);
    res.json({ data: estimates });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/estimates/:id
 * Get estimate by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const estimate = await estimateService.findById(req.params.id);
    res.json({ data: estimate });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/estimates/:id/items
 * Add items to estimate
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const validated = addEstimateItemsSchema.parse(req.body);
    const result = await estimateService.addItems(req.params.id, validated.items);
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/estimates/generate
 * Auto-generate estimate from metraj
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { projectId, name, type, createdBy } = req.body;
    const estimate = await estimateService.generateFromMetraj(
      projectId,
      name,
      type,
      createdBy
    );
    res.status(201).json({ data: estimate });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cost/estimates/:id/approve
 * Approve estimate
 */
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    const estimate = await estimateService.approve(req.params.id, approvedBy);
    res.json({ data: estimate });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/cost/estimates/:id
 * Delete estimate
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await estimateService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
