import { NextRequest, NextResponse } from 'next/server';
import { getCurrentPPC } from '@/lib/stores/progress-store';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/progress/ppc/current?projectId=xxx
export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId') || 'demo-project-001';
    const record = getCurrentPPC(projectId);
    return NextResponse.json({ data: record, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
