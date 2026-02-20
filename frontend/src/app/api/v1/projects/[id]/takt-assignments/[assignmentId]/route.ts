import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; assignmentId: string }> };

// PATCH /api/v1/projects/:id/takt-assignments/:assignmentId — Update a single assignment
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { assignmentId } = await params;
    const body = await request.json();

    const updated = await prisma.taktAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.progressPct !== undefined && { progressPct: body.progressPct }),
        ...(body.actualStart && { actualStart: new Date(body.actualStart) }),
        ...(body.actualEnd && { actualEnd: new Date(body.actualEnd) }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    return NextResponse.json({
      data: {
        ...updated,
        plannedStart: updated.plannedStart.toISOString().split('T')[0],
        plannedEnd: updated.plannedEnd.toISOString().split('T')[0],
        actualStart: updated.actualStart?.toISOString().split('T')[0] ?? null,
        actualEnd: updated.actualEnd?.toISOString().split('T')[0] ?? null,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
