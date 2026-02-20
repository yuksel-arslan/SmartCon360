import { NextRequest, NextResponse } from 'next/server';
import { safeForward } from '@/lib/backend-proxy';

// POST /api/v1/progress/ppc/calculate — proxy to core-service
export async function POST(request: NextRequest) {
  const body = await request.json();
  const auth = request.headers.get('authorization');
  const result = await safeForward('/progress/ppc/calculate', 'POST', body, auth);
  return NextResponse.json(result.data, { status: result.status });
}
