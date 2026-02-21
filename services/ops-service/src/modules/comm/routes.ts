// CommHub Routes — RFI, Transmittals, Meeting Minutes

import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { getCommPolicies } from './utils/policy-client';

const router = Router();

// ─── SUMMARY ────────────────────────────────────────────────────────────────

/**
 * GET /comm/summary/project/:projectId
 * CommHub KPIs dashboard
 */
router.get('/summary/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const [
      totalRfis,
      openRfis,
      overdueRfis,
      totalTransmittals,
      pendingTransmittals,
      totalMeetings,
      meetingsThisMonth,
    ] = await Promise.all([
      prisma.rfi.count({ where: { projectId } }),
      prisma.rfi.count({ where: { projectId, status: { in: ['draft', 'submitted', 'under_review'] } } }),
      prisma.rfi.count({
        where: {
          projectId,
          status: { in: ['submitted', 'under_review'] },
          responseDue: { lt: new Date() },
        },
      }),
      prisma.transmittal.count({ where: { projectId } }),
      prisma.transmittal.count({ where: { projectId, status: { in: ['draft', 'sent', 'received'] } } }),
      prisma.meetingMinute.count({ where: { projectId } }),
      prisma.meetingMinute.count({
        where: {
          projectId,
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Average RFI response time (days)
    const answeredRfis = await prisma.rfi.findMany({
      where: { projectId, respondedDate: { not: null } },
      select: { createdAt: true, respondedDate: true },
    });

    let avgResponseDays: number | null = null;
    if (answeredRfis.length > 0) {
      const totalDays = answeredRfis.reduce((sum, rfi) => {
        const diff = new Date(rfi.respondedDate!).getTime() - new Date(rfi.createdAt).getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgResponseDays = Math.round((totalDays / answeredRfis.length) * 10) / 10;
    }

    const policies = await getCommPolicies(projectId);

    res.json({
      data: {
        totalRfis,
        openRfis,
        overdueRfis,
        avgResponseDays,
        totalTransmittals,
        pendingTransmittals,
        totalMeetings,
        meetingsThisMonth,
        rfiResponseDays: policies.rfiResponseDays,
        escalationModel: policies.escalationModel,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─── RFI ────────────────────────────────────────────────────────────────────

/**
 * GET /comm/rfis/project/:projectId
 * List RFIs for a project with optional filters
 */
router.get('/rfis/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, discipline, priority } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (discipline) where.discipline = discipline as string;
    if (priority) where.priority = priority as string;

    const [rfis, total] = await Promise.all([
      prisma.rfi.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rfi.count({ where }),
    ]);

    res.json({ data: rfis, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /comm/rfis
 * Create a new RFI with auto-generated rfiNumber + policy-aware response due date
 */
router.post('/rfis', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate rfiNumber: RFI-001, RFI-002, etc.
    const lastRfi = await prisma.rfi.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { rfiNumber: true },
    });

    let nextNumber = 1;
    if (lastRfi?.rfiNumber) {
      const match = lastRfi.rfiNumber.match(/RFI-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const rfiNumber = `RFI-${String(nextNumber).padStart(3, '0')}`;

    // Set response due date from policy if not provided
    const policies = await getCommPolicies(projectId);
    let responseDue = req.body.responseDue;
    if (!responseDue) {
      const due = new Date();
      due.setDate(due.getDate() + policies.rfiResponseDays);
      responseDue = due;
    }

    const rfi = await prisma.rfi.create({
      data: {
        ...req.body,
        rfiNumber,
        responseDue,
      },
    });

    res.status(201).json({ data: rfi });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /comm/rfis/:id
 * Update an RFI
 */
router.put('/rfis/:id', async (req, res, next) => {
  try {
    const rfi = await prisma.rfi.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: rfi });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /comm/rfis/:id
 * Delete an RFI
 */
router.delete('/rfis/:id', async (req, res, next) => {
  try {
    await prisma.rfi.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── TRANSMITTALS ───────────────────────────────────────────────────────────

/**
 * GET /comm/transmittals/project/:projectId
 * List transmittals for a project with optional filters
 */
router.get('/transmittals/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [transmittals, total] = await Promise.all([
      prisma.transmittal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transmittal.count({ where }),
    ]);

    res.json({ data: transmittals, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /comm/transmittals
 * Create a new transmittal with auto-generated transmittalNumber
 */
router.post('/transmittals', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate transmittalNumber: TRN-001, TRN-002, etc.
    const lastTransmittal = await prisma.transmittal.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { transmittalNumber: true },
    });

    let nextNumber = 1;
    if (lastTransmittal?.transmittalNumber) {
      const match = lastTransmittal.transmittalNumber.match(/TRN-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const transmittalNumber = `TRN-${String(nextNumber).padStart(3, '0')}`;

    const transmittal = await prisma.transmittal.create({
      data: {
        ...req.body,
        transmittalNumber,
      },
    });

    res.status(201).json({ data: transmittal });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /comm/transmittals/:id
 * Update a transmittal
 */
router.put('/transmittals/:id', async (req, res, next) => {
  try {
    const transmittal = await prisma.transmittal.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: transmittal });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /comm/transmittals/:id
 * Delete a transmittal
 */
router.delete('/transmittals/:id', async (req, res, next) => {
  try {
    await prisma.transmittal.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── MEETING MINUTES ────────────────────────────────────────────────────────

/**
 * GET /comm/meetings/project/:projectId
 * List meeting minutes for a project with optional filters
 */
router.get('/meetings/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, type } = req.query;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status as string;
    if (type) where.type = type as string;

    const [meetings, total] = await Promise.all([
      prisma.meetingMinute.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      prisma.meetingMinute.count({ where }),
    ]);

    res.json({ data: meetings, meta: { total } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /comm/meetings
 * Create new meeting minutes with auto-generated meetingNumber
 */
router.post('/meetings', async (req, res, next) => {
  try {
    const { projectId } = req.body;

    // Auto-generate meetingNumber: MOM-001, MOM-002, etc.
    const lastMeeting = await prisma.meetingMinute.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: { meetingNumber: true },
    });

    let nextNumber = 1;
    if (lastMeeting?.meetingNumber) {
      const match = lastMeeting.meetingNumber.match(/MOM-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const meetingNumber = `MOM-${String(nextNumber).padStart(3, '0')}`;

    const meeting = await prisma.meetingMinute.create({
      data: {
        ...req.body,
        meetingNumber,
      },
    });

    res.status(201).json({ data: meeting });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /comm/meetings/:id
 * Update meeting minutes
 */
router.put('/meetings/:id', async (req, res, next) => {
  try {
    const meeting = await prisma.meetingMinute.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ data: meeting });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /comm/meetings/:id
 * Delete meeting minutes
 */
router.delete('/meetings/:id', async (req, res, next) => {
  try {
    await prisma.meetingMinute.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ─── POLICIES ───────────────────────────────────────────────────────────────

/**
 * GET /comm/policies/:projectId
 * Get contract-driven CommHub policies for a project
 */
router.get('/policies/:projectId', async (req, res, next) => {
  try {
    const policies = await getCommPolicies(req.params.projectId);
    res.json({ data: policies });
  } catch (error) {
    next(error);
  }
});

export default router;
