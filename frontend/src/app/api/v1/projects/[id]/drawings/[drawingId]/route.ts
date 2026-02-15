import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  isS3Enabled,
  getDownloadUrl,
  getFileStream,
  deleteFileS3,
  MIME_TYPES,
} from '@/lib/storage';
import { downloadFromDrive, getDriveDownloadLink, deleteFromDrive } from '@/lib/google-drive';

type Params = { params: Promise<{ id: string; drawingId: string }> };

/** Get the project owner's Google Drive refresh token */
async function getOwnerDriveToken(projectId: string): Promise<string | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return null;

  const owner = await prisma.user.findUnique({
    where: { id: project.ownerId },
    select: { googleRefreshToken: true },
  });

  return owner?.googleRefreshToken || null;
}

// GET /api/v1/projects/:id/drawings/:drawingId — Download drawing file
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId, drawingId } = await params;

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
    const storageProvider = metadata.storageProvider as string;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // ── Google Drive ──
    if (storageProvider === 'google-drive') {
      const driveFileId = (metadata.driveFileId as string) || drawing.filePath;
      const ownerToken = await getOwnerDriveToken(projectId);

      if (!ownerToken) {
        return NextResponse.json(
          { data: null, error: { code: 'DRIVE_DISCONNECTED', message: 'Project owner has disconnected Google Drive' } },
          { status: 503 },
        );
      }

      if (mode === 'url') {
        const url = await getDriveDownloadLink(ownerToken, driveFileId);
        return NextResponse.json({ data: { url }, error: null });
      }

      // Proxy download through server
      const buffer = await downloadFromDrive(ownerToken, driveFileId);
      const mimeType = MIME_TYPES[drawing.fileType] || 'application/octet-stream';

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(drawing.originalName)}"`,
          'Content-Length': String(buffer.length),
        },
      });
    }

    // ── S3 ──
    if (storageProvider === 's3' && isS3Enabled()) {
      if (mode === 'url') {
        const url = await getDownloadUrl(drawing.filePath, 3600);
        return NextResponse.json({ data: { url }, error: null });
      }

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

    const drawing = await prisma.drawing.findUnique({
      where: { id: drawingId },
      select: { filePath: true, metadata: true },
    });

    if (drawing) {
      const metadata = (drawing.metadata as Record<string, unknown>) || {};
      const storageProvider = metadata.storageProvider as string;

      if (storageProvider === 'google-drive') {
        const driveFileId = (metadata.driveFileId as string) || drawing.filePath;
        const ownerToken = await getOwnerDriveToken(projectId);
        if (ownerToken) {
          await deleteFromDrive(ownerToken, driveFileId).catch(() => {});
        }
      } else if (storageProvider === 's3' && isS3Enabled()) {
        await deleteFileS3(drawing.filePath).catch(() => {});
      }
    }

    await prisma.drawing.delete({ where: { id: drawingId } });

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
