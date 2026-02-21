import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// GET /api/v1/progress/ppc/by-trade — proxy to core-service
export async function GET(request: NextRequest) {
  const qs = new URL(request.url).search;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/ppc/by-trade${qs}`, 'GET', undefined, auth);

  if (!result.ok) {
    return NextResponse.json({
      data: { weekStart: '', weekEnd: '', overallPPC: 0, byTrade: [] },
    });
  }

  return NextResponse.json(result.data, { status: result.status });
}
