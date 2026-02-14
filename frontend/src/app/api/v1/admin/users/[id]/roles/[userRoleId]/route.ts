import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';

type Params = { params: Promise<{ id: string; userRoleId: string }> };

// DELETE /api/v1/admin/users/:id/roles/:userRoleId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const adminId = requireAuth(request);
    const { id: targetUserId, userRoleId } = await params;

    const isAdmin = await prisma.userRole.findFirst({
      where: { userId: adminId, role: { name: 'admin' }, projectId: null },
    });
    if (!isAdmin) {
      return NextResponse.json(
        { data: null, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const userRole = await prisma.userRole.findFirst({
      where: { id: userRoleId, userId: targetUserId },
    });
    if (!userRole) throw new AppError('User role not found', 'USER_ROLE_NOT_FOUND', 404);

    await prisma.userRole.delete({ where: { id: userRoleId } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
