import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createProjectSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/projects — List user's projects
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { locations: true, trades: true, members: true } } },
      }),
      prisma.project.count({ where: { ownerId: userId } }),
    ]);

    return NextResponse.json({ data: projects, meta: { page, limit, total }, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects — Create new project
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const input = createProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        ...input,
        plannedStart: input.plannedStart ? new Date(input.plannedStart) : undefined,
        plannedFinish: input.plannedFinish ? new Date(input.plannedFinish) : undefined,
        ownerId: userId,
      },
    });

    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
