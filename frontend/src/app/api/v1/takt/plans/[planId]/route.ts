import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getPlan, deletePlan } from '@/lib/stores/takt-plans';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/takt/plans/:planId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const plan = getPlan(planId);

    if (!plan) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: plan, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/takt/plans/:planId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;

    if (!deletePlan(planId)) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Plan not found' } },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}
