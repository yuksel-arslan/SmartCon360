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

// ── Consolidated Service URLs (27 services → 6 services) ──
const CORE_SERVICE = process.env.CORE_SERVICE_URL || 'http://localhost:3001';
const OPS_SERVICE = process.env.OPS_SERVICE_URL || 'http://localhost:3002';
const PLATFORM_SERVICE = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3003';
const TAKT_SERVICE = process.env.TAKT_SERVICE_URL || 'http://localhost:8001';
const AI_SERVICE = process.env.AI_SERVICE_URL || 'http://localhost:8002';

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

// ══════════════════════════════════════════════════════
// CORE-SERVICE routes (auth, projects, constraints, progress, cost)
// ══════════════════════════════════════════════════════

// Public auth routes (no auth required)
app.use('/api/v1/auth', authLimiter, proxy(CORE_SERVICE, { '^/api/v1/auth': '/auth' }));

// Protected core routes
app.use('/api/v1/admin', defaultLimiter, authMiddleware, proxy(CORE_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/projects', defaultLimiter, authMiddleware, proxy(CORE_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/constraints', defaultLimiter, authMiddleware, proxy(CORE_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/progress', defaultLimiter, authMiddleware, proxy(CORE_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/cost', defaultLimiter, authMiddleware, proxy(CORE_SERVICE, { '^/api/v1': '' }));

// ══════════════════════════════════════════════════════
// TAKT-SERVICE routes (takt, flowline, simulation)
// ══════════════════════════════════════════════════════

app.use('/api/v1/takt', defaultLimiter, authMiddleware, proxy(TAKT_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/flowline', defaultLimiter, authMiddleware, proxy(TAKT_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/simulate', aiLimiter, authMiddleware, proxy(TAKT_SERVICE, { '^/api/v1': '' }));

// ══════════════════════════════════════════════════════
// OPS-SERVICE routes (quality, safety, claims, risk, supply-chain, stakeholder, sustainability, comm)
// ══════════════════════════════════════════════════════

app.use('/api/v1/quality', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/safety', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/claims', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/supply-chain', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/risk', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/comm', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/stakeholder', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/sustainability', defaultLimiter, authMiddleware, proxy(OPS_SERVICE, { '^/api/v1': '' }));

// ══════════════════════════════════════════════════════
// PLATFORM-SERVICE routes (hub, reports, notifications, resources)
// ══════════════════════════════════════════════════════

app.use('/api/v1/hub', defaultLimiter, authMiddleware, proxy(PLATFORM_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/notifications', defaultLimiter, authMiddleware, proxy(PLATFORM_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/resources', defaultLimiter, authMiddleware, proxy(PLATFORM_SERVICE, { '^/api/v1': '' }));

// ══════════════════════════════════════════════════════
// AI-SERVICE routes (ai planner, concierge, reports, vision, bim, analytics, drl)
// ══════════════════════════════════════════════════════

app.use('/api/v1/ai', aiLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/concierge', aiLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/reports', aiLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/vision', aiLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/bim', defaultLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/analytics', defaultLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));
app.use('/api/v1/drl', aiLimiter, authMiddleware, proxy(AI_SERVICE, { '^/api/v1': '' }));

// ── 404 ──
app.use((_req, res) => {
  res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// ── Start ──
app.listen(PORT, () => logger.info(`API Gateway on port ${PORT}`));
export default app;
