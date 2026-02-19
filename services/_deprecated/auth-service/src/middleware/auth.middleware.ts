import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    (req as any).userId = decoded.sub;
    (req as any).userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({
      data: null,
      error: { code: 'TOKEN_EXPIRED', message: 'Access token is invalid or expired' },
    });
  }
}
