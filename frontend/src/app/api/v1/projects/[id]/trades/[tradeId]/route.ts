import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { updateTradeSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string; tradeId: string }> };

// PATCH /api/v1/projects/:id/trades/:tradeId
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { tradeId } = await params;
    const body = await request.json();
    const input = updateTradeSchema.parse(body);

    const trade = await prisma.trade.update({
      where: { id: tradeId },
      data: input,
    });

    return NextResponse.json({ data: trade, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// DELETE /api/v1/projects/:id/trades/:tradeId (soft)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { tradeId } = await params;

    await prisma.trade.update({
      where: { id: tradeId },
      data: { isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
