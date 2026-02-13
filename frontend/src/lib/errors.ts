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

  // Prisma unique constraint violation
  if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
    return NextResponse.json(
      { data: null, error: { code: 'DUPLICATE', message: 'Resource already exists' } },
      { status: 409 }
    );
  }

  console.error('Unhandled error:', err);
  return NextResponse.json(
    { data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } },
    { status: 500 }
  );
}
