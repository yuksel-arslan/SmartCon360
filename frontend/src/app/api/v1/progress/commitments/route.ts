import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// GET /api/v1/progress/commitments — proxy to core-service
export async function GET(request: NextRequest) {
  const qs = new URL(request.url).search;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/commitments${qs}`, 'GET', undefined, auth);
  return NextResponse.json(result.data, { status: result.status });
}

// POST /api/v1/progress/commitments — proxy to core-service
export async function POST(request: NextRequest) {
  const body = await request.json();
  const auth = request.headers.get('authorization');
  const result = await safeForward('/progress/commitments', 'POST', body, auth);
  return NextResponse.json(result.data, { status: result.status });
}

// PATCH /api/v1/progress/commitments — proxy to core-service
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
      { status: 400 }
    );
  }
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/commitments/${id}`, 'PATCH', updates, auth);
  return NextResponse.json(result.data, { status: result.status });
}
