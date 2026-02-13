import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getFlowline, deleteFlowline } from '@/lib/services/flowline.service';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/flowline/:planId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const data = getFlowline(planId);

    if (!data) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: `Plan ${planId} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/flowline/:planId
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    deleteFlowline(planId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return new NextResponse(null, { status: 204 });
  }
}
