import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; relId: string }> };

/**
 * PATCH /api/v1/projects/:id/relationships/:relId
 * Update an existing activity relationship
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId, relId } = await params;
    const body = await request.json();

    const existing = await prisma.tradeRelationship.findFirst({
      where: { id: relId, projectId },
    });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Relationship not found' } },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.type && ['FS', 'SS', 'FF', 'SF'].includes(body.type)) updateData.type = body.type;
    if (body.lagDays !== undefined) updateData.lagDays = body.lagDays;
    if (body.mandatory !== undefined) updateData.mandatory = body.mandatory;
    if (body.description !== undefined) updateData.description = body.description;

    const updated = await prisma.tradeRelationship.update({
      where: { id: relId },
      data: updateData,
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

/**
 * DELETE /api/v1/projects/:id/relationships/:relId
 * Delete an activity relationship
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId, relId } = await params;

    const existing = await prisma.tradeRelationship.findFirst({
      where: { id: relId, projectId },
    });

    if (!existing) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Relationship not found' } },
        { status: 404 },
      );
    }

    await prisma.tradeRelationship.delete({
      where: { id: relId },
    });

    return NextResponse.json({ data: { id: relId, deleted: true }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
