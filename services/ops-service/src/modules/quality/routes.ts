// Quality Routes — QualityGate Module
// Inspections, NCRs, Punch Items

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { getQualityPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /quality/summary/project/:projectId
 * Quality KPIs: ftrRate, openNcrs, closedNcrs, totalInspections, passedInspections, copq, openPunchItems, inspectionsThisWeek
 */
router.get('/summary/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      totalInspections,
      passedInspections,
      openNcrs,
      closedNcrs,
      copqResult,
      openPunchItems,
      inspectionsThisWeek,
    ] = await Promise.all([
      // Total inspections
      prisma.inspection.count({
        where: { projectId },
      }),
      // Passed inspections (result = 'pass')
      prisma.inspection.count({
        where: { projectId, result: 'pass' },
      }),
      // Open NCRs (status != 'closed')
      prisma.ncr.count({
        where: { projectId, status: { not: 'closed' } },
      }),
      // Closed NCRs
      prisma.ncr.count({
        where: { projectId, status: 'closed' },
      }),
      // COPQ — sum of reworkCost from NCRs
      prisma.ncr.aggregate({
        where: { projectId },
        _sum: { reworkCost: true },
      }),
      // Open punch items (status != 'closed')
      prisma.punchItem.count({
        where: { projectId, status: { not: 'closed' } },
      }),
      // Inspections this week
      prisma.inspection.count({
        where: {
          projectId,
          scheduledDate: {
            gte: getStartOfWeek(),
            lte: getEndOfWeek(),
          },
        },
      }),
    ]);

    const ftrRate = totalInspections > 0
      ? Math.round((passedInspections / totalInspections) * 10000) / 100
      : 0;

    const copq = copqResult._sum.reworkCost ?? 0;

    // Fetch contract policies for quality thresholds
    const policies = await getQualityPolicies(projectId);
    const ftrMeetsTarget = ftrRate >= policies.ftrThreshold;

    res.json({
      data: {
        ftrRate,
        ftrThreshold: policies.ftrThreshold,
        ftrMeetsTarget,
        openNcrs,
        closedNcrs,
        totalInspections,
        passedInspections,
        copq: policies.copqEnabled ? copq : null,
        copqEnabled: policies.copqEnabled,
        openPunchItems,
        inspectionsThisWeek,
        inspectionFrequency: policies.inspectionFrequency,
        ncrApproval: policies.ncrApproval,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── INSPECTIONS ────────────────────────────────────────────────────────────

/**
 * GET /quality/inspections/project/:projectId
 * List inspections with optional ?status=&type= filters
 */
router.get('/inspections/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [inspections, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.inspection.count({ where }),
    ]);

    res.json({ data: inspections, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /quality/inspections
 * Create inspection
 */
router.post('/inspections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = await prisma.inspection.create({
      data: req.body,
    });
    res.status(201).json({ data: inspection });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /quality/inspections/:id
 * Update inspection
 */
router.put('/inspections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inspection = await prisma.inspection.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: inspection });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /quality/inspections/:id
 * Delete inspection
 */
router.delete('/inspections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.inspection.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── NCRs ───────────────────────────────────────────────────────────────────

/**
 * GET /quality/ncrs/project/:projectId
 * List NCRs with optional ?status=&severity= filters
 */
router.get('/ncrs/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, severity } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (severity) where.severity = severity as string;

    const [ncrs, total] = await Promise.all([
      prisma.ncr.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ncr.count({ where }),
    ]);

    res.json({ data: ncrs, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /quality/ncrs
 * Create NCR (auto-generate ncrNumber as "NCR-001", "NCR-002" etc)
 */
router.post('/ncrs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;

    // Auto-generate ncrNumber based on existing count for this project
    const count = await prisma.ncr.count({ where: { projectId } });
    const ncrNumber = `NCR-${String(count + 1).padStart(3, '0')}`;

    const ncr = await prisma.ncr.create({
      data: {
        ...req.body,
        ncrNumber,
      },
    });
    res.status(201).json({ data: ncr });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /quality/ncrs/:id
 * Update NCR
 */
router.put('/ncrs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ncr = await prisma.ncr.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: ncr });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /quality/ncrs/:id
 * Delete NCR
 */
router.delete('/ncrs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.ncr.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── PUNCH ITEMS ────────────────────────────────────────────────────────────

/**
 * GET /quality/punch-items/project/:projectId
 * List punch items with optional ?status=&priority= filters
 */
router.get('/punch-items/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, priority } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (priority) where.priority = priority as string;

    const [punchItems, total] = await Promise.all([
      prisma.punchItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.punchItem.count({ where }),
    ]);

    res.json({ data: punchItems, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /quality/punch-items
 * Create punch item
 */
router.post('/punch-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const punchItem = await prisma.punchItem.create({
      data: req.body,
    });
    res.status(201).json({ data: punchItem });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /quality/punch-items/:id
 * Update punch item
 */
router.put('/punch-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const punchItem = await prisma.punchItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: punchItem });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /quality/punch-items/:id
 * Delete punch item
 */
router.delete('/punch-items/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.punchItem.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ──────────────────────────────────────────────────────────────

/**
 * GET /quality/policies/:projectId
 * Get contract-driven QualityGate policies for a project
 */
router.get('/policies/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await getQualityPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export default router;
