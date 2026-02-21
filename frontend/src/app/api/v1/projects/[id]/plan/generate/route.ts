import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import {
  generateTaktGrid,
  calculateTotalPeriods,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';
import { validatePlan, type TradeInfo } from '@/lib/core/warning-detector';
import {
  classifyTradePhase,
  classifyLocationPhase,
  getPhaseGroup,
  type TaktPlanGroup,
} from '@/lib/core/work-phase-classification';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Classify a location into a TaktPlanGroup based on its type and metadata.
 * - sector/grid → substructure (plan-view zones for excavation, piling, foundation)
 * - zone → depends on metadata.phase (shell or fitout), defaults to shell
 */
function classifyZoneGroup(
  locationType: string,
  metadata: Record<string, unknown> | null,
): TaktPlanGroup {
  if (locationType === 'sector' || locationType === 'grid') return 'substructure';
  const fromMeta = classifyLocationPhase(metadata);
  return fromMeta ?? 'shell';
}

/**
 * POST /api/v1/projects/:id/plan/generate
 *
 * AI-1 Core: Auto-generate a takt plan from project's locations and trades.
 * Layer 1 — template-based, no AI API dependency.
 *
 * Generates THREE separate takt trains per OmniClass Table 21:
 *   1. Substructure (21-01): sector/grid zones × substructure trades
 *   2. Shell & Core (21-02): floor zones × shell trades
 *   3. Fit-Out (21-03): floor zones × fitout trades
 *
 * Each group is its own takt train with independent period numbering.
 * Buffer is applied between wagons WITHIN each takt train.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = requireAuth(request);
    const { id: projectId } = await params;

    // 1. Load project with locations and trades
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
      include: {
        locations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        trades: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!project) throw new AppError('Project not found', 'NOT_FOUND', 404);

    // 2. Extract takt zones (zone, sector, and grid-type locations)
    const taktLocationTypes = ['zone', 'sector', 'grid'];
    const zoneLocations = project.locations.filter((l) => taktLocationTypes.includes(l.locationType));
    if (zoneLocations.length === 0) {
      throw new AppError('No zones defined. Add zone, sector, or grid-type locations first.', 'NO_ZONES', 400);
    }
    if (project.trades.length === 0) {
      throw new AppError('No trades defined. Add trades first.', 'NO_TRADES', 400);
    }

    const taktTime = project.defaultTaktTime;
    const startDate = project.plannedStart || new Date();

    // Read buffer size from Takt Config (project settings), fall back to 1
    const projectSettings = (project.settings as Record<string, unknown>) || {};
    const taktConfig = (projectSettings.taktConfig as Record<string, unknown>) || {};
    const bufferSize = typeof taktConfig.bufferSize === 'number' ? taktConfig.bufferSize : 1;

    // Parse working days from project settings or taktConfig
    const configWorkingDays = taktConfig.workingDays as string[] | undefined;
    const workingDayNames = configWorkingDays || (project.workingDays as string[]) || ['mon', 'tue', 'wed', 'thu', 'fri'];
    const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const workingDays = workingDayNames.map((d) => dayMap[d]).filter((d) => d !== undefined);

    // 3. Classify zones and trades by phase group (OmniClass Table 21)
    // Zones: sector/grid → substructure, zone → shell/fitout from metadata
    // Trades: classified by discipline + name keywords
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

    // 4. Generate takt grid PER GROUP — each group is a separate takt train
    const groups: TaktPlanGroup[] = ['substructure', 'shell', 'fitout'];

    const allZoneInputs: (ZoneInput & { group: TaktPlanGroup })[] = [];
    const allWagonInputs: (WagonInput & { group: TaktPlanGroup })[] = [];
    interface AssignmentOutput {
      zoneId: string;
      wagonId: string;
      periodNumber: number;
      plannedStart: Date;
      plannedEnd: Date;
    }
    const allAssignments: AssignmentOutput[] = [];
    let maxEndDate = new Date(startDate);

    for (const group of groups) {
      // Filter zones for this group
      const groupZones = zoneLocations
        .filter((loc) => zoneGroupMap.get(loc.id) === group);
      if (groupZones.length === 0) continue;

      // Filter trades for this group
      const groupTrades = project.trades
        .filter((t) => tradeGroupMap.get(t.id) === group);
      if (groupTrades.length === 0) continue;

      // Build zone inputs for this group (sequential numbering within group)
      const zoneInputs: ZoneInput[] = groupZones.map((loc, i) => ({
        id: loc.id,
        name: loc.name,
        sequence: i + 1,
        areaSqm: loc.areaSqm ? Number(loc.areaSqm) : undefined,
      }));

      // Build wagon inputs for this group — buffer only between wagons in same train
      const wagonInputs: WagonInput[] = groupTrades.map((trade, i) => ({
        id: uuidv4(),
        tradeId: trade.id,
        sequence: i + 1,
        durationDays: taktTime,
        bufferAfter: i < groupTrades.length - 1 ? bufferSize : 0,
      }));

      // Generate takt grid for this group
      const groupAssignments = generateTaktGrid(zoneInputs, wagonInputs, new Date(startDate), taktTime, workingDays);

      allZoneInputs.push(...zoneInputs.map((z) => ({ ...z, group })));
      allWagonInputs.push(...wagonInputs.map((w) => ({ ...w, group })));
      allAssignments.push(...groupAssignments);

      // Track latest end date across all groups
      for (const a of groupAssignments) {
        if (a.plannedEnd > maxEndDate) maxEndDate = a.plannedEnd;
      }
    }

    if (allAssignments.length === 0) {
      throw new AppError('No matching trade-zone pairs found. Ensure trades and zones have compatible phase groups.', 'NO_MATCHES', 400);
    }

    const totalPeriods = Math.max(...allAssignments.map((a) => a.periodNumber), 1);

    // 5. Run warning detection (AI-3 Core)
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

    // Validate per group
    const allWarnings = { stackingConflicts: [] as ReturnType<typeof validatePlan>['stackingConflicts'], predecessorViolations: [] as ReturnType<typeof validatePlan>['predecessorViolations'], bufferWarnings: [] as ReturnType<typeof validatePlan>['bufferWarnings'] };
    for (const group of groups) {
      const gZones = allZoneInputs.filter((z) => z.group === group);
      const gWagons = allWagonInputs.filter((w) => w.group === group);
      const gTradeInfos = tradeInfos.filter((ti) => {
        const tradeGroup = tradeGroupMap.get(ti.id);
        return tradeGroup === group;
      });
      if (gZones.length > 0 && gWagons.length > 0) {
        const w = validatePlan(gZones, gWagons, new Date(startDate), taktTime, gTradeInfos, workingDays);
        allWarnings.stackingConflicts.push(...w.stackingConflicts);
        allWarnings.predecessorViolations.push(...w.predecessorViolations);
        allWarnings.bufferWarnings.push(...w.bufferWarnings);
      }
    }

    // 6. Build plan object
    const planId = uuidv4();
    const plan = {
      id: planId,
      projectId,
      name: `${project.name} — Initial Plan`,
      version: 1,
      status: 'draft',
      taktTime,
      numZones: allZoneInputs.length,
      numTrades: allWagonInputs.length,
      totalPeriods,
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: maxEndDate.toISOString().split('T')[0],
      bufferType: 'time',
      bufferSize,
      generatedBy: 'template',
      zones: allZoneInputs.map((z, i) => ({
        id: z.id,
        planId,
        name: z.name,
        code: `Z${String.fromCharCode(64 + ((i % 26) + 1))}${i >= 26 ? String(Math.floor(i / 26)) : ''}`,
        sequence: z.sequence,
      })),
      wagons: allWagonInputs.map((w) => {
        const trade = project.trades.find((t) => t.id === w.tradeId);
        return {
          id: w.id,
          planId,
          tradeId: w.tradeId,
          tradeName: trade?.name || '',
          tradeCode: trade?.code || '',
          tradeColor: trade?.color || '#999',
          sequence: w.sequence,
          durationDays: w.durationDays,
          bufferAfter: w.bufferAfter,
        };
      }),
      assignments: allAssignments.map((a) => ({
        id: uuidv4(),
        planId,
        zoneId: a.zoneId,
        wagonId: a.wagonId,
        periodNumber: a.periodNumber,
        plannedStart: a.plannedStart.toISOString().split('T')[0],
        plannedEnd: a.plannedEnd.toISOString().split('T')[0],
        status: 'planned',
        progressPct: 0,
      })),
      warnings: {
        stackingConflicts: allWarnings.stackingConflicts,
        predecessorViolations: allWarnings.predecessorViolations,
        bufferWarnings: allWarnings.bufferWarnings,
        totalIssues:
          allWarnings.stackingConflicts.length +
          allWarnings.predecessorViolations.length +
          allWarnings.bufferWarnings.length,
      },
    };

    // Persist to database via Prisma
    await prisma.$transaction(async (tx) => {
      await tx.taktPlan.create({
        data: {
          id: plan.id,
          projectId,
          name: plan.name,
          version: plan.version,
          status: plan.status,
          taktTime: plan.taktTime,
          startDate: new Date(plan.startDate),
          endDate: new Date(plan.endDate),
          bufferType: plan.bufferType,
          bufferSize: plan.bufferSize,
          generatedBy: plan.generatedBy,
          totalPeriods: plan.totalPeriods,
        },
      });
      if (plan.zones.length) {
        await tx.taktZone.createMany({
          data: plan.zones.map((z: { id: string; name: string; code: string; sequence: number }) => ({
            id: z.id, planId: plan.id, locationId: z.id, name: z.name, code: z.code, sequence: z.sequence,
          })),
        });
      }
      if (plan.wagons.length) {
        await tx.taktWagon.createMany({
          data: plan.wagons.map((w: { id: string; tradeId: string; sequence: number; durationDays: number; bufferAfter: number }) => ({
            id: w.id, planId: plan.id, tradeId: w.tradeId, sequence: w.sequence, durationDays: w.durationDays, bufferAfter: w.bufferAfter,
          })),
        });
      }
      if (plan.assignments.length) {
        await tx.taktAssignment.createMany({
          data: plan.assignments.map((a: { id: string; zoneId: string; wagonId: string; periodNumber: number; plannedStart: string; plannedEnd: string; status: string; progressPct: number }) => ({
            id: a.id, planId: plan.id, zoneId: a.zoneId, wagonId: a.wagonId, periodNumber: a.periodNumber,
            plannedStart: new Date(a.plannedStart), plannedEnd: new Date(a.plannedEnd), status: a.status, progressPct: a.progressPct,
          })),
        });
      }
    });

    return NextResponse.json({ data: plan, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
