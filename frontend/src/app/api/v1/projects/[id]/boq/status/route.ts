import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/boq/status
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const setup = await prisma.projectSetup.findUnique({
      where: { projectId },
      select: { boqUploaded: true, boqFileName: true, boqItemCount: true },
    });

    return NextResponse.json({
      data: setup || { boqUploaded: false, boqFileName: null, boqItemCount: 0 },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Unknown error' } }, { status: 500 });
  }
}
