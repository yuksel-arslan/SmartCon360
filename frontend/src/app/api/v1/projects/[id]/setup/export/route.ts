import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/setup/export
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const [project, setup, wbsNodes, cbsNodes, trades, drawings] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { projectType: true, currency: true, name: true, code: true },
      }),
      prisma.projectSetup.findUnique({ where: { projectId } }),
      prisma.wbsNode.findMany({ where: { projectId, isActive: true }, orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }] }),
      prisma.cbsNode.findMany({
        where: { projectId, isActive: true },
        orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }],
        include: { wbsNode: { select: { id: true, code: true, name: true } } },
      }),
      prisma.trade.findMany({ where: { projectId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.drawing.findMany({
        where: { projectId },
        select: { id: true, discipline: true, drawingNo: true, title: true, fileType: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        project,
        setup: {
          standard: setup?.classificationStandard || 'uniclass',
          boqUploaded: setup?.boqUploaded || false,
          wbsGenerated: setup?.wbsGenerated || false,
          cbsGenerated: setup?.cbsGenerated || false,
        },
        wbs: { nodes: wbsNodes, count: wbsNodes.length },
        cbs: { nodes: cbsNodes, count: cbsNodes.length },
        trades: { items: trades, count: trades.length },
        drawings: { items: drawings, count: drawings.length },
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
