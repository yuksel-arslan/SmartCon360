import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { forwardRequest } from '@/lib/backend-proxy';

type Params = { params: Promise<{ planId: string }> };

// POST /api/v1/takt/plans/:planId/activate — proxy to core-service
export async function POST(request: NextRequest, { params }: Params) {
  try {
    requireAuth(request);
    const { planId } = await params;
    const auth = request.headers.get('authorization');
    const res = await forwardRequest(`/takt/plans/${planId}/activate`, 'POST', undefined, auth);
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
