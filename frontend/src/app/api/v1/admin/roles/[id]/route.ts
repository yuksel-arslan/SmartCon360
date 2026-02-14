import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const updateRoleSchema = z.object({
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

// PATCH /api/v1/admin/roles/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = requireAuth(request);
    const { id } = await params;

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const input = updateRoleSchema.parse(body);

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.permissions && { permissions: input.permissions }),
      },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        permissions: updated.permissions,
        isSystem: updated.isSystem,
      },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/admin/roles/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = requireAuth(request);
    const { id } = await params;

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);
    if (role.isSystem) throw new AppError('Cannot delete system role', 'SYSTEM_ROLE', 400);

    await prisma.userRole.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
