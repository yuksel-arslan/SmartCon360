import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// Server-side validation: steps that must have data before they can be marked complete
const STEP_VALIDATORS: Record<string, (projectId: string) => Promise<{ valid: boolean; message: string }>> = {
  wbs: async (projectId) => {
    const count = await prisma.wbsNode.count({ where: { projectId, isActive: true } });
    return { valid: count > 0, message: 'Generate WBS before completing this step' };
  },
  cbs: async (projectId) => {
    const count = await prisma.cbsNode.count({ where: { projectId, isActive: true } });
    return { valid: count > 0, message: 'Generate CBS before completing this step' };
  },
  lbs: async (projectId) => {
    const zoneCount = await prisma.location.count({ where: { projectId, isActive: true, locationType: 'zone' } });
    return { valid: zoneCount > 0, message: 'Create locations with at least 1 zone before completing this step' };
  },
  trades: async (projectId) => {
    const count = await prisma.trade.count({ where: { projectId } });
    return { valid: count > 0, message: 'Apply at least 1 trade before completing this step' };
  },
  takt: async (projectId) => {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { settings: true },
    });
    const settings = (project?.settings as Record<string, unknown>) || {};
    const taktConfig = settings.taktConfig as Record<string, unknown> | undefined;
    return {
      valid: !!taktConfig && typeof taktConfig.defaultTaktTime === 'number',
      message: 'Save takt configuration before completing this step',
    };
  },
};

// POST /api/v1/projects/:id/setup/complete-step
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { step, nextStep } = await request.json();

    if (!step) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION', message: 'step is required' } },
        { status: 400 },
      );
    }

    // Validate step requirements before marking complete
    const validator = STEP_VALIDATORS[step];
    if (validator) {
      const { valid, message } = await validator(projectId);
      if (!valid) {
        return NextResponse.json(
          { data: null, error: { code: 'STEP_INCOMPLETE', message } },
          { status: 400 },
        );
      }
    }

    const setup = await prisma.projectSetup.findUnique({ where: { projectId } });
    const completed = new Set(setup?.completedSteps || []);
    completed.add(step);

    const updated = await prisma.projectSetup.upsert({
      where: { projectId },
      create: {
        projectId,
        currentStep: nextStep || step,
        completedSteps: Array.from(completed),
      },
      update: {
        currentStep: nextStep || step,
        completedSteps: Array.from(completed),
      },
    });

    return NextResponse.json({ data: updated, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
