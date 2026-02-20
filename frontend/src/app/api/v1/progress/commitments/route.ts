import { NextRequest, NextResponse } from 'next/server';
import { forwardRequest } from '@/lib/backend-proxy';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/progress/commitments — proxy to core-service
export async function GET(request: NextRequest) {
  try {
    const qs = new URL(request.url).search;
    const auth = request.headers.get('authorization');
    const res = await forwardRequest(`/progress/commitments${qs}`, 'GET', undefined, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/v1/progress/commitments — proxy to core-service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = request.headers.get('authorization');
    const res = await forwardRequest('/progress/commitments', 'POST', body, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}

// PATCH /api/v1/progress/commitments — proxy to core-service
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
        { status: 400 }
      );
    }
    const auth = request.headers.get('authorization');
    const res = await forwardRequest(`/progress/commitments/${id}`, 'PATCH', updates, auth);
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return errorResponse(err);
  }
}
