// Quantity Takeoff Routes — Metraj Cetveli

import { Router } from 'express';
import { quantityTakeoffService } from '../services/quantity-takeoff.service';
import { createQuantityTakeoffSchema, updateQuantityTakeoffSchema } from '../schemas';

const router = Router();

/**
 * POST /cost/quantity-takeoffs
 * Create new quantity takeoff entry
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createQuantityTakeoffSchema.parse(req.body);
    const takeoff = await quantityTakeoffService.create(validated);
    res.status(201).json({ data: takeoff });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/quantity-takeoffs/project/:projectId
 * Get all quantity takeoffs for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { workItemId, locationId } = req.query;
    const takeoffs = await quantityTakeoffService.findByProject(req.params.projectId, {
      workItemId: workItemId as string,
      locationId: locationId as string,
    });
    res.json({ data: takeoffs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/quantity-takeoffs/project/:projectId/summary
 * Get quantity takeoff summary grouped by work item
 */
router.get('/project/:projectId/summary', async (req, res, next) => {
  try {
    const summary = await quantityTakeoffService.getSummary(req.params.projectId);
    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/quantity-takeoffs/:id
 * Get quantity takeoff by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const takeoff = await quantityTakeoffService.findById(req.params.id);
    res.json({ data: takeoff });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /cost/quantity-takeoffs/:id
 * Update quantity takeoff
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateQuantityTakeoffSchema.parse(req.body);
    const takeoff = await quantityTakeoffService.update(req.params.id, validated);
    res.json({ data: takeoff });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /cost/quantity-takeoffs/:id
 * Delete quantity takeoff
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await quantityTakeoffService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
