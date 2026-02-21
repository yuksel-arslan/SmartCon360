// SupplyChain Routes — Suppliers, Purchase Orders, Deliveries

import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { getSupplyChainPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /supply-chain/summary/project/:projectId
 * SupplyChain KPIs dashboard
 */
router.get('/summary/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [
      totalSuppliers,
      activeSuppliers,
      totalPOs,
      openPOs,
      totalPOAmountAgg,
      totalDeliveries,
      pendingDeliveries,
      overdueDeliveries,
    ] = await Promise.all([
      prisma.supplier.count({ where: { projectId } }),
      prisma.supplier.count({ where: { projectId, status: 'active' } }),
      prisma.purchaseOrder.count({ where: { projectId } }),
      prisma.purchaseOrder.count({ where: { projectId, status: { in: ['draft', 'submitted', 'approved', 'ordered', 'partial_received'] } } }),
      prisma.purchaseOrder.aggregate({
        where: { projectId },
        _sum: { totalAmount: true },
      }),
      prisma.delivery.count({ where: { projectId } }),
      prisma.delivery.count({ where: { projectId, status: { in: ['scheduled', 'in_transit'] } } }),
      prisma.delivery.count({
        where: {
          projectId,
          status: { in: ['scheduled', 'in_transit'] },
          scheduledDate: { lt: new Date() },
        },
      }),
    ]);

    const totalPOAmount = totalPOAmountAgg._sum.totalAmount ?? 0;

    const policies = await getSupplyChainPolicies(projectId);

    res.json({
      data: {
        totalSuppliers,
        activeSuppliers,
        totalPOs,
        openPOs,
        totalPOAmount: Number(totalPOAmount),
        totalDeliveries,
        pendingDeliveries,
        overdueDeliveries,
        procurementResponsibility: policies.procurementResponsibility,
        mrpEnabled: policies.mrpEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── SUPPLIERS ──────────────────────────────────────────────────────────────

/**
 * GET /supply-chain/suppliers/project/:projectId
 */
router.get('/suppliers/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (category) where.category = category as string;

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.supplier.count({ where }),
    ]);

    res.json({ data: suppliers, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /supply-chain/suppliers
 */
router.post('/suppliers', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.create({ data: req.body });
    res.status(201).json({ data: supplier });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /supply-chain/suppliers/:id
 */
router.put('/suppliers/:id', async (req, res, next) => {
  try {
    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: supplier });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /supply-chain/suppliers/:id
 */
router.delete('/suppliers/:id', async (req, res, next) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── PURCHASE ORDERS ────────────────────────────────────────────────────────

/**
 * GET /supply-chain/purchase-orders/project/:projectId
 */
router.get('/purchase-orders/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (category) where.category = category as string;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { supplier: { select: { name: true, code: true } } },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    res.json({ data: orders, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /supply-chain/purchase-orders
 */
router.post('/purchase-orders', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate poNumber: PO-001, PO-002, etc.
    const lastPO = await prisma.purchaseOrder.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });

    let nextNumber = 1;
    if (lastPO?.poNumber) {
      const match = lastPO.poNumber.match(/PO-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const poNumber = `PO-${String(nextNumber).padStart(3, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        ...req.body,
        poNumber,
      },
    });

    res.status(201).json({ data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /supply-chain/purchase-orders/:id
 */
router.put('/purchase-orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: order });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /supply-chain/purchase-orders/:id
 */
router.delete('/purchase-orders/:id', async (req, res, next) => {
  try {
    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── DELIVERIES ─────────────────────────────────────────────────────────────

/**
 * GET /supply-chain/deliveries/project/:projectId
 */
router.get('/deliveries/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.delivery.count({ where }),
    ]);

    res.json({ data: deliveries, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /supply-chain/deliveries
 */
router.post('/deliveries', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate deliveryNumber: DEL-001, DEL-002, etc.
    const lastDel = await prisma.delivery.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { deliveryNumber: true },
    });

    let nextNumber = 1;
    if (lastDel?.deliveryNumber) {
      const match = lastDel.deliveryNumber.match(/DEL-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const deliveryNumber = `DEL-${String(nextNumber).padStart(3, '0')}`;

    const delivery = await prisma.delivery.create({
      data: {
        ...req.body,
        deliveryNumber,
      },
    });

    res.status(201).json({ data: delivery });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /supply-chain/deliveries/:id
 */
router.put('/deliveries/:id', async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: delivery });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /supply-chain/deliveries/:id
 */
router.delete('/deliveries/:id', async (req, res, next) => {
  try {
    await prisma.delivery.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ───────────────────────────────────────────────────────────────

/**
 * GET /supply-chain/policies/:projectId
 */
router.get('/policies/:projectId', async (req, res, next) => {
  try {
    const policies = await getSupplyChainPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
