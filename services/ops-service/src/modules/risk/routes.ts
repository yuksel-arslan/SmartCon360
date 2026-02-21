// Risk Routes — RiskRadar Module
// Risk Register, Risk Actions, Heat Map data

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { getRiskPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /risk/summary/project/:projectId
 * RiskRadar KPIs + heat map distribution
 */
router.get('/summary/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      totalRisks,
      openRisks,
      highRisks,
      criticalRisks,
      mitigatingRisks,
      closedRisks,
      costImpactAgg,
      pendingActions,
      overdueActions,
    ] = await Promise.all([
      prisma.risk.count({ where: { projectId } }),
      prisma.risk.count({ where: { projectId, status: { in: ['open', 'mitigating', 'monitoring'] } } }),
      prisma.risk.count({ where: { projectId, riskScore: { gte: 12 } } }),
      prisma.risk.count({ where: { projectId, riskScore: { gte: 20 } } }),
      prisma.risk.count({ where: { projectId, status: 'mitigating' } }),
      prisma.risk.count({ where: { projectId, status: 'closed' } }),
      prisma.risk.aggregate({ where: { projectId, status: { not: 'closed' } }, _sum: { costImpact: true } }),
      prisma.riskAction.count({ where: { projectId, status: 'pending' } }),
      prisma.riskAction.count({
        where: {
          projectId,
          status: { in: ['pending', 'in_progress'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    // Heat map distribution (5x5 matrix)
    const allRisks = await prisma.risk.findMany({
      where: { projectId, status: { not: 'closed' } },
      select: { probability: true, impact: true },
    });

    const heatMap: Record<string, number> = {};
    for (const r of allRisks) {
      const key = `${r.probability}-${r.impact}`;
      heatMap[key] = (heatMap[key] || 0) + 1;
    }

    const policies = await getRiskPolicies(projectId);

    res.json({
      data: {
        totalRisks,
        openRisks,
        highRisks,
        criticalRisks,
        mitigatingRisks,
        closedRisks,
        totalCostExposure: costImpactAgg._sum.costImpact ?? 0,
        pendingActions,
        overdueActions,
        heatMap,
        allocationModel: policies.allocationModel,
        contingencyDefaultPct: policies.contingencyDefaultPct,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── RISKS ──────────────────────────────────────────────────────────────────

/**
 * GET /risk/register/project/:projectId
 * List risks with optional ?status=&category= filters
 */
router.get('/register/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (category) where.category = category as string;

    const [risks, total] = await Promise.all([
      prisma.risk.findMany({ where, orderBy: { riskScore: 'desc' } }),
      prisma.risk.count({ where }),
    ]);

    res.json({ data: risks, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /risk/register
 * Create risk with auto-generated riskNumber (RSK-001, RSK-002, etc.)
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, probability, impact } = req.body;

    const count = await prisma.risk.count({ where: { projectId } });
    const riskNumber = `RSK-${String(count + 1).padStart(3, '0')}`;

    const prob = probability || 3;
    const imp = impact || 3;

    const risk = await prisma.risk.create({
      data: {
        ...req.body,
        riskNumber,
        probability: prob,
        impact: imp,
        riskScore: prob * imp,
      },
    });
    res.status(201).json({ data: risk });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /risk/register/:id
 * Update risk (recalculates riskScore on probability/impact change)
 */
router.put('/register/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body };
    if (data.probability && data.impact) {
      data.riskScore = data.probability * data.impact;
    } else if (data.probability || data.impact) {
      const existing = await prisma.risk.findUnique({ where: { id: req.params.id } });
      if (existing) {
        const p = data.probability || existing.probability;
        const i = data.impact || existing.impact;
        data.riskScore = p * i;
      }
    }

    const risk = await prisma.risk.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ data: risk });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /risk/register/:id
 */
router.delete('/register/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.risk.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── RISK ACTIONS ───────────────────────────────────────────────────────────

/**
 * GET /risk/actions/project/:projectId
 * List risk actions
 */
router.get('/actions/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;

    const [actions, total] = await Promise.all([
      prisma.riskAction.findMany({ where, orderBy: { dueDate: 'asc' } }),
      prisma.riskAction.count({ where }),
    ]);

    res.json({ data: actions, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /risk/actions
 */
router.post('/actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = await prisma.riskAction.create({ data: req.body });
    res.status(201).json({ data: action });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /risk/actions/:id
 */
router.put('/actions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const action = await prisma.riskAction.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: action });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /risk/actions/:id
 */
router.delete('/actions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.riskAction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ──────────────────────────────────────────────────────────────

router.get('/policies/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await getRiskPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
