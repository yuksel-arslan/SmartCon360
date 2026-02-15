// Authentication middleware (placeholder)
// TODO: Implement JWT verification when auth-service is integrated

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Verify JWT token
 * TODO: Integrate with auth-service for real JWT verification
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // TODO: Verify token with JWT
    // For now, mock user
    req.user = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'admin',
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication (allows anonymous access)
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // TODO: Verify token
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'admin',
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}
