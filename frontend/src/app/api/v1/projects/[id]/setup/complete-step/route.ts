import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/projects/:id/setup/complete-step
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { step, nextStep } = await request.json();

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
