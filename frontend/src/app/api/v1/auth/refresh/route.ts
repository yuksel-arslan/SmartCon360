import { NextRequest, NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/validators/auth';
import { refresh } from '@/lib/services/auth.service';
import { errorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = refreshSchema.parse(body);
    const tokens = await refresh(refreshToken);
    return NextResponse.json({ data: tokens, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
