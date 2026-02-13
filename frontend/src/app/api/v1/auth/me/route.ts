import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, unauthorizedResponse } from '@/lib/auth';
import { getProfile, updateProfile } from '@/lib/services/auth.service';
import { updateProfileSchema } from '@/lib/validators/auth';
import { errorResponse } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const profile = await getProfile(userId);
    return NextResponse.json({ data: profile, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const input = updateProfileSchema.parse(body);
    const user = await updateProfile(userId, input);
    return NextResponse.json({ data: user, error: null });
  } catch (err) {
    if (isAuthError(err)) return unauthorizedResponse();
    return errorResponse(err);
  }
}
