import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// GET /api/v1/progress/ppc/current — proxy to core-service with graceful fallback
export async function GET(request: NextRequest) {
  const qs = new URL(request.url).search;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/progress/ppc/current${qs}`, 'GET', undefined, auth);

  // If core-service is unreachable, return empty PPC data instead of 503
  if (!result.ok) {
    return NextResponse.json({
      data: {
        ppcPercent: 0,
        totalCommitted: 0,
        totalCompleted: 0,
        byTrade: [],
        topVarianceReasons: [],
      },
      meta: {
        previousWeekPPC: null,
        change: 0,
        changeDirection: 'stable',
      },
    });
  }

  return NextResponse.json(result.data, { status: result.status });
}
