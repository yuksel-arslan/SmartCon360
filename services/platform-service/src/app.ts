import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

import notificationRoutes from './modules/notification/routes';
import resourceRoutes from './modules/resource/routes';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const app = express();
const PORT = process.env.PORT || 3003;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'platform-service' });
});

// ---------------------------------------------------------------------------
// Hub module (stub — hub-service source copied for reference only)
// ---------------------------------------------------------------------------
app.get('/hub/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'hub' });
});

// ---------------------------------------------------------------------------
// Reporting module (stub — Python reporting-service lives in ai-service)
// ---------------------------------------------------------------------------
app.get('/reports/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'reporting' });
});

// ---------------------------------------------------------------------------
// Notification module (stub)
// ---------------------------------------------------------------------------
app.use('/notifications', notificationRoutes);

// ---------------------------------------------------------------------------
// Resource module (stub)
// ---------------------------------------------------------------------------
app.use('/resources', resourceRoutes);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  logger.info(`platform-service running on port ${PORT}`);
});

export default app;
