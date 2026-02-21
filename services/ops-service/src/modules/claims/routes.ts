// Claims Routes — ClaimShield Module
// Change Orders, Claims Register, Delay Events

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { getClaimsPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /claims/summary/project/:projectId
 * ClaimShield KPIs dashboard
 */
router.get('/summary/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      totalChangeOrders,
      pendingChangeOrders,
      approvedChangeOrders,
      totalClaims,
      openClaims,
      resolvedClaims,
      totalDelayEvents,
      criticalPathDelays,
      costImpactAgg,
      amountClaimedAgg,
      amountAwardedAgg,
      delayDaysAgg,
    ] = await Promise.all([
      prisma.changeOrder.count({ where: { projectId } }),
      prisma.changeOrder.count({
        where: { projectId, status: { in: ['submitted', 'under_review'] } },
      }),
      prisma.changeOrder.count({
        where: { projectId, status: 'approved' },
      }),
      prisma.claim.count({ where: { projectId } }),
      prisma.claim.count({
        where: { projectId, status: { notIn: ['resolved', 'rejected'] } },
      }),
      prisma.claim.count({
        where: { projectId, status: 'resolved' },
      }),
      prisma.delayEvent.count({ where: { projectId } }),
      prisma.delayEvent.count({
        where: { projectId, isCriticalPath: true },
      }),
      prisma.changeOrder.aggregate({
        where: { projectId, status: 'approved' },
        _sum: { approvedAmount: true },
      }),
      prisma.claim.aggregate({
        where: { projectId },
        _sum: { amountClaimed: true },
      }),
      prisma.claim.aggregate({
        where: { projectId, status: 'resolved' },
        _sum: { amountAwarded: true },
      }),
      prisma.delayEvent.aggregate({
        where: { projectId },
        _sum: { delayDays: true },
      }),
    ]);

    const policies = await getClaimsPolicies(projectId);

    res.json({
      data: {
        totalChangeOrders,
        pendingChangeOrders,
        approvedChangeOrders,
        totalClaims,
        openClaims,
        resolvedClaims,
        totalDelayEvents,
        criticalPathDelays,
        approvedCostImpact: costImpactAgg._sum.approvedAmount ?? 0,
        totalAmountClaimed: amountClaimedAgg._sum.amountClaimed ?? 0,
        totalAmountAwarded: amountAwardedAgg._sum.amountAwarded ?? 0,
        totalDelayDays: delayDaysAgg._sum.delayDays ?? 0,
        changeOrderType: policies.changeOrderType,
        claimBasis: policies.claimBasis,
        disputeProcedure: policies.disputeProcedure,
        defectsLiabilityMonths: policies.defectsLiabilityMonths,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── CHANGE ORDERS ──────────────────────────────────────────────────────────

/**
 * GET /claims/change-orders/project/:projectId
 * List change orders with optional ?status=&type= filters
 */
router.get('/change-orders/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [changeOrders, total] = await Promise.all([
      prisma.changeOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.changeOrder.count({ where }),
    ]);

    res.json({ data: changeOrders, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /claims/change-orders
 * Create change order with auto-generated coNumber (CO-001, CO-002, etc.)
 */
router.post('/change-orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;

    const count = await prisma.changeOrder.count({ where: { projectId } });
    const coNumber = `CO-${String(count + 1).padStart(3, '0')}`;

    // Auto-fill type from contract policy if not provided
    const policies = await getClaimsPolicies(projectId);
    const type = req.body.type || policies.changeOrderType;

    const changeOrder = await prisma.changeOrder.create({
      data: {
        ...req.body,
        coNumber,
        type,
      },
    });
    res.status(201).json({ data: changeOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /claims/change-orders/:id
 * Update change order
 */
router.put('/change-orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const changeOrder = await prisma.changeOrder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: changeOrder });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /claims/change-orders/:id
 * Delete change order
 */
router.delete('/change-orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.changeOrder.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── CLAIMS REGISTER ────────────────────────────────────────────────────────

/**
 * GET /claims/register/project/:projectId
 * List claims with optional ?status=&type= filters
 */
router.get('/register/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.claim.count({ where }),
    ]);

    res.json({ data: claims, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /claims/register
 * Create claim with auto-generated claimNumber (CLM-001, CLM-002, etc.)
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;

    const count = await prisma.claim.count({ where: { projectId } });
    const claimNumber = `CLM-${String(count + 1).padStart(3, '0')}`;

    // Auto-fill basis from contract policy if not provided
    const policies = await getClaimsPolicies(projectId);
    const basis = req.body.basis || policies.claimBasis;

    const claim = await prisma.claim.create({
      data: {
        ...req.body,
        claimNumber,
        basis,
      },
    });
    res.status(201).json({ data: claim });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /claims/register/:id
 * Update claim
 */
router.put('/register/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const claim = await prisma.claim.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: claim });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /claims/register/:id
 * Delete claim
 */
router.delete('/register/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.claim.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── DELAY EVENTS ───────────────────────────────────────────────────────────

/**
 * GET /claims/delay-events/project/:projectId
 * List delay events with optional ?status=&category= filters
 */
router.get('/delay-events/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (category) where.category = category as string;

    const [events, total] = await Promise.all([
      prisma.delayEvent.findMany({
        where,
        orderBy: { startDate: 'desc' },
      }),
      prisma.delayEvent.count({ where }),
    ]);

    res.json({ data: events, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /claims/delay-events
 * Create delay event with auto-generated eventNumber (DE-001, DE-002, etc.)
 */
router.post('/delay-events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.body;

    const count = await prisma.delayEvent.count({ where: { projectId } });
    const eventNumber = `DE-${String(count + 1).padStart(3, '0')}`;

    const event = await prisma.delayEvent.create({
      data: {
        ...req.body,
        eventNumber,
      },
    });
    res.status(201).json({ data: event });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /claims/delay-events/:id
 * Update delay event
 */
router.put('/delay-events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await prisma.delayEvent.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: event });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /claims/delay-events/:id
 * Delete delay event
 */
router.delete('/delay-events/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.delayEvent.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ──────────────────────────────────────────────────────────────

/**
 * GET /claims/policies/:projectId
 * Get contract-driven ClaimShield policies for a project
 */
router.get('/policies/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await getClaimsPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
