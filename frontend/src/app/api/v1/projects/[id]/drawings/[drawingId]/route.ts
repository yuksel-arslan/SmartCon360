import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; drawingId: string }> };

// GET /api/v1/projects/:id/drawings/:drawingId — Download drawing file
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { drawingId } = await params;

    const drawing = await prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { fileData: true, originalName: true, fileType: true, fileSize: true },
    });

    if (!drawing || !drawing.fileData) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Drawing file not found' } },
        { status: 404 },
      );
    }

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      dwg: 'application/acad',
      dxf: 'application/dxf',
      rvt: 'application/octet-stream',
      ifc: 'application/x-step',
    };

    return new NextResponse(drawing.fileData, {
      headers: {
        'Content-Type': mimeTypes[drawing.fileType] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(drawing.originalName)}"`,
        'Content-Length': String(drawing.fileSize),
      },
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PATCH /api/v1/projects/:id/drawings/:drawingId — Update metadata
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { drawingId } = await params;
    const body = await request.json();

    // Only allow safe fields to be updated
    const { title, drawingNo, revision, sheetSize, discipline } = body;
    const drawing = await prisma.drawing.update({
      where: { id: drawingId },
      data: {
        ...(title !== undefined && { title }),
        ...(drawingNo !== undefined && { drawingNo }),
        ...(revision !== undefined && { revision }),
        ...(sheetSize !== undefined && { sheetSize }),
        ...(discipline !== undefined && { discipline }),
      },
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

    await prisma.drawing.delete({ where: { id: drawingId } });

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
