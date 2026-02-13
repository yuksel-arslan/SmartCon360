import { NextRequest, NextResponse } from 'next/server';
import { logout } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.refreshToken) {
      await logout(body.refreshToken);
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
