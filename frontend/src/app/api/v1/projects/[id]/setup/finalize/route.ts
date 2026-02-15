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

    // Gather all required data counts
    const [setup, project, drawingCount, wbsCount, cbsCount, zoneCount, tradeCount] = await Promise.all([
      prisma.projectSetup.findUnique({ where: { projectId } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { settings: true } }),
      prisma.drawing.count({ where: { projectId } }),
      prisma.wbsNode.count({ where: { projectId, isActive: true } }),
      prisma.cbsNode.count({ where: { projectId, isActive: true } }),
      prisma.location.count({ where: { projectId, isActive: true, locationType: 'zone' } }),
      prisma.trade.count({ where: { projectId, isActive: true } }),
    ]);

    // Validate all required steps have data
    const missing: string[] = [];
    if (wbsCount === 0) missing.push('WBS (no nodes generated)');
    if (cbsCount === 0) missing.push('CBS (no cost categories generated)');
    if (zoneCount === 0) missing.push('LBS (no takt zones created)');
    if (tradeCount === 0) missing.push('Trades (no trades applied)');

    const settings = (project?.settings as Record<string, unknown>) || {};
    const taktConfig = settings.taktConfig as Record<string, unknown> | undefined;
    if (!taktConfig || typeof taktConfig.defaultTaktTime !== 'number') {
      missing.push('Takt Configuration (not saved)');
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'FINALIZATION_BLOCKED',
            message: `Cannot finalize — missing required data: ${missing.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // All validations passed — finalize
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
          zones: zoneCount,
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
