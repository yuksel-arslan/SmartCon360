// Safety Routes — SafeZone: Incidents, PTW, Observations, Toolbox Talks

import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { getSafetyPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /safety/summary/project/:projectId
 * Safety KPIs dashboard
 */
router.get('/summary/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [
      totalIncidents,
      openIncidents,
      nearMisses,
      lostTimeIncidents,
      lostDaysAgg,
      lastIncident,
      activePtws,
      openObservations,
      toolboxTalksThisMonth,
    ] = await Promise.all([
      prisma.incident.count({ where: { projectId } }),
      prisma.incident.count({
        where: { projectId, status: { not: 'closed' } },
      }),
      prisma.incident.count({
        where: { projectId, type: 'near_miss' },
      }),
      prisma.incident.count({
        where: { projectId, type: 'lost_time' },
      }),
      prisma.incident.aggregate({
        where: { projectId },
        _sum: { lostDays: true },
      }),
      prisma.incident.findFirst({
        where: { projectId },
        orderBy: { occurredAt: 'desc' },
        select: { occurredAt: true },
      }),
      prisma.permitToWork.count({
        where: { projectId, status: 'active' },
      }),
      prisma.safetyObservation.count({
        where: { projectId, status: { in: ['open', 'in_progress'] } },
      }),
      prisma.toolboxTalk.count({
        where: {
          projectId,
          conductedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    const lostDays = lostDaysAgg._sum.lostDays ?? 0;

    // Days since last incident
    let daysSinceLastIncident: number | null = null;
    if (lastIncident?.occurredAt) {
      const diff = Date.now() - new Date(lastIncident.occurredAt).getTime();
      daysSinceLastIncident = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // LTIR = (Lost Time Incidents * 200,000) / Total Hours Worked
    // Simplified: assume 2000 hours/worker/year, estimate from incident count
    const estimatedTotalHours = Math.max(totalIncidents * 5000, 200000);
    const ltir =
      totalIncidents > 0
        ? Number(((lostTimeIncidents * 200000) / estimatedTotalHours).toFixed(2))
        : 0;

    // Fetch contract policies for safety configuration
    const policies = await getSafetyPolicies(projectId);

    res.json({
      data: {
        totalIncidents,
        openIncidents,
        nearMisses,
        lostTimeDays: lostDays,
        daysSinceLastIncident,
        activePtws,
        openObservations,
        toolboxTalksThisMonth,
        ltir,
        reportingLevel: policies.reportingLevel,
        ptwStrictness: policies.ptwStrictness,
        toolboxFrequency: policies.toolboxFrequency,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── INCIDENTS ──────────────────────────────────────────────────────────────

/**
 * GET /safety/incidents/project/:projectId
 * List incidents for a project with optional filters
 */
router.get('/incidents/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
      }),
      prisma.incident.count({ where }),
    ]);

    res.json({ data: incidents, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /safety/incidents
 * Create a new incident with auto-generated incidentNumber
 */
router.post('/incidents', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate incidentNumber: INC-001, INC-002, etc.
    const lastIncident = await prisma.incident.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { incidentNumber: true },
    });

    let nextNumber = 1;
    if (lastIncident?.incidentNumber) {
      const match = lastIncident.incidentNumber.match(/INC-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const incidentNumber = `INC-${String(nextNumber).padStart(3, '0')}`;

    const incident = await prisma.incident.create({
      data: {
        ...req.body,
        incidentNumber,
      },
    });

    res.status(201).json({ data: incident });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /safety/incidents/:id
 * Update an incident
 */
router.put('/incidents/:id', async (req, res, next) => {
  try {
    const incident = await prisma.incident.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: incident });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /safety/incidents/:id
 * Delete an incident
 */
router.delete('/incidents/:id', async (req, res, next) => {
  try {
    await prisma.incident.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── PERMIT TO WORK ─────────────────────────────────────────────────────────

/**
 * GET /safety/ptw/project/:projectId
 * List permits to work for a project with optional filters
 */
router.get('/ptw/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [permits, total] = await Promise.all([
      prisma.permitToWork.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.permitToWork.count({ where }),
    ]);

    res.json({ data: permits, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /safety/ptw
 * Create a new permit to work with auto-generated permitNumber
 */
router.post('/ptw', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate permitNumber: PTW-001, PTW-002, etc.
    const lastPermit = await prisma.permitToWork.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { permitNumber: true },
    });

    let nextNumber = 1;
    if (lastPermit?.permitNumber) {
      const match = lastPermit.permitNumber.match(/PTW-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const permitNumber = `PTW-${String(nextNumber).padStart(3, '0')}`;

    const permit = await prisma.permitToWork.create({
      data: {
        ...req.body,
        permitNumber,
      },
    });

    res.status(201).json({ data: permit });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /safety/ptw/:id
 * Update a permit to work
 */
router.put('/ptw/:id', async (req, res, next) => {
  try {
    const permit = await prisma.permitToWork.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: permit });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /safety/ptw/:id
 * Delete a permit to work
 */
router.delete('/ptw/:id', async (req, res, next) => {
  try {
    await prisma.permitToWork.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── SAFETY OBSERVATIONS ────────────────────────────────────────────────────

/**
 * GET /safety/observations/project/:projectId
 * List safety observations for a project with optional filters
 */
router.get('/observations/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [observations, total] = await Promise.all([
      prisma.safetyObservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.safetyObservation.count({ where }),
    ]);

    res.json({ data: observations, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /safety/observations
 * Create a new safety observation
 */
router.post('/observations', async (req, res, next) => {
  try {
    const observation = await prisma.safetyObservation.create({
      data: req.body,
    });
    res.status(201).json({ data: observation });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /safety/observations/:id
 * Update a safety observation
 */
router.put('/observations/:id', async (req, res, next) => {
  try {
    const observation = await prisma.safetyObservation.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: observation });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /safety/observations/:id
 * Delete a safety observation
 */
router.delete('/observations/:id', async (req, res, next) => {
  try {
    await prisma.safetyObservation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── TOOLBOX TALKS ──────────────────────────────────────────────────────────

/**
 * GET /safety/toolbox-talks/project/:projectId
 * List toolbox talks for a project
 */
router.get('/toolbox-talks/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [talks, total] = await Promise.all([
      prisma.toolboxTalk.findMany({
        where: { projectId },
        orderBy: { conductedAt: 'desc' },
      }),
      prisma.toolboxTalk.count({ where: { projectId } }),
    ]);

    res.json({ data: talks, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /safety/toolbox-talks
 * Create a new toolbox talk
 */
router.post('/toolbox-talks', async (req, res, next) => {
  try {
    const talk = await prisma.toolboxTalk.create({
      data: req.body,
    });
    res.status(201).json({ data: talk });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /safety/toolbox-talks/:id
 * Delete a toolbox talk
 */
router.delete('/toolbox-talks/:id', async (req, res, next) => {
  try {
    await prisma.toolboxTalk.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ──────────────────────────────────────────────────────────────

/**
 * GET /safety/policies/:projectId
 * Get contract-driven SafeZone policies for a project
 */
router.get('/policies/:projectId', async (req, res, next) => {
  try {
    const policies = await getSafetyPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
