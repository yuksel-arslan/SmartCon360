# Platform Service

## Overview

Consolidated Node.js service for cross-module orchestration, notifications, and resource management. Houses the SmartCon360 Hub (Project Health Score), notification engine, and CrewFlow resource management.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript 5.x (strict mode)
- **Logging:** Pino (structured JSON)

## Port & Endpoints

**Port:** 3003

### Hub Module (`/api/v1/hub`)
- `GET /health-score/:projectId` — Project Health Score
- `GET /dashboard/:projectId` — Cross-module dashboard data
- Module licensing enforcement

### Notification Module (`/api/v1/notifications`)
- Real-time alert management
- Escalation engine
- Socket.io integration (planned)

### Resource Module (`/api/v1/resources`) — CrewFlow
- Crew management
- Equipment tracking
- Material allocation

## Modules

| Module | Directory | Brand Name |
|--------|-----------|------------|
| hub | `src/modules/hub/` | SmartCon360 Hub |
| notification | `src/modules/notification/` | CommHub (notifications) |
| resource | `src/modules/resource/` | CrewFlow |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3003` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `CORE_SERVICE_URL` | Core service for auth | `http://localhost:3001` |
| `OPS_SERVICE_URL` | Ops service for cross-module data | `http://localhost:3002` |

## Database

Uses Prisma ORM with shared schema for hub, notification, and resource models.

## Development

```bash
cd services/platform-service && npm run dev
```

## Docker

`Dockerfile` — Multi-stage Node.js build.

## Dependencies

- PostgreSQL (direct via Prisma)
- core-service (auth verification, project data)
- ops-service (cross-module data aggregation for Health Score)
