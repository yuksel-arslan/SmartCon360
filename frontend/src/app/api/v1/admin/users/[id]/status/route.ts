import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/v1/admin/users/:id/status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const adminId = requireAuth(request);
    const { id: targetUserId } = await params;

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
    const { isActive } = z.object({ isActive: z.boolean() }).parse(body);

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });

    return NextResponse.json({
      data: { id: user.id, isActive: user.isActive },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
