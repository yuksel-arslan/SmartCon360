import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; planId: string }> };

// GET /api/v1/projects/:id/takt-plans/:planId — Get a single takt plan with full details
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
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
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

    return NextResponse.json({
      data: {
        ...plan,
        startDate: plan.startDate.toISOString().split('T')[0],
        endDate: plan.endDate?.toISOString().split('T')[0] ?? null,
        wagons: enrichedWagons,
        assignments: plan.assignments.map((a) => ({
          ...a,
          plannedStart: a.plannedStart.toISOString().split('T')[0],
          plannedEnd: a.plannedEnd.toISOString().split('T')[0],
          actualStart: a.actualStart?.toISOString().split('T')[0] ?? null,
          actualEnd: a.actualEnd?.toISOString().split('T')[0] ?? null,
        })),
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PUT /api/v1/projects/:id/takt-plans/:planId — Update a takt plan
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const body = await request.json();
    const { name, taktTime, startDate, bufferSize, status, zones, wagons, assignments } = body;

    const plan = await prisma.$transaction(async (tx) => {
      // Update plan metadata
      await tx.taktPlan.update({
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
        await tx.taktAssignment.deleteMany({ where: { planId } });
        await tx.taktZone.deleteMany({ where: { planId } });
        await tx.taktWagon.deleteMany({ where: { planId } });

        const dbZones = await Promise.all(
          zones.map((z: { locationId?: string; name: string; code: string; sequence: number }) =>
            tx.taktZone.create({
              data: { planId, locationId: z.locationId, name: z.name, code: z.code, sequence: z.sequence },
            })
          )
        );

        const dbWagons = await Promise.all(
          wagons.map((w: { tradeId: string; sequence: number; durationDays: number; bufferAfter: number; crewSize?: number }) =>
            tx.taktWagon.create({
              data: { planId, tradeId: w.tradeId, sequence: w.sequence, durationDays: w.durationDays, bufferAfter: w.bufferAfter, crewSize: w.crewSize },
            })
          )
        );

        const zoneSeqMap = new Map(dbZones.map((z) => [z.sequence, z.id]));
        const wagonSeqMap = new Map(dbWagons.map((w) => [w.sequence, w.id]));

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

    return NextResponse.json({ data: plan, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
