import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generateTaktGrid,
  calculateTotalPeriods,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
} from '../utils/takt-calculator';
import { validatePlan, type TradeInfo } from '../utils/warning-detector';

const router = Router();

export default function planRoutes(prisma: PrismaClient) {
  /**
   * POST /projects/:id/plan/generate
   *
   * AI-1 Core: Auto-generate a takt plan from project's locations and trades.
   * Layer 1 — template-based, no AI API dependency.
   * Now persists to PostgreSQL via Prisma.
   */
  router.post('/projects/:id/plan/generate', async (req, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.headers['x-user-id'] as string;

      // 1. Load project with locations and trades
      const project = await prisma.project.findFirst({
        where: { id: projectId, ...(userId ? { ownerId: userId } : {}) },
        include: {
          locations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
          trades: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        },
      });

      if (!project) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Project not found' },
        });
      }

      // 2. Extract takt zones (only zone-type locations)
      const zoneLocations = project.locations.filter((l) => l.locationType === 'zone');
      if (zoneLocations.length === 0) {
        return res.status(400).json({
          data: null,
          error: { code: 'NO_ZONES', message: 'No zones defined. Add zone-type locations first.' },
        });
      }
      if (project.trades.length === 0) {
        return res.status(400).json({
          data: null,
          error: { code: 'NO_TRADES', message: 'No trades defined. Add trades first.' },
        });
      }

      const taktTime = project.defaultTaktTime;
      const startDate = project.plannedStart || new Date();

      const workingDayNames = (project.workingDays as string[]) || ['mon', 'tue', 'wed', 'thu', 'fri'];
      const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const workingDays = workingDayNames.map((d) => dayMap[d]).filter((d) => d !== undefined);

      // 3. Build zone inputs
      const zones: ZoneInput[] = zoneLocations.map((loc, i) => ({
        id: loc.id,
        name: loc.name,
        sequence: i + 1,
        areaSqm: loc.areaSqm ? Number(loc.areaSqm) : undefined,
      }));

      // 4. Build wagon inputs
      const bufferSize = 1;
      const wagonInputs: WagonInput[] = project.trades.map((trade, i) => ({
        id: trade.id, // use trade.id as temporary wagon id for calculation
        tradeId: trade.id,
        sequence: i + 1,
        durationDays: taktTime,
        bufferAfter: i < project.trades.length - 1 ? bufferSize : 0,
      }));

      // 5. Generate takt grid
      const calcAssignments = generateTaktGrid(zones, wagonInputs, new Date(startDate), taktTime, workingDays);
      const totalPeriods = calculateTotalPeriods(zones.length, wagonInputs.length, bufferSize);
      const endDate = addWorkingDays(new Date(startDate), totalPeriods * taktTime, workingDays);

      // 6. Run warning detection (AI-3 Core)
      const tradeInfos: TradeInfo[] = project.trades.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        sortOrder: t.sortOrder,
        predecessorCodes: [],
      }));

      const tradeIdToCode = new Map(project.trades.map((t) => [t.id, t.code]));
      for (const trade of project.trades) {
        const info = tradeInfos.find((ti) => ti.id === trade.id);
        if (info) {
          info.predecessorCodes = trade.predecessorTradeIds
            .map((id) => tradeIdToCode.get(id))
            .filter((code): code is string => !!code);
        }
      }

      const warnings = validatePlan(zones, wagonInputs, new Date(startDate), taktTime, tradeInfos, workingDays);

      // 7. Persist to PostgreSQL using Prisma transaction
      const plan = await prisma.$transaction(async (tx) => {
        // Create plan
        const taktPlan = await tx.taktPlan.create({
          data: {
            projectId,
            name: `${project.name} — Initial Plan`,
            version: 1,
            status: 'draft',
            taktTime,
            startDate: new Date(startDate),
            endDate,
            bufferType: 'time',
            bufferSize,
            generatedBy: 'template',
            totalPeriods,
          },
        });

        // Create zones
        const dbZones = await Promise.all(
          zones.map((z) =>
            tx.taktZone.create({
              data: {
                planId: taktPlan.id,
                locationId: z.id,
                name: z.name,
                code: `Z${String.fromCharCode(64 + z.sequence)}`,
                sequence: z.sequence,
              },
            })
          )
        );

        // Create wagons
        const dbWagons = await Promise.all(
          wagonInputs.map((w) =>
            tx.taktWagon.create({
              data: {
                planId: taktPlan.id,
                tradeId: w.tradeId,
                sequence: w.sequence,
                durationDays: w.durationDays,
                bufferAfter: w.bufferAfter,
                crewSize: project.trades.find((t) => t.id === w.tradeId)?.defaultCrewSize,
              },
            })
          )
        );

        // Map old IDs to new DB IDs
        const zoneIdMap = new Map(zones.map((z, i) => [z.id, dbZones[i].id]));
        const wagonIdMap = new Map(wagonInputs.map((w, i) => [w.id, dbWagons[i].id]));

        // Create assignments
        const dbAssignments = await Promise.all(
          calcAssignments.map((a) =>
            tx.taktAssignment.create({
              data: {
                planId: taktPlan.id,
                zoneId: zoneIdMap.get(a.zoneId) || a.zoneId,
                wagonId: wagonIdMap.get(a.wagonId) || a.wagonId,
                periodNumber: a.periodNumber,
                plannedStart: a.plannedStart,
                plannedEnd: a.plannedEnd,
                status: 'planned',
                progressPct: 0,
              },
            })
          )
        );

        return {
          ...taktPlan,
          zones: dbZones,
          wagons: dbWagons.map((w) => {
            const trade = project.trades.find((t) => t.id === w.tradeId);
            return { ...w, tradeName: trade?.name || '', tradeCode: trade?.code || '', tradeColor: trade?.color || '#999' };
          }),
          assignments: dbAssignments,
          warnings: {
            stackingConflicts: warnings.stackingConflicts,
            predecessorViolations: warnings.predecessorViolations,
            bufferWarnings: warnings.bufferWarnings,
            totalIssues: warnings.stackingConflicts.length + warnings.predecessorViolations.length + warnings.bufferWarnings.length,
          },
        };
      });

      return res.status(201).json({ data: plan, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL', message: error.message },
      });
    }
  });

  /**
   * GET /projects/:id/takt-plans
   * List all takt plans for a project
   */
  router.get('/projects/:id/takt-plans', async (req, res) => {
    try {
      const projectId = req.params.id;
      const plans = await prisma.taktPlan.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { zones: true, wagons: true, assignments: true } },
        },
      });

      return res.json({
        data: plans.map((p) => ({
          ...p,
          numZones: p._count.zones,
          numTrades: p._count.wagons,
          numAssignments: p._count.assignments,
        })),
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  /**
   * GET /projects/:id/takt-plans/:planId
   * Get a takt plan with zones, wagons, assignments and trade info
   */
  router.get('/projects/:id/takt-plans/:planId', async (req, res) => {
    try {
      const plan = await prisma.taktPlan.findUnique({
        where: { id: req.params.planId },
        include: {
          zones: { orderBy: { sequence: 'asc' } },
          wagons: { orderBy: { sequence: 'asc' } },
          assignments: { orderBy: [{ zoneId: 'asc' }, { wagonId: 'asc' }] },
        },
      });

      if (!plan) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
      }

      // Enrich wagons with trade info
      const tradeIds = plan.wagons.map((w) => w.tradeId);
      const trades = await prisma.trade.findMany({ where: { id: { in: tradeIds } } });
      const tradeMap = new Map(trades.map((t) => [t.id, t]));

      const enrichedWagons = plan.wagons.map((w) => {
        const trade = tradeMap.get(w.tradeId);
        return {
          ...w,
          tradeName: trade?.name || '',
          tradeCode: trade?.code || '',
          tradeColor: trade?.color || '#999',
        };
      });

      return res.json({
        data: { ...plan, wagons: enrichedWagons },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  /**
   * GET /projects/:id/plan/:planId
   * Legacy endpoint — redirects to new takt-plans endpoint
   */
  router.get('/projects/:id/plan/:planId', async (req, res) => {
    try {
      const plan = await prisma.taktPlan.findUnique({
        where: { id: req.params.planId },
        include: {
          zones: { orderBy: { sequence: 'asc' } },
          wagons: { orderBy: { sequence: 'asc' } },
          assignments: { orderBy: [{ zoneId: 'asc' }, { wagonId: 'asc' }] },
        },
      });

      if (!plan) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
      }

      return res.json({ data: plan, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  /**
   * PUT /projects/:id/takt-plans/:planId
   * Update a takt plan (from takt editor save)
   */
  router.put('/projects/:id/takt-plans/:planId', async (req, res) => {
    try {
      const planId = req.params.planId;
      const { name, taktTime, startDate, bufferSize, status, zones, wagons, assignments } = req.body;

      const plan = await prisma.$transaction(async (tx) => {
        // Update plan metadata
        const updatedPlan = await tx.taktPlan.update({
          where: { id: planId },
          data: {
            ...(name && { name }),
            ...(taktTime && { taktTime }),
            ...(startDate && { startDate: new Date(startDate) }),
            ...(bufferSize !== undefined && { bufferSize }),
            ...(status && { status }),
          },
        });

        // If full zones/wagons/assignments provided, replace them
        if (zones && wagons && assignments) {
          // Delete existing
          await tx.taktAssignment.deleteMany({ where: { planId } });
          await tx.taktZone.deleteMany({ where: { planId } });
          await tx.taktWagon.deleteMany({ where: { planId } });

          // Re-create zones
          const dbZones = await Promise.all(
            zones.map((z: { locationId?: string; name: string; code: string; sequence: number }) =>
              tx.taktZone.create({
                data: { planId, locationId: z.locationId, name: z.name, code: z.code, sequence: z.sequence },
              })
            )
          );

          // Re-create wagons
          const dbWagons = await Promise.all(
            wagons.map((w: { tradeId: string; sequence: number; durationDays: number; bufferAfter: number; crewSize?: number }) =>
              tx.taktWagon.create({
                data: { planId, tradeId: w.tradeId, sequence: w.sequence, durationDays: w.durationDays, bufferAfter: w.bufferAfter, crewSize: w.crewSize },
              })
            )
          );

          // Map old IDs to new IDs for assignments
          const zoneSeqMap = new Map(dbZones.map((z) => [z.sequence, z.id]));
          const wagonSeqMap = new Map(dbWagons.map((w) => [w.sequence, w.id]));

          // Re-create assignments
          await Promise.all(
            assignments.map((a: { zoneSequence: number; wagonSequence: number; periodNumber: number; plannedStart: string; plannedEnd: string; status: string; progressPct: number }) =>
              tx.taktAssignment.create({
                data: {
                  planId,
                  zoneId: zoneSeqMap.get(a.zoneSequence) || '',
                  wagonId: wagonSeqMap.get(a.wagonSequence) || '',
                  periodNumber: a.periodNumber,
                  plannedStart: new Date(a.plannedStart),
                  plannedEnd: new Date(a.plannedEnd),
                  status: a.status || 'planned',
                  progressPct: a.progressPct || 0,
                },
              })
            )
          );
        }

        return tx.taktPlan.findUnique({
          where: { id: planId },
          include: {
            zones: { orderBy: { sequence: 'asc' } },
            wagons: { orderBy: { sequence: 'asc' } },
            assignments: true,
          },
        });
      });

      return res.json({ data: plan, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  /**
   * PATCH /projects/:id/takt-assignments/:assignmentId
   * Update a single assignment (status, progress, actual dates)
   */
  router.patch('/projects/:id/takt-assignments/:assignmentId', async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { status, progressPct, actualStart, actualEnd, notes } = req.body;

      const assignment = await prisma.taktAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(status && { status }),
          ...(progressPct !== undefined && { progressPct }),
          ...(actualStart && { actualStart: new Date(actualStart) }),
          ...(actualEnd && { actualEnd: new Date(actualEnd) }),
          ...(notes !== undefined && { notes }),
        },
      });

      return res.json({ data: assignment, error: null });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  /**
   * GET /projects/:id/flowline/:planId
   * Get flowline visualization data for a plan
   */
  router.get('/projects/:id/flowline/:planId', async (req, res) => {
    try {
      const plan = await prisma.taktPlan.findUnique({
        where: { id: req.params.planId },
        include: {
          zones: { orderBy: { sequence: 'asc' } },
          wagons: { orderBy: { sequence: 'asc' } },
          assignments: true,
        },
      });

      if (!plan) {
        return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } });
      }

      // Enrich with trade info
      const tradeIds = plan.wagons.map((w) => w.tradeId);
      const trades = await prisma.trade.findMany({ where: { id: { in: tradeIds } } });
      const tradeMap = new Map(trades.map((t) => [t.id, t]));

      // Build flowline data structure for D3.js visualization
      const zonesData = plan.zones.map((z) => ({
        id: z.id,
        name: z.name,
        code: z.code,
        sequence: z.sequence,
      }));

      const wagonsData = plan.wagons.map((w) => {
        const trade = tradeMap.get(w.tradeId);
        const wagonAssignments = plan.assignments
          .filter((a) => a.wagonId === w.id)
          .sort((a, b) => a.periodNumber - b.periodNumber);

        return {
          id: w.id,
          tradeId: w.tradeId,
          tradeName: trade?.name || '',
          tradeCode: trade?.code || '',
          tradeColor: trade?.color || '#999',
          sequence: w.sequence,
          durationDays: w.durationDays,
          bufferAfter: w.bufferAfter,
          segments: wagonAssignments.map((a) => {
            const zone = plan.zones.find((z) => z.id === a.zoneId);
            return {
              id: a.id,
              zoneId: a.zoneId,
              zoneName: zone?.name || '',
              zoneSequence: zone?.sequence || 0,
              periodNumber: a.periodNumber,
              plannedStart: a.plannedStart.toISOString().split('T')[0],
              plannedEnd: a.plannedEnd.toISOString().split('T')[0],
              actualStart: a.actualStart?.toISOString().split('T')[0] || null,
              actualEnd: a.actualEnd?.toISOString().split('T')[0] || null,
              status: a.status,
              progressPct: a.progressPct,
            };
          }),
        };
      });

      // Today marker
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24));

      return res.json({
        data: {
          planId: plan.id,
          planName: plan.name,
          taktTime: plan.taktTime,
          startDate: plan.startDate.toISOString().split('T')[0],
          endDate: plan.endDate?.toISOString().split('T')[0],
          totalPeriods: plan.totalPeriods,
          zones: zonesData,
          wagons: wagonsData,
          todayX: Math.max(0, daysDiff),
        },
        error: null,
      });
    } catch (err: unknown) {
      const error = err as Error;
      return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: error.message } });
    }
  });

  return router;
}
