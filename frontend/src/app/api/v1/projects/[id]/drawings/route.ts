import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

const ALLOWED_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.rvt', '.ifc'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB (database storage limit)

type Params = { params: Promise<{ id: string }> };

// Fields to return in list queries (exclude fileData to avoid loading binary)
const DRAWING_LIST_SELECT = {
  id: true,
  projectId: true,
  fileName: true,
  originalName: true,
  fileType: true,
  fileSize: true,
  filePath: true,
  discipline: true,
  drawingNo: true,
  title: true,
  revision: true,
  sheetSize: true,
  status: true,
  uploadedBy: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
};

// GET /api/v1/projects/:id/drawings — List drawings
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get('discipline');

    const where: Record<string, unknown> = { projectId };
    if (discipline) where.discipline = discipline;

    const drawings = await prisma.drawing.findMany({
      where,
      select: DRAWING_LIST_SELECT,
      orderBy: [{ discipline: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ data: drawings, meta: { total: drawings.length }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/drawings — Upload drawings (stored in PostgreSQL)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = requireAuth(request);
    const { id: projectId } = await params;

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const discipline = (formData.get('discipline') as string) || 'general';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'NO_FILES', message: 'No files uploaded' } },
        { status: 400 },
      );
    }

    const created = [];
    const errors = [];

    for (const file of files) {
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? '.' + nameParts.pop()!.toLowerCase() : '';

      // Validate extension
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: unsupported file type ${ext}`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit`);
        continue;
      }

      // Read file into buffer and store in database
      const buffer = Buffer.from(await file.arrayBuffer());

      const drawing = await prisma.drawing.create({
        data: {
          projectId,
          fileName: file.name,
          originalName: file.name,
          fileType: ext.replace('.', ''),
          fileSize: file.size,
          filePath: 'database',
          fileData: buffer,
          discipline,
          title: file.name.replace(/\.[^.]+$/, ''),
          uploadedBy: userId,
        },
        select: DRAWING_LIST_SELECT,
      });

      created.push(drawing);
    }

    if (created.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: errors.join('; ') } },
        { status: 400 },
      );
    }

    // Update setup drawing count
    if (created.length > 0) {
      await prisma.projectSetup.upsert({
        where: { projectId },
        create: { projectId, drawingCount: created.length },
        update: { drawingCount: { increment: created.length } },
      });
    }

    return NextResponse.json(
      {
        data: created,
        meta: { count: created.length, errors: errors.length > 0 ? errors : undefined },
        error: null,
      },
      { status: 201 },
    );
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
