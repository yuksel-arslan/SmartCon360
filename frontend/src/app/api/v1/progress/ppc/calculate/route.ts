import { NextRequest, NextResponse } from 'next/server';
import { calculatePPC } from '@/lib/stores/progress-store';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/progress/ppc/calculate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, weekStart, weekEnd } = body;

    if (!projectId || !weekStart || !weekEnd) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'projectId, weekStart, and weekEnd are required' } },
        { status: 400 }
      );
    }

    const record = calculatePPC(projectId, weekStart, weekEnd);
    return NextResponse.json({ data: record, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
