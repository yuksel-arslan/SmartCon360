import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getWeeklyCommitments, addWeeklyCommitment, updateCommitment } from '@/lib/stores/progress-store';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/progress/commitments?projectId=xxx&weekStart=xxx
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const projectId = params.get('projectId') || 'demo-project-001';
    const weekStart = params.get('weekStart') || '2026-03-23';
    return NextResponse.json({ data: getWeeklyCommitments(projectId, weekStart), error: null });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST /api/v1/progress/commitments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const commitment = {
      id: uuidv4(),
      projectId: body.projectId,
      weekStart: body.weekStart,
      weekEnd: body.weekEnd,
      tradeId: body.tradeId,
      tradeName: body.tradeName,
      zoneId: body.zoneId,
      zoneName: body.zoneName,
      description: body.description,
      committed: true,
      completed: false,
    };

    addWeeklyCommitment(commitment);
    return NextResponse.json({ data: commitment, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

// PATCH /api/v1/progress/commitments
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'id is required' } },
        { status: 400 }
      );
    }
    const updated = updateCommitment(id, updates);
    if (!updated) {
      return NextResponse.json(
        { data: null, error: { code: 'NOT_FOUND', message: 'Commitment not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: updated, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
