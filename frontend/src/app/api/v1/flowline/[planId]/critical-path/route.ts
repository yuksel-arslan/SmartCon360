import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getFlowline } from '@/lib/services/flowline.service';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/flowline/:planId/critical-path
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const data = getFlowline(planId);

    if (!data) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
    }

    const criticalTrades = data.wagons
      .filter((w) => w.segments.some((s) => s.status === 'delayed' || s.status === 'in_progress'))
      .map((w) => w.tradeName);

    return NextResponse.json({
      data: { planId: data.planId, criticalTrades },
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}
