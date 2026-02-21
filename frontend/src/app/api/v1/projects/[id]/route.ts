import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
    const input = updateProjectSchema.parse(body);

    // If settings is provided, merge with existing settings (deep merge top-level keys)
    let mergedSettings: Record<string, unknown> | undefined;
    if (input.settings) {
      const existing = await prisma.project.findUnique({ where: { id }, select: { settings: true } });
      const existingSettings = (existing?.settings as Record<string, unknown>) || {};
      mergedSettings = { ...existingSettings, ...input.settings };
    }

    const { settings: _settings, plannedStart, plannedFinish, ...rest } = input;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(mergedSettings && { settings: mergedSettings as Prisma.InputJsonValue }),
        ...(plannedStart && { plannedStart: new Date(plannedStart) }),
        ...(plannedFinish && { plannedFinish: new Date(plannedFinish) }),
      },
    });

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
