import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validators/auth';
import { register } from '@/lib/services/auth.service';
import { errorResponse } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);
    const result = await register(input);
    return NextResponse.json({ data: result, error: null }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
