import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { safeForward } from '@/lib/backend-proxy';

type Params = { params: Promise<{ planId: string }> };

// POST /api/v1/takt/plans/:planId/activate — proxy to core-service
export async function POST(request: NextRequest, { params }: Params) {
  getUserId(request);
  const { planId } = await params;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/takt/plans/${planId}/activate`, 'POST', undefined, auth);
  return NextResponse.json(result.data, { status: result.status });
}
