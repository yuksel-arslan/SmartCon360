import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse, AppError } from '@/lib/errors';

type Params = { params: Promise<{ id: string; memberId: string }> };

// DELETE /api/v1/projects/:id/members/:memberId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId, memberId } = await params;

    const member = await prisma.projectMember.findFirst({
      where: { id: memberId, projectId },
    });
    if (!member) throw new AppError('Member not found', 'MEMBER_NOT_FOUND', 404);

    await prisma.projectMember.delete({ where: { id: memberId } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
