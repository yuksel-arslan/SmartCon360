# CONSTRAINT-SERVICE.md

## Overview
Manages the lifecycle of constraints (blockers/prerequisites) that affect takt plan execution. Supports 8 constraint categories, auto-detection via AI, constraint-to-activity linking, and Constraint Removal Rate (CRR) calculation.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3004
## Schema: `constraint`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /constraints | List constraints (filterable) |
| POST | /constraints | Create constraint |
| GET | /constraints/:id | Get constraint detail |
| PATCH | /constraints/:id | Update constraint |
| PATCH | /constraints/:id/resolve | Mark as resolved |
| DELETE | /constraints/:id | Delete constraint |
| GET | /constraints/stats | Constraint statistics |
| GET | /constraints/crr | Constraint Removal Rate |
| POST | /constraints/auto-detect | AI auto-detect constraints from plan |
| GET | /constraints/by-zone/:zoneId | Constraints for a zone |
| GET | /constraints/by-trade/:tradeId | Constraints for a trade |
| GET | /constraints/lookahead | Constraints in lookahead window |
| GET | /constraints/:id/logs | Audit log for a constraint |

## Constraint Categories
1. `design` — Drawing/spec issues, RFIs
2. `material` — Procurement, delivery
3. `equipment` — Availability, mobilization
4. `labor` — Crew availability, skills
5. `space` — Access, staging, stacking
6. `predecessor` — Prior work incomplete
7. `permit` — Regulatory approvals
8. `information` — Missing data/decisions

## Environment Variables
```env
PORT=3004
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
AI_PLANNER_URL=http://localhost:8002
```

## Setup & Run
```bash
cd services/constraint-service
npm install && npx prisma migrate dev && npm run dev
```
