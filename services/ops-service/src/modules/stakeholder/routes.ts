// StakeHub Routes — Stakeholder Register, Engagement Actions

import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { getStakeholderPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

router.get('/summary/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [
      totalStakeholders,
      activeStakeholders,
      totalActions,
      pendingActions,
      overdueActions,
    ] = await Promise.all([
      prisma.stakeholder.count({ where: { projectId } }),
      prisma.stakeholder.count({ where: { projectId, status: 'active' } }),
      prisma.engagementAction.count({ where: { projectId } }),
      prisma.engagementAction.count({ where: { projectId, status: { in: ['planned', 'in_progress'] } } }),
      prisma.engagementAction.count({
        where: {
          projectId,
          status: { in: ['planned', 'in_progress'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    // Engagement distribution
    const engagementDistribution = await prisma.stakeholder.groupBy({
      by: ['engagement'],
      where: { projectId, status: 'active' },
      _count: { id: true },
    });
    const engagementMap: Record<string, number> = {};
    for (const e of engagementDistribution) {
      engagementMap[e.engagement] = e._count.id;
    }

    // Influence/Interest quadrants
    const highInfluenceHighInterest = await prisma.stakeholder.count({
      where: { projectId, status: 'active', influence: { gte: 4 }, interest: { gte: 4 } },
    });

    const policies = await getStakeholderPolicies(projectId);

    res.json({
      data: {
        totalStakeholders,
        activeStakeholders,
        totalActions,
        pendingActions,
        overdueActions,
        highInfluenceHighInterest,
        engagementDistribution: engagementMap,
        reportingFrequency: policies.reportingFrequency,
        engagementLevel: policies.engagementLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── STAKEHOLDERS ───────────────────────────────────────────────────────────

router.get('/register/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { category, engagement, status } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (category) where.category = category as string;
    if (engagement) where.engagement = engagement as string;
    if (status) where.status = status as string;

    const [stakeholders, total] = await Promise.all([
      prisma.stakeholder.findMany({ where, orderBy: { name: 'asc' } }),
      prisma.stakeholder.count({ where }),
    ]);

    res.json({ data: stakeholders, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const stakeholder = await prisma.stakeholder.create({ data: req.body });
    res.status(201).json({ data: stakeholder });
  } catch (error) {
    next(error);
  }
});

router.put('/register/:id', async (req, res, next) => {
  try {
    const stakeholder = await prisma.stakeholder.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: stakeholder });
  } catch (error) {
    next(error);
  }
});

router.delete('/register/:id', async (req, res, next) => {
  try {
    await prisma.stakeholder.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── ENGAGEMENT ACTIONS ─────────────────────────────────────────────────────

router.get('/actions/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [actions, total] = await Promise.all([
      prisma.engagementAction.findMany({ where, orderBy: { createdAt: 'desc' } }),
      prisma.engagementAction.count({ where }),
    ]);

    res.json({ data: actions, meta: { total } });
  } catch (error) {
    next(error);
  }
});

router.post('/actions', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    const lastAction = await prisma.engagementAction.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { actionNumber: true },
    });

    let nextNumber = 1;
    if (lastAction?.actionNumber) {
      const match = lastAction.actionNumber.match(/EA-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const actionNumber = `EA-${String(nextNumber).padStart(3, '0')}`;

    const action = await prisma.engagementAction.create({
      data: { ...req.body, actionNumber },
    });

    res.status(201).json({ data: action });
  } catch (error) {
    next(error);
  }
});

router.put('/actions/:id', async (req, res, next) => {
  try {
    const action = await prisma.engagementAction.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: action });
  } catch (error) {
    next(error);
  }
});

router.delete('/actions/:id', async (req, res, next) => {
  try {
    await prisma.engagementAction.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ───────────────────────────────────────────────────────────────

router.get('/policies/:projectId', async (req, res, next) => {
  try {
    const policies = await getStakeholderPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
