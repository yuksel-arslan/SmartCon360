import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// GET /api/v1/progress/ppc/history — proxy to core-service
export async function GET(request: NextRequest) {
  const qs = new URL(request.url).search;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/ppc/history${qs}`, 'GET', undefined, auth);
  return NextResponse.json(result.data, { status: result.status });
}
