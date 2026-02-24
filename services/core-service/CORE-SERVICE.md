# Core Service

## Overview

Consolidated Node.js service handling authentication, project management, constraint management, and progress tracking. Merges the former `auth-service`, `project-service`, `constraint-service`, and `progress-service`.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript 5.x (strict mode)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod
- **Auth:** JWT (jsonwebtoken), bcrypt, Google OAuth2
- **Logging:** Pino (structured JSON)

## Port & Endpoints

**Port:** 3001

### Auth Module (`/api/v1/auth`)
- `POST /register` — User registration
- `POST /login` — JWT login
- `POST /google` — Google OAuth login
- `GET /me` — Current user profile
- `POST /demo` — Demo account login

### Admin Module (`/api/v1/admin`)
- `GET /users` — List all users (admin only)
- `PATCH /users/:id/tier` — Update user licensing tier

### Project Module (`/api/v1/projects`)
- `GET /` — List user projects
- `POST /` — Create project
- `GET /:id` — Get project details
- `PUT /:id` — Update project
- `DELETE /:id` — Delete project
- `GET /:id/lbs` — Location Breakdown Structure
- `POST /:id/lbs` — Create LBS nodes
- `GET /:id/wbs` — Work Breakdown Structure
- `POST /:id/wbs/generate` — AI-generate WBS
- `GET /:id/cbs` — Cost Breakdown Structure
- `GET /:id/boq` — Bill of Quantities
- `POST /:id/boq/upload` — Upload BOQ file
- `GET /:id/obs` — Organizational Breakdown Structure
- `GET /:id/drawings` — Project drawings
- `POST /:id/setup/*` — Project setup wizard endpoints

### Constraint Module (`/api/v1/constraints`)
- `GET /project/:projectId` — List constraints for project
- `POST /` — Create constraint
- `PUT /:id` — Update constraint
- `DELETE /:id` — Delete constraint

### Progress Module (`/api/v1/progress`)
- `GET /project/:projectId` — Progress records
- `POST /` — Record progress
- `GET /commitments/*` — LPS commitments
- `GET /ppc/*` — Percent Plan Complete metrics
- `GET /variance/*` — Variance analysis
- `GET /daily-log/*` — Daily logs

## Modules

| Module | Directory | Description |
|--------|-----------|-------------|
| auth | `src/modules/auth/` | JWT/OAuth2, RBAC, user management |
| project | `src/modules/project/` | Project CRUD, LBS, WBS, CBS, BOQ, OBS, drawings, classification |
| constraint | `src/modules/constraint/` | Constraint CRUD, 8-category detection, seed data |
| progress | `src/modules/progress/` | Progress tracking, LPS, PPC, variance, daily logs |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | JWT signing secret | — |
| `REDIS_URL` | Redis connection string | — |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3100` |

## Database

Uses Prisma ORM with shared schema (`prisma/schema.prisma`). Key models: User, UserSession, Project, Location, WbsNode, CbsNode, ObsNode, BoqItem, Constraint, ProgressRecord, Commitment, DailyLog.

## Development

```bash
# Start
cd services/core-service && npm run dev

# Build
npm run build

# Generate Prisma client
npx prisma generate
```

## Docker

`Dockerfile` — Multi-stage Node.js build with Prisma client generation.

## Dependencies

- PostgreSQL (direct)
- Redis (sessions, cache)
- No inter-service dependencies (this is the foundational service)
