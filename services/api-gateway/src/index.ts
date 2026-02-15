import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import pinoHttp from 'pino-http';

const PORT = parseInt(process.env.PORT || '3000');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(pinoHttp({ logger }));

// ── Rate Limiters ──
const defaultLimiter = rateLimit({ windowMs: 60_000, max: 100, message: { data: null, error: { code: 'RATE_LIMIT', message: 'Too many requests' } } });
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { data: null, error: { code: 'RATE_LIMIT', message: 'Too many auth attempts' } } });
const aiLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { data: null, error: { code: 'RATE_LIMIT', message: 'AI rate limit exceeded' } } });

// ── JWT Auth Middleware ──
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ data: null, error: { code: 'UNAUTHORIZED', message: 'Missing authorization' } });
  }
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { sub: string };
    (req as any).userId = decoded.sub;
    req.headers['x-user-id'] = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ data: null, error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' } });
  }
}

// ── Service URLs ──
const SERVICES = {
  auth: process.env.AUTH_URL || 'http://localhost:3001',
  project: process.env.PROJECT_URL || 'http://localhost:3002',
  takt: process.env.TAKT_URL || 'http://localhost:8001',
  aiPlanner: process.env.AI_PLANNER_URL || 'http://localhost:8002',
  flowline: process.env.FLOWLINE_URL || 'http://localhost:3003',
  constraint: process.env.CONSTRAINT_URL || 'http://localhost:3004',
  progress: process.env.PROGRESS_URL || 'http://localhost:3005',
  simulation: process.env.SIMULATION_URL || 'http://localhost:8003',
  resource: process.env.RESOURCE_URL || 'http://localhost:3006',
  notification: process.env.NOTIFICATION_URL || 'http://localhost:3007',
  reporting: process.env.REPORTING_URL || 'http://localhost:8004',
  bim: process.env.BIM_URL || 'http://localhost:8005',
  concierge: process.env.CONCIERGE_URL || 'http://localhost:3008',
  analytics: process.env.ANALYTICS_URL || 'http://localhost:8006',
  // Phase 2 modules
  quality: process.env.QUALITY_URL || 'http://localhost:3009',
  safety: process.env.SAFETY_URL || 'http://localhost:3010',
  cost: process.env.COST_URL || 'http://localhost:3011',
  claims: process.env.CLAIMS_URL || 'http://localhost:3012',
  supplyChain: process.env.SUPPLY_CHAIN_URL || 'http://localhost:3013',
  risk: process.env.RISK_URL || 'http://localhost:3014',
  comm: process.env.COMM_URL || 'http://localhost:3015',
  stakeholder: process.env.STAKEHOLDER_URL || 'http://localhost:3016',
  sustainability: process.env.SUSTAINABILITY_URL || 'http://localhost:3017',
  vision: process.env.VISION_URL || 'http://localhost:8008',
  hub: process.env.HUB_URL || 'http://localhost:3018',
  drl: process.env.DRL_URL || 'http://localhost:8007',
};

function proxy(target: string, pathRewrite?: Record<string, string>) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      error: (err, _req, res) => {
        logger.error(err, `Proxy error to ${target}`);
        (res as express.Response).status(502).json({ data: null, error: { code: 'SERVICE_UNAVAILABLE', message: 'Downstream service unavailable' } });
      },
    },
  });
}

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ── Public Routes (no auth) ──
app.use('/api/v1/auth', authLimiter, proxy(SERVICES.auth, { '^/api/v1/auth': '/auth' }));

// ── Protected Routes ──
app.use('/api/v1/admin', defaultLimiter, authMiddleware, proxy(SERVICES.auth, { '^/api/v1': '' }));
app.use('/api/v1/projects', defaultLimiter, authMiddleware, proxy(SERVICES.project, { '^/api/v1': '' }));
app.use('/api/v1/takt', defaultLimiter, authMiddleware, proxy(SERVICES.takt, { '^/api/v1': '' }));
app.use('/api/v1/flowline', defaultLimiter, authMiddleware, proxy(SERVICES.flowline, { '^/api/v1': '' }));
app.use('/api/v1/constraints', defaultLimiter, authMiddleware, proxy(SERVICES.constraint, { '^/api/v1': '' }));
app.use('/api/v1/progress', defaultLimiter, authMiddleware, proxy(SERVICES.progress, { '^/api/v1': '' }));
app.use('/api/v1/resources', defaultLimiter, authMiddleware, proxy(SERVICES.resource, { '^/api/v1': '' }));
app.use('/api/v1/notifications', defaultLimiter, authMiddleware, proxy(SERVICES.notification, { '^/api/v1': '' }));

// AI endpoints with stricter rate limiting
app.use('/api/v1/ai', aiLimiter, authMiddleware, proxy(SERVICES.aiPlanner, { '^/api/v1': '' }));
app.use('/api/v1/simulate', aiLimiter, authMiddleware, proxy(SERVICES.simulation, { '^/api/v1': '' }));
app.use('/api/v1/concierge', aiLimiter, authMiddleware, proxy(SERVICES.concierge, { '^/api/v1': '' }));
app.use('/api/v1/reports', aiLimiter, authMiddleware, proxy(SERVICES.reporting, { '^/api/v1': '' }));
app.use('/api/v1/bim', defaultLimiter, authMiddleware, proxy(SERVICES.bim, { '^/api/v1': '' }));
app.use('/api/v1/analytics', defaultLimiter, authMiddleware, proxy(SERVICES.analytics, { '^/api/v1': '' }));

// ── Phase 2 Module Routes ──
app.use('/api/v1/cost', defaultLimiter, authMiddleware, proxy(SERVICES.cost, { '^/api/v1': '' }));
app.use('/api/v1/quality', defaultLimiter, authMiddleware, proxy(SERVICES.quality, { '^/api/v1': '' }));
app.use('/api/v1/safety', defaultLimiter, authMiddleware, proxy(SERVICES.safety, { '^/api/v1': '' }));
app.use('/api/v1/claims', defaultLimiter, authMiddleware, proxy(SERVICES.claims, { '^/api/v1': '' }));
app.use('/api/v1/supply-chain', defaultLimiter, authMiddleware, proxy(SERVICES.supplyChain, { '^/api/v1': '' }));
app.use('/api/v1/risk', defaultLimiter, authMiddleware, proxy(SERVICES.risk, { '^/api/v1': '' }));
app.use('/api/v1/comm', defaultLimiter, authMiddleware, proxy(SERVICES.comm, { '^/api/v1': '' }));
app.use('/api/v1/stakeholder', defaultLimiter, authMiddleware, proxy(SERVICES.stakeholder, { '^/api/v1': '' }));
app.use('/api/v1/sustainability', defaultLimiter, authMiddleware, proxy(SERVICES.sustainability, { '^/api/v1': '' }));
app.use('/api/v1/hub', defaultLimiter, authMiddleware, proxy(SERVICES.hub, { '^/api/v1': '' }));

// AI-powered module routes (stricter rate limiting)
app.use('/api/v1/vision', aiLimiter, authMiddleware, proxy(SERVICES.vision, { '^/api/v1': '' }));
app.use('/api/v1/drl', aiLimiter, authMiddleware, proxy(SERVICES.drl, { '^/api/v1': '' }));

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// ── Start ──
app.listen(PORT, () => logger.info(`API Gateway on port ${PORT}`));
export default app;
