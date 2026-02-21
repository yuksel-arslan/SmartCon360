import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { updateConstraintSchema } from '@/lib/validators/constraint';
import { errorResponse, AppError } from '@/lib/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/v1/constraints/:id
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = requireAuth(request);
    const { id } = await params;

    const constraint = await prisma.constraint.findFirst({
      where: { id, project: { ownerId: userId } },
    });

    if (!constraint) throw new AppError('Constraint not found', 'NOT_FOUND', 404);

    return NextResponse.json({ data: constraint, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PATCH /api/v1/constraints/:id
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const input = updateConstraintSchema.parse(body);

    // Verify ownership
    const existing = await prisma.constraint.findFirst({
      where: { id, project: { ownerId: userId } },
    });
    if (!existing) throw new AppError('Constraint not found', 'NOT_FOUND', 404);

    // Build update data explicitly to satisfy Prisma's strict types
    const data: Prisma.ConstraintUpdateInput = {};

    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;
    if (input.tradeCode !== undefined) data.tradeCode = input.tradeCode;
    if (input.zoneName !== undefined) data.zoneName = input.zoneName;
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo;
    if (input.resolution !== undefined) data.resolution = input.resolution;
    if (input.dueDate) data.dueDate = new Date(input.dueDate);

    // Auto-set resolvedAt when status changes to resolved
    if (input.status === 'resolved' && existing.status !== 'resolved') {
      data.resolvedAt = new Date();
    }

    const constraint = await prisma.constraint.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: constraint, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/constraints/:id
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = requireAuth(request);
    const { id } = await params;

    const existing = await prisma.constraint.findFirst({
      where: { id, project: { ownerId: userId } },
    });
    if (!existing) throw new AppError('Constraint not found', 'NOT_FOUND', 404);

    await prisma.constraint.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
