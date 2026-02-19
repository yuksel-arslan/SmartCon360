// Unit Price Analysis Routes — Birim Fiyat Analizi

import { Router } from 'express';
import { unitPriceService } from '../services/unit-price.service';
import { createUnitPriceAnalysisSchema } from '../schemas';

const router = Router();

/**
 * POST /cost/unit-prices
 * Create new unit price analysis
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createUnitPriceAnalysisSchema.parse(req.body);
    const analysis = await unitPriceService.create(validated);
    res.status(201).json({ data: analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/unit-prices/work-item/:workItemId
 * Get all unit price analyses for a work item
 */
router.get('/work-item/:workItemId', async (req, res, next) => {
  try {
    const analyses = await unitPriceService.findByWorkItem(req.params.workItemId);
    res.json({ data: analyses });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/unit-prices/work-item/:workItemId/latest
 * Get latest active unit price for a work item
 */
router.get('/work-item/:workItemId/latest', async (req, res, next) => {
  try {
    const analysis = await unitPriceService.findLatestByWorkItem(req.params.workItemId);
    res.json({ data: analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/unit-prices/:id
 * Get unit price analysis by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const analysis = await unitPriceService.findById(req.params.id);
    res.json({ data: analysis });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /cost/unit-prices/:id
 * Update unit price analysis (creates new version)
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validated = createUnitPriceAnalysisSchema.parse(req.body);
    const analysis = await unitPriceService.update(req.params.id, validated);
    res.json({ data: analysis });
  } catch (error) {
    next(error);
  }
});

export default router;
