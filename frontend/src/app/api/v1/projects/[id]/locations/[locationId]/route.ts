import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; locationId: string }> };

// PATCH /api/v1/projects/:id/locations/:locationId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { locationId } = await params;
    const body = await request.json();

    const location = await prisma.location.update({
      where: { id: locationId },
      data: body,
    });

    return NextResponse.json({ data: location, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/projects/:id/locations/:locationId (soft)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { locationId } = await params;

    await prisma.location.update({
      where: { id: locationId },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
