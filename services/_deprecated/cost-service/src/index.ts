// CostPilot Service — Metraj, Birim Fiyat, Kesif, Bütçe, Hakediş, EVM
// Port: 3011

import express from 'express';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authenticate } from './middleware/auth';

// Routes
import workItemsRouter from './routes/work-items';
import unitPricesRouter from './routes/unit-prices';
import resourcesRouter from './routes/resources';
import quantityTakeoffsRouter from './routes/quantity-takeoffs';
import estimatesRouter from './routes/estimates';
import budgetsRouter from './routes/budgets';
import paymentsRouter from './routes/payments';
import costRecordsRouter from './routes/cost-records';
import evmRouter from './routes/evm';
import catalogRouter from './routes/catalog';
import classificationMappingRouter from './routes/classification-mapping';

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for direct access during development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cost-service',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

// API routes (with authentication)
// Gateway strips /api/v1 prefix, so paths arrive as /cost/...
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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({
    message: 'CostPilot service started',
    port: PORT,
    env: process.env.NODE_ENV || 'development',
  });
  console.log(`✓ cost-service running on port ${PORT}`);
});
