import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { constraints, nowISO } from './store';

// ── Logger ──────────────────────────────────────────────
export const logger = pino({ transport: { target: 'pino-pretty' } });

// ── App Setup ───────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '3004', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Routes: Health ──────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    data: {
      status: 'ok',
      service: 'constraint-service',
      timestamp: nowISO(),
      storage: {
        totalConstraints: constraints.size,
      },
    },
  });
});

// ── Mount Routers ───────────────────────────────────────
import constraintsRouter from './routes/constraints';

app.use('/constraints', constraintsRouter);

// ── Error Handler ───────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  logger.error({ err: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// ── Seed Demo Data & Start Server ───────────────────────
import { seedDemoData } from './seed';
seedDemoData();

app.listen(PORT, () => {
  logger.info(`constraint-service running on port ${PORT}`);
  logger.info('Demo project ID: 00000000-0000-0000-0000-000000000001');
  logger.info('Endpoints:');
  logger.info('  GET    /constraints');
  logger.info('  POST   /constraints');
  logger.info('  GET    /constraints/:id');
  logger.info('  PATCH  /constraints/:id');
  logger.info('  PATCH  /constraints/:id/resolve');
  logger.info('  DELETE /constraints/:id');
  logger.info('  GET    /constraints/stats');
  logger.info('  GET    /constraints/crr');
  logger.info('  GET    /constraints/by-zone/:zoneId');
  logger.info('  GET    /constraints/by-trade/:tradeId');
  logger.info('  GET    /constraints/lookahead');
});

export default app;
