import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { CBS_STANDARDS } from '@/lib/templates/cbs-templates';

// GET /api/v1/projects/:id/cbs/standards
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    return NextResponse.json({ data: CBS_STANDARDS, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return NextResponse.json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Unknown error' } }, { status: 500 });
  }
}
