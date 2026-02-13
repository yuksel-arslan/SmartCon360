import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getFlowline } from '@/lib/services/flowline.service';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/flowline/:planId/comparison — Planned vs actual (mock for Phase 1)
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

    const actual = data.wagons.map((w) => ({
      tradeName: w.tradeName,
      segments: w.segments.map((s) => ({
        ...s,
        xStartActual: s.status === 'completed' ? s.xStart : s.xStart + Math.random() * 0.5,
        xEndActual: s.status === 'completed' ? s.xEnd : s.xEnd + Math.random() * 0.8,
      })),
    }));

    return NextResponse.json({
      data: { planId: data.planId, planned: data.wagons, actual },
    });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}
