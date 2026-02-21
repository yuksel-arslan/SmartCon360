import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { updateProjectSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        locations: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        trades: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        members: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: project, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// PATCH /api/v1/projects/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { settings: inputSettings, ...rest } = updateProjectSchema.parse(body);

    // Build update data explicitly to satisfy Prisma's strict types
    const data: Prisma.ProjectUpdateInput = {};

    if (rest.name !== undefined) data.name = rest.name;
    if (rest.description !== undefined) data.description = rest.description;
    if (rest.status !== undefined) data.status = rest.status;
    if (rest.defaultTaktTime !== undefined) data.defaultTaktTime = rest.defaultTaktTime;
    if (rest.address !== undefined) data.address = rest.address;
    if (rest.city !== undefined) data.city = rest.city;
    if (rest.country !== undefined) data.country = rest.country;
    if (rest.budget !== undefined) data.budget = rest.budget;
    if (rest.currency !== undefined) data.currency = rest.currency;
    if (rest.workingDays !== undefined) data.workingDays = rest.workingDays;
    if (rest.plannedStart) data.plannedStart = new Date(rest.plannedStart);
    if (rest.plannedFinish) data.plannedFinish = new Date(rest.plannedFinish);

    // Merge settings with existing project settings instead of overwriting
    if (inputSettings) {
      const existing = await prisma.project.findUnique({
        where: { id },
        select: { settings: true },
      });
      const existingSettings = (existing?.settings as Record<string, unknown>) ?? {};
      data.settings = { ...existingSettings, ...inputSettings } as Prisma.InputJsonValue;
    }

    const project = await prisma.project.update({ where: { id }, data });

    return NextResponse.json({ data: project, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/projects/:id (soft archive)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id } = await params;
    await prisma.project.update({ where: { id }, data: { status: 'archived' } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
