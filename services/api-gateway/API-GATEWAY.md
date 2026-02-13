# API-GATEWAY.md

## Overview
Central entry point for all client requests. Handles routing, authentication verification, rate limiting, CORS, and request logging. Proxies requests to downstream microservices.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **HTTP Proxy:** http-proxy-middleware
- **Rate Limiting:** express-rate-limit + Redis store
- **Logging:** pino
- **Auth:** JWT verification (tokens issued by auth-service)

## Port: 3000

## Routes

| Method | Path | Target Service | Auth |
|--------|------|---------------|------|
| POST | /api/v1/auth/* | auth-service:3001 | No |
| GET/POST/PATCH/DELETE | /api/v1/projects/* | project-service:3002 | Yes |
| GET/POST | /api/v1/takt/* | takt-engine:8001 | Yes |
| POST | /api/v1/ai/plan/* | ai-planner:8002 | Yes |
| GET | /api/v1/flowline/* | flowline-service:3003 | Yes |
| GET/POST/PATCH | /api/v1/constraints/* | constraint-service:3004 | Yes |
| GET/POST | /api/v1/progress/* | progress-service:3005 | Yes |
| POST | /api/v1/simulate/* | simulation-service:8003 | Yes |
| GET/POST/PATCH | /api/v1/resources/* | resource-service:3006 | Yes |
| GET | /api/v1/notifications/* | notification-service:3007 | Yes |
| POST | /api/v1/reports/* | reporting-service:8004 | Yes |
| POST | /api/v1/bim/* | bim-service:8005 | Yes |
| POST | /api/v1/concierge/* | ai-concierge:3008 | Yes |
| GET | /api/v1/analytics/* | analytics-service:8006 | Yes |

## Middleware Stack
1. CORS (configurable origins)
2. Request ID generation (uuid)
3. Request logging (pino)
4. Rate limiting (100 req/min default, 10 req/min for AI endpoints)
5. JWT verification (skip for /auth/* routes)
6. Request size limit (10MB default, 50MB for BIM uploads)
7. Proxy to target service
8. Error handler

## Environment Variables
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=<shared-secret>
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3001,https://taktflow.ai
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## Dependencies
- express, http-proxy-middleware, express-rate-limit, rate-limit-redis
- jsonwebtoken, cors, helmet, compression
- pino, pino-http, uuid

## Setup & Run
```bash
cd services/api-gateway
npm install
npm run dev     # Development with nodemon
npm run build   # TypeScript compilation
npm start       # Production
```

## Testing
```bash
npm test        # Jest unit tests
npm run test:e2e # Integration tests
```
