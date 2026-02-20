import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { safeForward } from '@/lib/backend-proxy';

type Params = { params: Promise<{ planId: string }> };

// GET /api/v1/takt/plans/:planId — proxy to core-service
export async function GET(request: NextRequest, { params }: Params) {
  getUserId(request); // optional auth check
  const { planId } = await params;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/takt/plans/${planId}`, 'GET', undefined, auth);
  return NextResponse.json(result.data, { status: result.status });
}

// DELETE /api/v1/takt/plans/:planId — proxy to core-service
export async function DELETE(request: NextRequest, { params }: Params) {
  getUserId(request);
  const { planId } = await params;
  const auth = request.headers.get('authorization');
  const result = await safeForward(`/takt/plans/${planId}`, 'DELETE', undefined, auth);
  return NextResponse.json(result.data, { status: result.status });
}
