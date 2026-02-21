// Resource Routes — CrewFlow Module
// Crews, Equipment, Materials, Scaffolds

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { getCrewFlowPolicies } from './policy-client';

const router = Router();

// ─── HEALTH ──────────────────────────────────────────────────────────────────

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', module: 'resource' });
});

// ─── POLICIES ────────────────────────────────────────────────────────────────

router.get('/policies/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await getCrewFlowPolicies(req.params.projectId);
    res.json({ data: policies, error: null });
  } catch (error) {
    next(error);
  }
});

// ─── SUMMARY ─────────────────────────────────────────────────────────────────

router.get('/summary/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const [
      totalCrews, activeCrews, crewAgg,
      totalEquipment, operationalEquipment, underMaintenance,
      totalMaterials, lowStockItems, materialAgg,
      activeScaffolds, inspectionsDue, scaffoldAgg,
    ] = await Promise.all([
      prisma.crew.count({ where: { projectId } }),
      prisma.crew.count({ where: { projectId, status: 'active' } }),
      prisma.crew.aggregate({ where: { projectId, status: 'active' }, _sum: { workerCount: true }, _avg: { utilization: true } }),
      prisma.equipmentItem.count({ where: { projectId } }),
      prisma.equipmentItem.count({ where: { projectId, status: 'operational' } }),
      prisma.equipmentItem.count({ where: { projectId, status: 'under_maintenance' } }),
      prisma.materialItem.count({ where: { projectId } }),
      prisma.materialItem.count({ where: { projectId, status: 'low_stock' } }),
      prisma.materialItem.aggregate({ where: { projectId }, _avg: { wasteQty: true } }),
      prisma.scaffold.count({ where: { projectId, status: { in: ['erected', 'in_use'] } } }),
      prisma.scaffold.count({ where: { projectId, status: 'inspection_due' } }),
      prisma.scaffold.aggregate({ where: { projectId, status: { in: ['erected', 'in_use'] } }, _sum: { areaSqm: true } }),
    ]);

    res.json({
      data: {
        totalCrews,
        activeCrews,
        totalWorkers: crewAgg._sum.workerCount || 0,
        activeWorkers: crewAgg._sum.workerCount || 0,
        avgUtilization: crewAgg._avg.utilization ? Number(crewAgg._avg.utilization).toFixed(1) : '0.0',
        totalEquipment,
        operationalEquipment,
        underMaintenance,
        totalMaterials,
        lowStockItems,
        totalWasteRate: materialAgg._avg.wasteQty ? Number(materialAgg._avg.wasteQty).toFixed(1) : '0.0',
        activeScaffolds,
        inspectionsDue,
        totalScaffoldArea: scaffoldAgg._sum.areaSqm ? Number(scaffoldAgg._sum.areaSqm).toFixed(1) : '0.0',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── CREWS ───────────────────────────────────────────────────────────────────

router.get('/crews/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.crew.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.crew.count({ where }),
    ]);

    res.json({ data, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/crews', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crew = await prisma.crew.create({ data: req.body });
    res.status(201).json({ data: crew });
  } catch (error) {
    next(error);
  }
});

router.put('/crews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const crew = await prisma.crew.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: crew });
  } catch (error) {
    next(error);
  }
});

router.delete('/crews/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.crew.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── EQUIPMENT ───────────────────────────────────────────────────────────────

router.get('/equipment/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      prisma.equipmentItem.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.equipmentItem.count({ where }),
    ]);

    res.json({ data, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.equipmentItem.create({ data: req.body });
    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/equipment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.equipmentItem.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/equipment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.equipmentItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── MATERIALS ───────────────────────────────────────────────────────────────

router.get('/materials/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status, category } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      prisma.materialItem.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.materialItem.count({ where }),
    ]);

    res.json({ data, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/materials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.materialItem.create({ data: req.body });
    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/materials/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.materialItem.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/materials/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.materialItem.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── SCAFFOLDS ───────────────────────────────────────────────────────────────

router.get('/scaffolds/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.scaffold.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.scaffold.count({ where }),
    ]);

    res.json({ data, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/scaffolds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scaffold = await prisma.scaffold.create({ data: req.body });
    res.status(201).json({ data: scaffold });
  } catch (error) {
    next(error);
  }
});

router.put('/scaffolds/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scaffold = await prisma.scaffold.update({ where: { id: req.params.id }, data: req.body });
    res.json({ data: scaffold });
  } catch (error) {
    next(error);
  }
});

router.delete('/scaffolds/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.scaffold.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
