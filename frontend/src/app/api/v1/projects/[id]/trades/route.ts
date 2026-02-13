import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { createTradeSchema } from '@/lib/validators/project';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/projects/:id/trades
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id } = await params;

    const trades = await prisma.trade.findMany({
      where: { projectId: id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ data: trades, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

// POST /api/v1/projects/:id/trades
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const body = await request.json();
    const input = createTradeSchema.parse(body);

    const count = await prisma.trade.count({ where: { projectId } });

    const trade = await prisma.trade.create({
      data: { ...input, projectId, sortOrder: count },
    });

    return NextResponse.json({ data: trade, error: null }, { status: 201 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
