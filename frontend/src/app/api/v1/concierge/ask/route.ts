import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { askConcierge } from '@/lib/stores/concierge-store';
import { errorResponse } from '@/lib/errors';

// POST /api/v1/concierge/ask — Ask the AI concierge (alias)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session_id, project_id } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { data: null, error: { code: 'VALIDATION_ERROR', message: 'message is required' } },
        { status: 400 }
      );
    }

    const sessionId = session_id || uuidv4();
    const result = askConcierge(sessionId, message);

    return NextResponse.json({
      data: {
        response: result.answer,
        content: result.answer,
        sources: result.sources,
        suggestions: result.suggestions,
        confidence: result.confidence,
        intent: result.intent,
        session_id: sessionId,
      },
      error: null,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
