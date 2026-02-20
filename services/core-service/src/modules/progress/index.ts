import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import { nowISO } from './store';

// ── Logger ──────────────────────────────────────────────
export const logger = pino({ transport: { target: 'pino-pretty' } });

// ── App Setup ───────────────────────────────────────────
const app = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Routes: Health ──────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    data: {
      status: 'ok',
      service: 'progress-service',
      timestamp: nowISO(),
      storage: 'postgresql',
    },
  });
});

// ── Mount Routers ───────────────────────────────────────
import progressRouter from './routes/progress';
import commitmentsRouter from './routes/commitments';
import ppcRouter from './routes/ppc';
import varianceRouter from './routes/variance';
import dailyLogRouter from './routes/daily-log';

app.use(progressRouter);
app.use(commitmentsRouter);
app.use(ppcRouter);
app.use(varianceRouter);
app.use(dailyLogRouter);

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

// ── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`progress-service running on port ${PORT} (PostgreSQL)`);
});

export default app;
