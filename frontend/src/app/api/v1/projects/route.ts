import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
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

    // Admin sees all; others see owned + member projects. Always exclude archived.
    const where: Prisma.ProjectWhereInput = isAdmin
      ? { status: { not: 'archived' } }
      : {
          AND: [
            { status: { not: 'archived' } },
            {
              OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
              ],
            },
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

    // Build create data explicitly to satisfy Prisma's strict types
    const data: Prisma.ProjectUncheckedCreateInput = {
      name: projectData.name,
      code: projectData.code,
      projectType: projectData.projectType,
      ownerId: userId,
    };

    if (projectData.description !== undefined) data.description = projectData.description;
    if (projectData.defaultTaktTime !== undefined) data.defaultTaktTime = projectData.defaultTaktTime;
    if (projectData.address !== undefined) data.address = projectData.address;
    if (projectData.city !== undefined) data.city = projectData.city;
    if (projectData.country !== undefined) data.country = projectData.country;
    if (projectData.budget !== undefined) data.budget = projectData.budget;
    if (projectData.currency !== undefined) data.currency = projectData.currency;
    if (projectData.plannedStart) data.plannedStart = new Date(projectData.plannedStart);
    if (projectData.plannedFinish) data.plannedFinish = new Date(projectData.plannedFinish);

    const project = await prisma.project.create({ data });

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
