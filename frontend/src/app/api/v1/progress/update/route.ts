import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { addProgressUpdate } from '@/lib/stores/progress-store';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/progress/update
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, assignmentId, zoneId, tradeId, percentComplete, status, notes, reportedBy } = body;

    if (!projectId || !assignmentId || !zoneId || !tradeId) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'projectId, assignmentId, zoneId, and tradeId are required' } },
        { status: 400 }
      );
    }

    const update = {
      id: uuidv4(),
      projectId,
      assignmentId,
      zoneId,
      tradeId,
      reportedBy: reportedBy || 'system',
      percentComplete: percentComplete || 0,
      previousPercent: 0,
      status: status || 'in_progress',
      notes,
      reportedAt: new Date().toISOString(),
    };

    addProgressUpdate(update);
    return NextResponse.json({ data: update, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
