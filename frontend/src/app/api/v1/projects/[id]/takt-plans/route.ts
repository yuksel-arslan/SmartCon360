import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/takt-plans — List all takt plans for a project
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const plans = await prisma.taktPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { zones: true, wagons: true, assignments: true } },
      },
    });

    return NextResponse.json({
      data: plans.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        name: p.name,
        version: p.version,
        status: p.status,
        taktTime: p.taktTime,
        startDate: p.startDate.toISOString().split('T')[0],
        endDate: p.endDate?.toISOString().split('T')[0] ?? null,
        totalPeriods: p.totalPeriods,
        numZones: p._count.zones,
        numTrades: p._count.wagons,
        numAssignments: p._count.assignments,
        createdAt: p.createdAt.toISOString(),
      })),
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/takt-plans — Persist a generated takt plan
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const body = await request.json();

    const plan = await prisma.$transaction(async (tx) => {
      // Create the plan record
      const created = await tx.taktPlan.create({
        data: {
          id: body.id,
          projectId,
          name: body.name,
          version: body.version || 1,
          status: body.status || 'draft',
          taktTime: body.taktTime,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : null,
          bufferType: body.bufferType || 'time',
          bufferSize: body.bufferSize || 0,
          generatedBy: body.generatedBy || 'manual',
          totalPeriods: body.totalPeriods,
        },
      });

      // Create zones
      if (body.zones?.length) {
        await tx.taktZone.createMany({
          data: body.zones.map((z: { id: string; name: string; code: string; sequence: number; locationId?: string }) => ({
            id: z.id,
            planId: created.id,
            locationId: z.locationId || null,
            name: z.name,
            code: z.code,
            sequence: z.sequence,
          })),
        });
      }

      // Create wagons
      if (body.wagons?.length) {
        await tx.taktWagon.createMany({
          data: body.wagons.map((w: { id: string; tradeId: string; sequence: number; durationDays: number; bufferAfter?: number; crewSize?: number }) => ({
            id: w.id,
            planId: created.id,
            tradeId: w.tradeId,
            sequence: w.sequence,
            durationDays: w.durationDays,
            bufferAfter: w.bufferAfter || 0,
            crewSize: w.crewSize || null,
          })),
        });
      }

      // Create assignments
      if (body.assignments?.length) {
        await tx.taktAssignment.createMany({
          data: body.assignments.map((a: { id: string; zoneId: string; wagonId: string; periodNumber: number; plannedStart: string; plannedEnd: string; status?: string; progressPct?: number }) => ({
            id: a.id,
            planId: created.id,
            zoneId: a.zoneId,
            wagonId: a.wagonId,
            periodNumber: a.periodNumber,
            plannedStart: new Date(a.plannedStart),
            plannedEnd: new Date(a.plannedEnd),
            status: a.status || 'planned',
            progressPct: a.progressPct || 0,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ data: plan, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
