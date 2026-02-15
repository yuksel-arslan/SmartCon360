import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createProjectSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/projects — List user's projects (owned + member + all for admin)
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check if user is admin (sees all projects)
    const adminRole = await prisma.userRole.findFirst({
      where: { userId, role: { name: 'admin' }, projectId: null },
      include: { role: true },
    });
    const isAdmin = !!adminRole;

    // Admin sees all; others see owned + member projects
    const where = isAdmin
      ? {}
      : {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { _count: { select: { locations: true, trades: true, members: true } } },
      }),
      prisma.project.count({ where }),
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
    const { classificationStandard, ...projectData } = input;

    const project = await prisma.project.create({
      data: {
        ...projectData,
        plannedStart: projectData.plannedStart ? new Date(projectData.plannedStart) : undefined,
        plannedFinish: projectData.plannedFinish ? new Date(projectData.plannedFinish) : undefined,
        ownerId: userId,
      },
    });

    // Initialize project setup record
    await prisma.projectSetup.create({
      data: {
        projectId: project.id,
        classificationStandard: input.classificationStandard || 'uniclass',
      },
    }).catch(() => {
      // Non-critical — setup will be created on first access if missing
    });

    return NextResponse.json({ data: project, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
