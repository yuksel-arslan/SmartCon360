import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import {
  getTradesForProjectType,
  getDisciplineOptions,
} from '@/lib/templates/trade-discipline-templates';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/setup/trade-templates
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectType: true },
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 },
      );
    }

    const trades = getTradesForProjectType(project.projectType);
    const disciplines = getDisciplineOptions();

    return NextResponse.json({
      data: { projectType: project.projectType, trades, disciplines, totalTrades: trades.length },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
