import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Map Prisma error codes to user-friendly messages */
const PRISMA_ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  P1001: { status: 503, code: 'DB_UNREACHABLE', message: 'Database server is unreachable. Please try again later.' },
  P1002: { status: 503, code: 'DB_TIMEOUT', message: 'Database server timed out.' },
  P1008: { status: 503, code: 'DB_TIMEOUT', message: 'Database operation timed out.' },
  P1017: { status: 503, code: 'DB_CONNECTION_CLOSED', message: 'Database connection was closed.' },
  P2002: { status: 409, code: 'DUPLICATE', message: 'Resource already exists.' },
  P2024: { status: 503, code: 'DB_POOL_TIMEOUT', message: 'Database connection pool timed out.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Record not found.' },
};

export function errorResponse(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json(
      { data: null, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.errors } },
      { status: 400 }
    );
  }

  if (err instanceof AppError) {
    return NextResponse.json(
      { data: null, error: { code: err.code, message: err.message } },
      { status: err.statusCode }
    );
  }

  // Prisma errors (PrismaClientKnownRequestError, PrismaClientInitializationError, etc.)
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code;
    const mapped = PRISMA_ERROR_MAP[code];
    if (mapped) {
      console.error(`Prisma error [${code}]:`, err);
      return NextResponse.json(
        { data: null, error: { code: mapped.code, message: mapped.message } },
        { status: mapped.status }
      );
    }
  }

  // Prisma initialization error (no code property, but has name)
  if (err && typeof err === 'object' && 'name' in err) {
    const name = (err as { name: string }).name;
    if (name === 'PrismaClientInitializationError') {
      console.error('Prisma init error:', err);
      return NextResponse.json(
        { data: null, error: { code: 'DB_INIT_ERROR', message: 'Database connection failed. Check DATABASE_URL configuration.' } },
        { status: 503 }
      );
    }
  }

  const message = err instanceof Error ? err.message : 'Unexpected error';
  console.error('Unhandled error:', err);
  return NextResponse.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  );
}
