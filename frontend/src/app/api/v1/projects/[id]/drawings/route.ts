import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
const ALLOWED_EXTENSIONS = ['.pdf', '.dwg', '.dxf', '.rvt', '.ifc'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

type Params = { params: Promise<{ id: string }> };

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
      orderBy: [{ discipline: 'asc' }, { createdAt: 'desc' }],
    });

    const grouped: Record<string, typeof drawings> = {};
    for (const d of drawings) {
      if (!grouped[d.discipline]) grouped[d.discipline] = [];
      grouped[d.discipline].push(d);
    }

    return NextResponse.json({ data: drawings, meta: { grouped, total: drawings.length }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/drawings — Upload drawings (multipart/form-data)
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = requireAuth(request);
    const { id: projectId } = await params;

    // Ensure uploads directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

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
      const ext = path.extname(file.name).toLowerCase();

      // Validate extension
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: unsupported file type ${ext}`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 100 MB limit`);
        continue;
      }

      // Save file to disk
      const uniqueName = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(UPLOAD_DIR, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Create database record
      const drawing = await prisma.drawing.create({
        data: {
          projectId,
          fileName: uniqueName,
          originalName: file.name,
          fileType: ext.replace('.', ''),
          fileSize: file.size,
          filePath,
          discipline,
          title: file.name.replace(/\.[^.]+$/, ''),
          uploadedBy: userId,
        },
      });

      created.push(drawing);
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
