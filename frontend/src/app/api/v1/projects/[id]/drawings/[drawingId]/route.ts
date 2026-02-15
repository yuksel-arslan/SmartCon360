import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { unlink } from 'fs/promises';

type Params = { params: Promise<{ id: string; drawingId: string }> };

// PATCH /api/v1/projects/:id/drawings/:drawingId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { drawingId } = await params;
    const body = await request.json();

    const drawing = await prisma.drawing.update({
      where: { id: drawingId },
      data: body,
    });

    return NextResponse.json({ data: drawing, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/projects/:id/drawings/:drawingId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId, drawingId } = await params;

    const drawing = await prisma.drawing.delete({ where: { id: drawingId } });

    // Try to delete the file from disk
    try {
      await unlink(drawing.filePath);
    } catch {
      // File may not exist, continue
    }

    // Update setup drawing count
    await prisma.projectSetup.update({
      where: { projectId },
      data: { drawingCount: { decrement: 1 } },
    }).catch(() => {});

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
