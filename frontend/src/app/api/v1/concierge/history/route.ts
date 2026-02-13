import { NextRequest, NextResponse } from 'next/server';
import { getConversation, clearConversation } from '@/lib/stores/concierge-store';
import { errorResponse } from '@/lib/errors';

// GET /api/v1/concierge/history?session_id=xxx
export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'session_id is required' } },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: getConversation(sessionId), error: null });
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE /api/v1/concierge/history?session_id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (sessionId) clearConversation(sessionId);
    return NextResponse.json({ data: { cleared: true }, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
