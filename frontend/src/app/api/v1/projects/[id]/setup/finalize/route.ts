import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/setup/finalize
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const [setup, drawingCount, wbsCount, cbsCount, tradeCount] = await Promise.all([
      prisma.projectSetup.findUnique({ where: { projectId } }),
      prisma.drawing.count({ where: { projectId } }),
      prisma.wbsNode.count({ where: { projectId, isActive: true } }),
      prisma.cbsNode.count({ where: { projectId, isActive: true } }),
      prisma.trade.count({ where: { projectId, isActive: true } }),
    ]);

    const completed = new Set(setup?.completedSteps || []);
    completed.add('review');

    await prisma.projectSetup.upsert({
      where: { projectId },
      create: {
        projectId,
        currentStep: 'review',
        completedSteps: Array.from(completed),
        drawingCount,
        wbsNodeCount: wbsCount,
        cbsNodeCount: cbsCount,
      },
      update: {
        currentStep: 'review',
        completedSteps: Array.from(completed),
        drawingCount,
        wbsNodeCount: wbsCount,
        cbsNodeCount: cbsCount,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'active' },
    });

    return NextResponse.json({
      data: {
        finalized: true,
        summary: {
          drawings: drawingCount,
          wbsNodes: wbsCount,
          cbsNodes: cbsCount,
          trades: tradeCount,
          boqUploaded: setup?.boqUploaded || false,
          standard: setup?.classificationStandard || 'uniclass',
        },
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
