import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// GET /api/v1/progress/variance/reasons — proxy to core-service
export async function GET(request: NextRequest) {
  const qs = new URL(request.url).search;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/variance/reasons${qs}`, 'GET', undefined, auth);

  if (!result.ok) {
    return NextResponse.json({
      data: { topReasons: [], byCategory: [] },
      meta: { totalVariances: 0, totalCategories: 0 },
    });
  }

  return NextResponse.json(result.data, { status: result.status });
}
