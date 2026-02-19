import { Router, Request, Response, NextFunction } from 'express';
import { AuthService, AppError } from '../services/auth.service';
import { registerSchema, loginSchema, refreshSchema, updateProfileSchema } from '../validators/auth.validator';

const router = Router();
const authService = new AuthService();

// Helper: wrap async routes
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

// POST /auth/register
router.post('/register', asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input);
  res.status(201).json({ data: result, error: null });
}));

// POST /auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json({ data: result, error: null });
}));

// POST /auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await authService.refresh(refreshToken);
  res.json({ data: tokens, error: null });
}));

// POST /auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await authService.logout(refreshToken);
  res.status(204).send();
}));

// GET /auth/me (requires auth middleware to set req.userId)
router.get('/me', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  const profile = await authService.getProfile(userId);
  res.json({ data: profile, error: null });
}));

// PATCH /auth/me
router.patch('/me', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(userId, input);
  res.json({ data: user, error: null });
}));

export default router;
