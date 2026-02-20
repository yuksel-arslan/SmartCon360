import { NextRequest, NextResponse } from 'next/server';
import { forwardRequest } from '@/lib/backend-proxy';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/progress/update — proxy to core-service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = request.headers.get('authorization');
    const res = await forwardRequest('/progress/update', 'POST', body, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}
