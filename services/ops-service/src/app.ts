// OPS-SERVICE — Consolidated operations service for SmartCon360
// Combines 9 modules: quality, safety, cost, claims, risk, supply-chain, stakeholder, sustainability, comm
// Port: 3002

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';

// Cost module routes (real implementation)
import workItemsRouter from './modules/cost/routes/work-items';
import unitPricesRouter from './modules/cost/routes/unit-prices';
import resourcesRouter from './modules/cost/routes/resources';
import quantityTakeoffsRouter from './modules/cost/routes/quantity-takeoffs';
import estimatesRouter from './modules/cost/routes/estimates';
import budgetsRouter from './modules/cost/routes/budgets';
import paymentsRouter from './modules/cost/routes/payments';
import costRecordsRouter from './modules/cost/routes/cost-records';
import evmRouter from './modules/cost/routes/evm';
import catalogRouter from './modules/cost/routes/catalog';
import classificationMappingRouter from './modules/cost/routes/classification-mapping';

// Quality & Safety module routes
import qualityRouter from './modules/quality/routes';
import safetyRouter from './modules/safety/routes';

// Cost module middleware
import { authenticate } from './modules/cost/middleware/auth';
import { errorHandler } from './modules/cost/middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 3002;

// Logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: 'ops-service',
  },
});

// HTTP request logging
app.use(pinoHttp({ logger }));

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ──────────────────────────────────────────────
// Health check (no auth required)
// ──────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ops-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    modules: [
      'quality',
      'safety',
      'cost',
      'claims',
      'risk',
      'supply-chain',
      'stakeholder',
      'sustainability',
      'comm',
    ],
  });
});

// ──────────────────────────────────────────────
// COST MODULE — Full routes (CostPilot)
// ──────────────────────────────────────────────
app.use('/cost/work-items', authenticate, workItemsRouter);
app.use('/cost/unit-prices', authenticate, unitPricesRouter);
app.use('/cost/resources', authenticate, resourcesRouter);
app.use('/cost/quantity-takeoffs', authenticate, quantityTakeoffsRouter);
app.use('/cost/estimates', authenticate, estimatesRouter);
app.use('/cost/budgets', authenticate, budgetsRouter);
app.use('/cost/payments', authenticate, paymentsRouter);
app.use('/cost/cost-records', authenticate, costRecordsRouter);
app.use('/cost/evm', authenticate, evmRouter);
app.use('/cost/catalog', authenticate, catalogRouter);
app.use('/cost/mappings', authenticate, classificationMappingRouter);

// ──────────────────────────────────────────────
// STUB MODULE HEALTH ENDPOINTS
// These modules are placeholders awaiting full implementation.
// Each provides a health check endpoint.
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// QUALITY MODULE — Full routes (QualityGate)
// ──────────────────────────────────────────────
app.use('/quality', authenticate, qualityRouter);

// ──────────────────────────────────────────────
// SAFETY MODULE — Full routes (SafeZone)
// ──────────────────────────────────────────────
app.use('/safety', authenticate, safetyRouter);

app.get('/claims/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'claims' });
});

app.get('/risk/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'risk' });
});

app.get('/supply-chain/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'supply-chain' });
});

app.get('/stakeholder/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'stakeholder' });
});

app.get('/sustainability/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'sustainability' });
});

app.get('/comm/health', (_req: Request, res: Response) => {
  res.json({ status: 'stub', module: 'comm' });
});

// ──────────────────────────────────────────────
// 404 handler
// ──────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
});

// ──────────────────────────────────────────────
// Global error handler (must be last)
// ──────────────────────────────────────────────
app.use(errorHandler);

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({
    message: 'OPS service started',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    modules: ['quality', 'safety', 'cost', 'claims', 'risk', 'supply-chain', 'stakeholder', 'sustainability', 'comm'],
  });
  console.log(`ops-service running on port ${PORT}`);
});

export default app;
