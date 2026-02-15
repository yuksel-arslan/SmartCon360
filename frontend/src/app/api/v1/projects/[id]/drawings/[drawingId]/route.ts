import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  isCloudStorageEnabled,
  getDownloadUrl,
  getFileStream,
  deleteFile,
  MIME_TYPES,
} from '@/lib/storage';

type Params = { params: Promise<{ id: string; drawingId: string }> };

// GET /api/v1/projects/:id/drawings/:drawingId — Download drawing file
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { drawingId } = await params;

    const drawing = await prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { filePath: true, fileData: true, originalName: true, fileType: true, fileSize: true, metadata: true },
    });

    if (!drawing) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Drawing not found' } },
        { status: 404 },
      );
    }

    const metadata = (drawing.metadata as Record<string, unknown>) || {};
    const isCloud = metadata.storageProvider === 's3' && drawing.filePath !== 'database';

    if (isCloud && isCloudStorageEnabled()) {
      // ── Cloud storage: redirect to presigned URL ──
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('mode');

      if (mode === 'url') {
        // Return presigned URL as JSON (for frontend to open in new tab)
        const url = await getDownloadUrl(drawing.filePath, 3600);
        return NextResponse.json({ data: { url }, error: null });
      }

      // Proxy the file through the server (preserves auth)
      const { body, contentType, contentLength } = await getFileStream(drawing.filePath);
      if (!body) {
        return NextResponse.json(
          { data: null, error: { code: 'NOT_FOUND', message: 'File not found in storage' } },
          { status: 404 },
        );
      }

      return new NextResponse(body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(drawing.originalName)}"`,
          ...(contentLength > 0 && { 'Content-Length': String(contentLength) }),
        },
      });
    }

    // ── Database fallback ──
    if (!drawing.fileData) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Drawing file not found' } },
        { status: 404 },
      );
    }

    const mimeType = MIME_TYPES[drawing.fileType] || 'application/octet-stream';

    return new NextResponse(drawing.fileData, {
      headers: {
        'Content-Type': mimeType,
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

    // Fetch drawing to check storage location before deleting
    const drawing = await prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { filePath: true, metadata: true },
    });

    if (drawing) {
      const metadata = (drawing.metadata as Record<string, unknown>) || {};
      const isCloud = metadata.storageProvider === 's3' && drawing.filePath !== 'database';

      // Delete from cloud storage if applicable
      if (isCloud && isCloudStorageEnabled()) {
        await deleteFile(drawing.filePath).catch(() => {});
      }
    }

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
