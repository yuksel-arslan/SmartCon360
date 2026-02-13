import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import {
  progressUpdates,
  weeklyCommitments,
  ppcRecords,
  dailyLogs,
  nowISO,
} from './store';

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
      storage: {
        progressUpdates: Array.from(progressUpdates.values()).reduce((sum, arr) => sum + arr.length, 0),
        weeklyCommitments: Array.from(weeklyCommitments.values()).reduce((sum, arr) => sum + arr.length, 0),
        ppcRecords: Array.from(ppcRecords.values()).reduce((sum, arr) => sum + arr.length, 0),
        dailyLogs: Array.from(dailyLogs.values()).reduce((sum, arr) => sum + arr.length, 0),
      },
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

// ── Seed Demo Data & Start Server ───────────────────────
import { seedDemoData } from './seed';
seedDemoData();

app.listen(PORT, () => {
  logger.info(`progress-service running on port ${PORT}`);
  logger.info('Demo project ID: 00000000-0000-0000-0000-000000000001');
  logger.info('Endpoints:');
  logger.info('  POST   /progress/update');
  logger.info('  GET    /progress/assignment/:assignmentId');
  logger.info('  GET    /progress/zone/:zoneId');
  logger.info('  GET    /progress/trade/:tradeId');
  logger.info('  GET    /progress/project/:projectId');
  logger.info('  POST   /progress/commitments');
  logger.info('  POST   /progress/commitments/bulk');
  logger.info('  GET    /progress/commitments?projectId=&weekStart=');
  logger.info('  PATCH  /progress/commitments/:id');
  logger.info('  POST   /progress/ppc/calculate');
  logger.info('  GET    /progress/ppc/history?projectId=');
  logger.info('  GET    /progress/ppc/current?projectId=');
  logger.info('  GET    /progress/ppc/by-trade?projectId=&weekStart=');
  logger.info('  GET    /progress/variance/history?projectId=');
  logger.info('  GET    /progress/variance/reasons?projectId=');
  logger.info('  POST   /progress/daily-log');
  logger.info('  GET    /progress/daily-log/:projectId/:date');
});

export default app;
