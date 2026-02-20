import { NextRequest, NextResponse } from 'next/server';
import { forwardRequest } from '@/lib/backend-proxy';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/progress/ppc/current — proxy to core-service
export async function GET(request: NextRequest) {
  try {
    const qs = new URL(request.url).search;
    const auth = request.headers.get('authorization');
    const res = await forwardRequest(`/progress/ppc/current${qs}`, 'GET', undefined, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}
