// Work Items Routes — Poz yönetimi

import { Router } from 'express';
import { workItemService } from '../services/work-item.service';
import { createWorkItemSchema, updateWorkItemSchema, queryParamsSchema } from '../schemas';
import { ValidationError } from '../utils/errors';

const router = Router();

/**
 * POST /api/v1/cost/work-items
 * Create new work item
 */
router.post('/', async (req, res, next) => {
  try {
    const validated = createWorkItemSchema.parse(req.body);
    const workItem = await workItemService.create(validated);
    res.status(201).json({ data: workItem });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/work-items/project/:projectId
 * Get all work items for a project
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const query = queryParamsSchema.parse(req.query);

    const { items, total } = await workItemService.findByProject(projectId, {
      category: query.category,
      search: query.search,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    res.json({
      data: items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/work-items/:id
 * Get work item by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const workItem = await workItemService.findById(req.params.id);
    res.json({ data: workItem });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/cost/work-items/:id
 * Update work item
 */
router.put('/:id', async (req, res, next) => {
  try {
    const validated = updateWorkItemSchema.parse(req.body);
    const workItem = await workItemService.update(req.params.id, validated);
    res.json({ data: workItem });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/cost/work-items/:id
 * Delete work item
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await workItemService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/cost/work-items/project/:projectId/categories
 * Get work item categories for a project
 */
router.get('/project/:projectId/categories', async (req, res, next) => {
  try {
    const categories = await workItemService.getCategories(req.params.projectId);
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

export default router;
