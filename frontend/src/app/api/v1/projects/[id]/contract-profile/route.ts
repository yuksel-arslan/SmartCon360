import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/contract-profile — Contract profile & policies
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, settings: true },
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 },
      );
    }

    // Extract contract profile from project settings if it exists
    const settings = (project.settings as Record<string, unknown>) || {};
    const contractProfile = settings.contractProfile as Record<string, unknown> | undefined;

    if (!contractProfile) {
      return NextResponse.json({
        data: null,
        meta: { hasProfile: false },
        error: null,
      });
    }

    return NextResponse.json({
      data: {
        profile: contractProfile,
        policies: (settings.contractPolicies as unknown[]) || [],
      },
      meta: { hasProfile: true },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
