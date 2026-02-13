import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';

export function signAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
}

export function getUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const decoded = verifyAccessToken(authHeader.substring(7));
    return decoded.sub;
  } catch {
    return null;
  }
}

export function requireAuth(request: NextRequest): string {
  const userId = getUserId(request);
  if (!userId) {
    throw new AuthError();
  }
  return userId;
}

class AuthError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthError';
  }
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization' } },
    { status: 401 }
  );
}

export function isAuthError(err: unknown): boolean {
  return err instanceof AuthError;
}
