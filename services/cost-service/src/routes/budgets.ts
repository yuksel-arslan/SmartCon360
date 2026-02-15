// Budget Routes — Bütçe Yönetimi

import { Router } from 'express';
import { budgetService } from '../services/budget.service';
import { createBudgetSchema, addBudgetItemsSchema } from '../schemas';

const router = Router();

/**
 * POST /cost/budgets
 * Create new budget
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createBudgetSchema.parse(req.body);
    const budget = await budgetService.create(validated);
    res.status(201).json({ data: budget });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/budgets/project/:projectId
 * Get all budgets for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const budgets = await budgetService.findByProject(req.params.projectId);
    res.json({ data: budgets });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/budgets/:id
 * Get budget by ID with items
 */
router.get('/:id', async (req, res, next) => {
  try {
    const budget = await budgetService.findById(req.params.id);
    res.json({ data: budget });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cost/budgets/:id/items
 * Add items to budget
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const validated = addBudgetItemsSchema.parse(req.body);
    const budget = await budgetService.addItems(req.params.id, validated.items);
    res.json({ data: budget });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cost/budgets/from-estimate/:estimateId
 * Create budget from estimate
 */
router.post('/from-estimate/:estimateId', async (req, res, next) => {
  try {
    const { name } = req.body;
    const budget = await budgetService.createFromEstimate(req.params.estimateId, name);
    res.json({ data: budget });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /cost/budgets/:id/approve
 * Approve budget
 */
router.post('/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    const budget = await budgetService.approve(req.params.id, approvedBy);
    res.json({ data: budget });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cost/budgets/:id/variance
 * Get budget variance report
 */
router.get('/:id/variance', async (req, res, next) => {
  try {
    const variance = await budgetService.getVariance(req.params.id);
    res.json({ data: variance });
  } catch (error) {
    next(error);
  }
});

export default router;
