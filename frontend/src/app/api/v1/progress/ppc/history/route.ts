import { NextRequest, NextResponse } from 'next/server';
import { getPPCHistory } from '@/lib/stores/progress-store';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/progress/ppc/history?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId') || 'demo-project-001';
    return NextResponse.json({ data: getPPCHistory(projectId), error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
