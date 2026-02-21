import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { errorResponse } from '@/lib/errors';

type Params = { params: Promise<{ id: string }> };

interface TradeUpdate {
  id: string;
  contractType?: string;
  subcontractorGroup?: string | null;
}

// PATCH /api/v1/projects/:id/setup/save-trades
// Bulk update contractType and subcontractorGroup for existing trades
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { id: projectId } = await params;
    const { trades } = await request.json() as { trades: TradeUpdate[] };

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json(
        { data: null, error: { code: 'BAD_REQUEST', message: 'trades array is required' } },
        { status: 400 },
      );
    }

    const validContractTypes = ['labor_only', 'supply_and_fix', 'supply_install'];
    let updated = 0;

    for (const t of trades) {
      if (!t.id) continue;

      const data: Record<string, string | null> = {};

      if (t.contractType && validContractTypes.includes(t.contractType)) {
        data.contractType = t.contractType;
      }

      if (t.subcontractorGroup !== undefined) {
        data.subcontractorGroup = t.subcontractorGroup || null;
      }

      if (Object.keys(data).length === 0) continue;

      await prisma.trade.updateMany({
        where: { id: t.id, projectId },
        data,
      });
      updated++;
    }

    return NextResponse.json({
      data: { updated },
      error: null,
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
