import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { ZodError } from 'zod';
import authController from './controllers/auth.controller';
import adminController from './controllers/admin.controller';
import { authMiddleware } from './middleware/auth.middleware';
import { requireAdmin } from './middleware/requireAdmin';
import { AppError } from './services/auth.service';

const PORT = parseInt(process.env.PORT || '3001');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

// Public auth routes
app.use('/auth', authController);

// Admin routes (protected: auth + admin role)
app.use('/admin', authMiddleware, requireAdmin, adminController);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      data: null,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.errors },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null, error: { code: err.code, message: err.message },
    });
  }
  logger.error(err, 'Unhandled error');
  res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } });
});

app.listen(PORT, () => logger.info(`Auth service on port ${PORT}`));
export default app;
