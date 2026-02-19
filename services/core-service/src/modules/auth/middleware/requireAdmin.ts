import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware: requires the authenticated user to have 'admin' role.
 * Must be used AFTER authMiddleware (which sets req.userId).
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: { name: 'admin' },
      projectId: null, // global admin only
    },
    include: { role: true },
  });

  if (!adminRole) {
    return res.status(403).json({
      data: null,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }

  next();
}
