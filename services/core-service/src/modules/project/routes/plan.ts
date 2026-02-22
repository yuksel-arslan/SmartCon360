import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  generateTaktGrid,
  generateTaktGridWithRelationships,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
  type WagonRelationship,
  type Assignment,
} from '../utils/takt-calculator';
import { validatePlan, type TradeInfo } from '../utils/warning-detector';
import {
  classifyTradePhase,
  classifyLocationPhase,
  getPhaseGroup,
  type TaktPlanGroup,
} from '../utils/work-phase-classification';

const router = Router();

/**
 * Classify a location into a TaktPlanGroup based on its type and metadata.
 */
function classifyZoneGroup(
  locationType: string,
  metadata: Record<string, unknown> | null,
): TaktPlanGroup {
  if (locationType === 'sector' || locationType === 'grid') return 'substructure';
  const fromMeta = classifyLocationPhase(metadata);
  return fromMeta ?? 'shell';
}

export default function planRoutes(prisma: PrismaClient) {
  /**
   * POST /projects/:id/plan/generate
   *
   * AI-1 Core: Auto-generate a takt plan from project's locations and trades.
   * Layer 1 — template-based, no AI API dependency.
   *
   * Generates THREE separate takt trains per OmniClass Table 21:
   *   1. Substructure (21-01): sector/grid zones × substructure trades
   *   2. Shell & Core (21-02): floor zones × shell trades
   *   3. Fit-Out (21-03): floor zones × fitout trades
   *
   * Buffer is applied between wagons WITHIN each takt train.
   * Reads buffer size from project's Takt Config settings.
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

      // 2. Extract takt zones (zone, sector, and grid-type locations)
      const taktLocationTypes = ['zone', 'sector', 'grid'];
      const zoneLocations = project.locations.filter((l) => taktLocationTypes.includes(l.locationType));
      if (zoneLocations.length === 0) {
        return res.status(400).json({
          data: null,
          error: { code: 'NO_ZONES', message: 'No zones defined. Add zone, sector, or grid-type locations first.' },
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

      // Read buffer size from Takt Config (project settings), fall back to 1
      const projectSettings = (project.settings as Record<string, unknown>) || {};
      const taktConfig = (projectSettings.taktConfig as Record<string, unknown>) || {};
      const bufferSize = typeof taktConfig.bufferSize === 'number' ? taktConfig.bufferSize : 1;

      // Parse working days from taktConfig or project
      const configWorkingDays = taktConfig.workingDays as string[] | undefined;
      const workingDayNames = configWorkingDays || (project.workingDays as string[]) || ['mon', 'tue', 'wed', 'thu', 'fri'];
      const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
      const workingDays = workingDayNames.map((d) => dayMap[d]).filter((d) => d !== undefined);

      // 3. Classify zones and trades by phase group (OmniClass Table 21)
      const zoneGroupMap = new Map<string, TaktPlanGroup>();
      for (const loc of zoneLocations) {
        const group = classifyZoneGroup(loc.locationType, loc.metadata as Record<string, unknown> | null);
        zoneGroupMap.set(loc.id, group);
      }

      const tradeGroupMap = new Map<string, TaktPlanGroup>();
      for (const trade of project.trades) {
        const phase = classifyTradePhase(trade.discipline, trade.name);
        const group = getPhaseGroup(phase);
        tradeGroupMap.set(trade.id, group);
      }

      // 4. Load activity relationships from database
      const dbRelationships = await prisma.tradeRelationship.findMany({
        where: { projectId, isActive: true },
      });

      // Build trade ID sets per group for relationship filtering
      const tradeIdToGroup = new Map<string, TaktPlanGroup>();
      for (const trade of project.trades) {
        tradeIdToGroup.set(trade.id, tradeGroupMap.get(trade.id) || 'shell');
      }

      // 5. Generate takt grid PER GROUP — each group is a separate takt train
      const groups: TaktPlanGroup[] = ['substructure', 'shell', 'fitout'];

      const allZoneInputs: (ZoneInput & { group: TaktPlanGroup })[] = [];
      const allWagonInputs: (WagonInput & { group: TaktPlanGroup })[] = [];
      const allAssignments: Assignment[] = [];
      let maxEndDate = new Date(startDate);

      for (const group of groups) {
        const groupZones = zoneLocations.filter((loc) => zoneGroupMap.get(loc.id) === group);
        if (groupZones.length === 0) continue;

        const groupTrades = project.trades.filter((t) => tradeGroupMap.get(t.id) === group);
        if (groupTrades.length === 0) continue;

        const groupTradeIds = new Set(groupTrades.map((t) => t.id));

        const zoneInputs: ZoneInput[] = groupZones.map((loc, i) => ({
          id: loc.id,
          name: loc.name,
          sequence: i + 1,
          areaSqm: loc.areaSqm ? Number(loc.areaSqm) : undefined,
        }));

        const wagonInputs: WagonInput[] = groupTrades.map((trade, i) => ({
          id: trade.id,
          tradeId: trade.id,
          sequence: i + 1,
          durationDays: taktTime,
          bufferAfter: i < groupTrades.length - 1 ? bufferSize : 0,
        }));

        // Filter relationships for this group (both predecessor and successor must be in group)
        const groupRelationships: WagonRelationship[] = dbRelationships
          .filter((r) => groupTradeIds.has(r.predecessorTradeId) && groupTradeIds.has(r.successorTradeId))
          .map((r) => ({
            predecessorWagonId: r.predecessorTradeId,
            successorWagonId: r.successorTradeId,
            type: r.type as WagonRelationship['type'],
            lagDays: r.lagDays,
            mandatory: r.mandatory,
          }));

        // Use relationship-aware generator if relationships exist, otherwise simple grid
        const groupAssignments = groupRelationships.length > 0
          ? generateTaktGridWithRelationships(zoneInputs, wagonInputs, groupRelationships, new Date(startDate), taktTime, workingDays)
          : generateTaktGrid(zoneInputs, wagonInputs, new Date(startDate), taktTime, workingDays);

        allZoneInputs.push(...zoneInputs.map((z) => ({ ...z, group })));
        allWagonInputs.push(...wagonInputs.map((w) => ({ ...w, group })));
        allAssignments.push(...groupAssignments);

        for (const a of groupAssignments) {
          if (a.plannedEnd > maxEndDate) maxEndDate = a.plannedEnd;
        }
      }

      if (allAssignments.length === 0) {
        return res.status(400).json({
          data: null,
          error: { code: 'NO_MATCHES', message: 'No matching trade-zone pairs found. Ensure trades and zones have compatible phase groups.' },
        });
      }

      const totalPeriods = Math.max(...allAssignments.map((a) => a.periodNumber), 1);

      // 6. Run warning detection (AI-3 Core) per group
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

      const allWarnings = {
        stackingConflicts: [] as ReturnType<typeof validatePlan>['stackingConflicts'],
        predecessorViolations: [] as ReturnType<typeof validatePlan>['predecessorViolations'],
        bufferWarnings: [] as ReturnType<typeof validatePlan>['bufferWarnings'],
      };
      for (const group of groups) {
        const gZones = allZoneInputs.filter((z) => z.group === group);
        const gWagons = allWagonInputs.filter((w) => w.group === group);
        const gTradeInfos = tradeInfos.filter((ti) => tradeGroupMap.get(ti.id) === group);
        if (gZones.length > 0 && gWagons.length > 0) {
          const w = validatePlan(gZones, gWagons, new Date(startDate), taktTime, gTradeInfos, workingDays);
          allWarnings.stackingConflicts.push(...w.stackingConflicts);
          allWarnings.predecessorViolations.push(...w.predecessorViolations);
          allWarnings.bufferWarnings.push(...w.bufferWarnings);
        }
      }

      // 7. Persist to PostgreSQL using Prisma transaction
      const plan = await prisma.$transaction(async (tx) => {
        const taktPlan = await tx.taktPlan.create({
          data: {
            projectId,
            name: `${project.name} — Initial Plan`,
            version: 1,
            status: 'draft',
            taktTime,
            startDate: new Date(startDate),
            endDate: maxEndDate,
            bufferType: 'time',
            bufferSize,
            generatedBy: 'template',
            totalPeriods,
          },
        });

        const dbZones = await Promise.all(
          allZoneInputs.map((z, i) =>
            tx.taktZone.create({
              data: {
                planId: taktPlan.id,
                locationId: z.id,
                name: z.name,
                code: `Z${String.fromCharCode(64 + ((i % 26) + 1))}${i >= 26 ? String(Math.floor(i / 26)) : ''}`,
                sequence: z.sequence,
              },
            })
          )
        );

        const dbWagons = await Promise.all(
          allWagonInputs.map((w) =>
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

        const zoneIdMap = new Map(allZoneInputs.map((z, i) => [z.id, dbZones[i].id]));
        const wagonIdMap = new Map(allWagonInputs.map((w, i) => [w.id, dbWagons[i].id]));

        const dbAssignments = await Promise.all(
          allAssignments.map((a) =>
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
            stackingConflicts: allWarnings.stackingConflicts,
            predecessorViolations: allWarnings.predecessorViolations,
            bufferWarnings: allWarnings.bufferWarnings,
            totalIssues: allWarnings.stackingConflicts.length + allWarnings.predecessorViolations.length + allWarnings.bufferWarnings.length,
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
