import { Router, Request, Response } from 'express';
import {
  CreateConstraintSchema,
  UpdateConstraintSchema,
  ResolveConstraintSchema,
  ListConstraintsQuerySchema,
} from '../schemas';
import {
  createConstraint,
  getConstraintById,
  updateConstraint,
  deleteConstraint,
  listConstraints,
  getConstraintStats,
  getCRR,
  validateRequest,
} from '../store';

const router = Router();

/**
 * GET /constraints
 * List constraints with optional filters
 */
router.get('/', async (req: Request, res: Response) => {
  const validation = validateRequest(ListConstraintsQuerySchema, req.query);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const { page, limit, overdue, ...filters } = validation.data;

  const allConstraints = await listConstraints({
    ...filters,
    overdue: overdue === 'true',
  });

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedConstraints = allConstraints.slice(startIndex, endIndex);

  return res.json({
    data: paginatedConstraints,
    meta: {
      total: allConstraints.length,
      page,
      limit,
      totalPages: Math.ceil(allConstraints.length / limit),
    },
  });
});

/**
 * POST /constraints
 * Create a new constraint
 */
router.post('/', async (req: Request, res: Response) => {
  const validation = validateRequest(CreateConstraintSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const constraint = await createConstraint({
    ...validation.data,
    status: 'open',
    dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
  });

  return res.status(201).json({ data: constraint });
});

/**
 * GET /constraints/stats
 * Get constraint statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const stats = await getConstraintStats(projectId);
  return res.json({ data: stats });
});

/**
 * GET /constraints/crr
 * Get Constraint Removal Rate data
 */
router.get('/crr', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const weeks = req.query.weeks ? parseInt(req.query.weeks as string, 10) : 6;
  const crr = await getCRR(projectId, weeks);
  return res.json({ data: crr });
});

/**
 * GET /constraints/lookahead
 * Get constraints in lookahead window (next 6 weeks)
 */
router.get('/lookahead', async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const allConstraints = await listConstraints({ projectId, status: 'open' });

  const now = new Date();
  const sixWeeksFromNow = new Date(now);
  sixWeeksFromNow.setDate(sixWeeksFromNow.getDate() + 42);

  const lookaheadConstraints = allConstraints.filter((c) => {
    if (!c.dueDate) return true;
    return c.dueDate >= now && c.dueDate <= sixWeeksFromNow;
  });

  return res.json({ data: lookaheadConstraints });
});

/**
 * GET /constraints/by-zone/:zoneId
 * Get constraints for a specific zone
 */
router.get('/by-zone/:zoneId', async (req: Request, res: Response) => {
  const constraints = await listConstraints({ zoneId: req.params.zoneId });
  return res.json({ data: constraints });
});

/**
 * GET /constraints/by-trade/:tradeId
 * Get constraints for a specific trade
 */
router.get('/by-trade/:tradeId', async (req: Request, res: Response) => {
  const constraints = await listConstraints({ tradeId: req.params.tradeId });
  return res.json({ data: constraints });
});

/**
 * GET /constraints/:id
 * Get a specific constraint by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  const constraint = await getConstraintById(req.params.id);
  if (!constraint) {
    return res.status(404).json({ error: 'Constraint not found' });
  }
  return res.json({ data: constraint });
});

/**
 * PATCH /constraints/:id
 * Update a constraint
 */
router.patch('/:id', async (req: Request, res: Response) => {
  const validation = validateRequest(UpdateConstraintSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const updates: Record<string, unknown> = { ...validation.data };
  if (validation.data.dueDate) {
    updates.dueDate = new Date(validation.data.dueDate);
  }

  const updated = await updateConstraint(req.params.id, updates as Partial<import('../types').Constraint>);
  if (!updated) {
    return res.status(404).json({ error: 'Constraint not found' });
  }

  return res.json({ data: updated });
});

/**
 * PATCH /constraints/:id/resolve
 * Mark constraint as resolved
 */
router.patch('/:id/resolve', async (req: Request, res: Response) => {
  const validation = validateRequest(ResolveConstraintSchema, req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }

  const updated = await updateConstraint(req.params.id, {
    status: 'resolved',
    resolvedDate: new Date(),
    resolutionNotes: validation.data.resolutionNotes,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Constraint not found' });
  }

  return res.json({ data: updated });
});

/**
 * DELETE /constraints/:id
 * Delete a constraint
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const success = await deleteConstraint(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Constraint not found' });
  }
  return res.status(204).send();
});

export default router;
