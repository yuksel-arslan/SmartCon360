import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { forwardRequest } from '@/lib/backend-proxy';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/takt/plans/:planId — proxy to core-service
export async function GET(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const auth = request.headers.get('authorization');
    // Core-service expects project context; route through takt-plans endpoint
    const res = await forwardRequest(`/takt/plans/${planId}`, 'GET', undefined, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/takt/plans/:planId — proxy to core-service
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const auth = request.headers.get('authorization');
    const res = await forwardRequest(`/takt/plans/${planId}`, 'DELETE', undefined, auth);
    if (res.status === 204) return new NextResponse(null, { status: 204 });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json(
      { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
}
