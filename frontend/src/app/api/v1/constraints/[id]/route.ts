import { NextRequest, NextResponse } from 'next/server';
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

    const data: Record<string, unknown> = { ...input };
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
