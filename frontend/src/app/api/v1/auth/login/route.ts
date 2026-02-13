import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validators/auth';
import { login } from '@/lib/services/auth.service';
import { errorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const result = await login(input);
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    return errorResponse(err);
  }
}
