import { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/app-error'

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string }
}

/**
 * JWT authentication middleware.
 * In production, validates JWT token from Authorization header.
 * Currently accepts userId from header or query for development.
 */
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization

    // Development mode: accept X-User-Id header
    const userId =
      req.headers['x-user-id'] as string | undefined

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // TODO: JWT verification — in production, decode and verify token
      // For now, extract userId from token payload if available
      const token = authHeader.slice(7)
      try {
        // Simple base64 decode of JWT payload (middle part)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1] || '', 'base64').toString()
        )
        req.user = {
          id: payload.sub || payload.userId || payload.id,
          email: payload.email || '',
          role: payload.role || 'user',
        }
      } catch {
        // If token decode fails, fall through to userId check
      }
    }

    if (!req.user && userId) {
      req.user = { id: userId, email: '', role: 'user' }
    }

    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
    }

    next()
  } catch (err) {
    next(err)
  }
}
