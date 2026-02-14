import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
});

// POST /api/v1/admin/users/:id/roles — assign role to user
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const adminId = requireAuth(request);
    const { id: targetUserId } = await params;

    // Check admin
    const isAdmin = await prisma.userRole.findFirst({
      where: { userId: adminId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roleId, projectId } = assignRoleSchema.parse(body);

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new AppError('Role not found', 'ROLE_NOT_FOUND', 404);

    // Check duplicate
    const existing = await prisma.userRole.findFirst({
      where: { userId: targetUserId, roleId, projectId: projectId || null },
    });
    if (existing) throw new AppError('Role already assigned', 'ROLE_ALREADY_ASSIGNED', 409);

    const userRole = await prisma.userRole.create({
      data: { userId: targetUserId, roleId, projectId: projectId || null, grantedBy: adminId },
      include: { role: true },
    });

    return NextResponse.json({
      data: {
        id: userRole.id,
        roleId: userRole.roleId,
        roleName: userRole.role.name,
        projectId: userRole.projectId,
        grantedBy: userRole.grantedBy,
        createdAt: userRole.createdAt,
      },
      error: null,
    }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
