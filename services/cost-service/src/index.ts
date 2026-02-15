// CostPilot Service — Metraj, Birim Fiyat, Kesif, Bütçe, Hakediş, EVM
// Port: 3011

import express from 'express';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authenticate } from './middleware/auth';

// Routes
import workItemsRouter from './routes/work-items';
import estimatesRouter from './routes/estimates';
import paymentsRouter from './routes/payments';
import evmRouter from './routes/evm';

const app = express();
const PORT = process.env.PORT || 3011;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/v1/cost/work-items', authenticate, workItemsRouter);
app.use('/api/v1/cost/estimates', authenticate, estimatesRouter);
app.use('/api/v1/cost/payments', authenticate, paymentsRouter);
app.use('/api/v1/cost/evm', authenticate, evmRouter);

// TODO: Add remaining routes:
// app.use('/api/v1/cost/unit-prices', authenticate, unitPricesRouter);
// app.use('/api/v1/cost/quantity-takeoffs', authenticate, quantityTakeoffsRouter);
// app.use('/api/v1/cost/budgets', authenticate, budgetsRouter);
// app.use('/api/v1/cost/cost-records', authenticate, costRecordsRouter);

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
