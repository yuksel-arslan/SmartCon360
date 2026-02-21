import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; planId: string }> };

// GET /api/v1/projects/:id/flowline/:planId — Get flowline visualization data
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;

    const plan = await prisma.taktPlan.findUnique({
      where: { id: planId },
      include: {
        zones: { orderBy: { sequence: 'asc' } },
        wagons: { orderBy: { sequence: 'asc' } },
        assignments: { orderBy: [{ zoneId: 'asc' }, { wagonId: 'asc' }] },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: `Plan ${planId} not found` } },
        { status: 404 }
      );
    }

    // Enrich wagons with trade info
    const tradeIds = plan.wagons.map((w: { tradeId: string }) => w.tradeId);
    const trades = await prisma.trade.findMany({ where: { id: { in: tradeIds } } });
    const tradeMap = new Map(trades.map((t) => [t.id, t]));

    // Build flowline data structure for D3.js
    const zones = plan.zones.map((z, i) => ({
      id: z.id,
      name: z.name,
      code: z.code,
      sequence: z.sequence,
      y_index: i,
    }));

    const zoneIdToIndex = new Map(plan.zones.map((z, i) => [z.id, i]));
    const zoneIdToSeq = new Map(plan.zones.map((z) => [z.id, z.sequence]));

    const wagons = plan.wagons.map((w) => {
      const trade = tradeMap.get(w.tradeId);
      const wagonAssignments = plan.assignments.filter((a) => a.wagonId === w.id);

      return {
        id: w.id,
        tradeName: trade?.name || `Trade ${w.sequence}`,
        tradeCode: trade?.code || '',
        tradeColor: trade?.color || '#999',
        durationDays: w.durationDays,
        bufferAfter: w.bufferAfter,
        segments: wagonAssignments.map((a) => {
          const zoneIdx = zoneIdToIndex.get(a.zoneId) ?? 0;
          const zoneSeq = zoneIdToSeq.get(a.zoneId) ?? 1;

          return {
            zoneId: a.zoneId,
            zoneName: plan.zones.find((z) => z.id === a.zoneId)?.name || '',
            zoneSequence: zoneSeq,
            zoneIndex: zoneIdx,
            periodNumber: a.periodNumber,
            plannedStart: a.plannedStart.toISOString().split('T')[0],
            plannedEnd: a.plannedEnd.toISOString().split('T')[0],
            actualStart: a.actualStart?.toISOString().split('T')[0] ?? null,
            actualEnd: a.actualEnd?.toISOString().split('T')[0] ?? null,
            y: zoneIdx,
            status: a.status,
            progressPct: a.progressPct,
          };
        }),
      };
    });

    // Calculate todayX
    const now = new Date();
    const todayX = Math.floor((now.getTime() - plan.startDate.getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      data: {
        planId: plan.id,
        planName: plan.name,
        taktTime: plan.taktTime,
        startDate: plan.startDate.toISOString().split('T')[0],
        endDate: plan.endDate?.toISOString().split('T')[0] ?? null,
        totalPeriods: plan.totalPeriods,
        zones,
        wagons,
        todayX: Math.max(0, todayX),
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
