import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { savePlan } from '@/lib/stores/takt-plans';
import {
  generateTaktGrid,
  calculateTotalPeriods,
  addWorkingDays,
  type ZoneInput,
  type WagonInput,
} from '@/lib/core/takt-calculator';
import { validatePlan, type TradeInfo } from '@/lib/core/warning-detector';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/projects/:id/plan/generate
 *
 * AI-1 Core: Auto-generate a takt plan from project's locations and trades.
 * Layer 1 — template-based, no AI API dependency.
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

    // 2. Extract takt zones (only zone-type locations)
    const zoneLocations = project.locations.filter((l) => l.locationType === 'zone');
    if (zoneLocations.length === 0) {
      throw new AppError('No zones defined. Add zone-type locations first.', 'NO_ZONES', 400);
    }
    if (project.trades.length === 0) {
      throw new AppError('No trades defined. Add trades first.', 'NO_TRADES', 400);
    }

    const taktTime = project.defaultTaktTime;
    const startDate = project.plannedStart || new Date();

    // Parse working days from project settings
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

    // 4. Build wagon inputs — one wagon per trade, with template-based buffer
    const bufferSize = 1; // default 1 takt buffer between trades
    const wagons: WagonInput[] = project.trades.map((trade, i) => ({
      id: uuidv4(),
      tradeId: trade.id,
      sequence: i + 1,
      durationDays: taktTime,
      bufferAfter: i < project.trades.length - 1 ? bufferSize : 0,
    }));

    // 5. Generate takt grid
    const assignments = generateTaktGrid(zones, wagons, new Date(startDate), taktTime, workingDays);
    const totalPeriods = calculateTotalPeriods(zones.length, wagons.length, bufferSize);
    const endDate = addWorkingDays(new Date(startDate), totalPeriods * taktTime, workingDays);

    // 6. Run warning detection (AI-3 Core)
    const tradeInfos: TradeInfo[] = project.trades.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      sortOrder: t.sortOrder,
      predecessorCodes: [], // will be resolved from predecessorTradeIds later
    }));

    // Resolve predecessor trade IDs to codes
    const tradeIdToCode = new Map(project.trades.map((t) => [t.id, t.code]));
    for (const trade of project.trades) {
      const info = tradeInfos.find((ti) => ti.id === trade.id);
      if (info) {
        info.predecessorCodes = trade.predecessorTradeIds
          .map((id) => tradeIdToCode.get(id))
          .filter((code): code is string => !!code);
      }
    }

    const warnings = validatePlan(zones, wagons, new Date(startDate), taktTime, tradeInfos, workingDays);

    // 7. Build plan object
    const planId = uuidv4();
    const plan = {
      id: planId,
      projectId,
      name: `${project.name} — Initial Plan`,
      version: 1,
      status: 'draft',
      taktTime,
      numZones: zones.length,
      numTrades: wagons.length,
      totalPeriods,
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      bufferType: 'time',
      bufferSize,
      generatedBy: 'template',
      zones: zones.map((z) => ({
        id: z.id,
        planId,
        name: z.name,
        code: `Z${String.fromCharCode(64 + z.sequence)}`,
        sequence: z.sequence,
      })),
      wagons: wagons.map((w) => {
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
      assignments: assignments.map((a) => ({
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
        stackingConflicts: warnings.stackingConflicts,
        predecessorViolations: warnings.predecessorViolations,
        bufferWarnings: warnings.bufferWarnings,
        totalIssues:
          warnings.stackingConflicts.length +
          warnings.predecessorViolations.length +
          warnings.bufferWarnings.length,
      },
    };

    savePlan(planId, plan);

    return NextResponse.json({ data: plan, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
