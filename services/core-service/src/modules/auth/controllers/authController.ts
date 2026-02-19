import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/authenticate';

const authService = new AuthService();
export const authRouter = Router();

// ── Validation Schemas ──
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

// ── POST /auth/register ──
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body);
    res.status(201).json({ data: result, error: null });
  } catch (error) {
    next(error);
  }
});

// ── POST /auth/login ──
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };
    const result = await authService.login(body.email, body.password, deviceInfo);
    res.json({ data: result, error: null });
  } catch (error) {
    next(error);
  }
});

// ── POST /auth/refresh ──
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refreshTokens(body.refreshToken);
    res.json({ data: result, error: null });
  } catch (error) {
    next(error);
  }
});

// ── POST /auth/logout ──
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refreshSchema.parse(req.body);
    await authService.logout(body.refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── GET /auth/me ──
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getProfile(req.userId!);
    res.json({ data: user, error: null });
  } catch (error) {
    next(error);
  }
});

// ── PATCH /auth/me ──
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(255).optional(),
  jobTitle: z.string().max(100).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
});

authRouter.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await authService.updateProfile(req.userId!, body);
    res.json({ data: user, error: null });
  } catch (error) {
    next(error);
  }
});
