import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/setup — Get setup state
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const [setup, project, drawingCount, wbsCount, cbsCount] = await Promise.all([
      prisma.projectSetup.findUnique({ where: { projectId } }),
      prisma.project.findUnique({
        where: { id: projectId },
        select: { projectType: true, currency: true, name: true },
      }),
      prisma.drawing.count({ where: { projectId } }),
      prisma.wbsNode.count({ where: { projectId, isActive: true } }),
      prisma.cbsNode.count({ where: { projectId, isActive: true } }),
    ]);

    const state = setup || {
      currentStep: 'classification',
      completedSteps: [],
      classificationStandard: 'uniclass',
      boqUploaded: false,
      boqFileName: null,
      boqItemCount: 0,
      drawingCount: 0,
      wbsGenerated: false,
      wbsNodeCount: 0,
      cbsGenerated: false,
      cbsNodeCount: 0,
      taktPlanGenerated: false,
    };

    return NextResponse.json({
      data: {
        ...state,
        drawingCount,
        wbsNodeCount: wbsCount,
        cbsNodeCount: cbsCount,
        projectType: project?.projectType,
        currency: project?.currency,
        projectName: project?.name,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PATCH /api/v1/projects/:id/setup — Update setup state
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { currentStep, completedSteps, classificationStandard, taktPlanGenerated } = await request.json();

    const setup = await prisma.projectSetup.upsert({
      where: { projectId },
      create: {
        projectId,
        currentStep: currentStep || 'classification',
        completedSteps: completedSteps || [],
        classificationStandard: classificationStandard || 'uniclass',
        taktPlanGenerated: taktPlanGenerated || false,
      },
      update: {
        ...(currentStep && { currentStep }),
        ...(completedSteps && { completedSteps }),
        ...(classificationStandard && { classificationStandard }),
        ...(taktPlanGenerated !== undefined && { taktPlanGenerated }),
      },
    });

    return NextResponse.json({ data: setup, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
