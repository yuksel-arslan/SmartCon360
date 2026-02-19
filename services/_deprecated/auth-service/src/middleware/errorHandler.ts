import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 'NO_TOKEN', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    req.userId = decoded.sub;
    req.userEmail = decoded.email;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 'INVALID_TOKEN', 401));
  }
}

// ── AppError ──
export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, code: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ── Error Handler ──
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: (err as any).issues },
    });
  }

  // Prisma errors
  if ((err as any).code === 'P2002') {
    return res.status(409).json({
      data: null,
      error: { code: 'DUPLICATE', message: 'Resource already exists' },
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    data: null,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
