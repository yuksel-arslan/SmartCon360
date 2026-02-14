# RISK-SERVICE — RiskRadar

## Overview
Manages project risk identification, assessment, response planning, and monitoring for construction projects within SmartCon360. Provides a risk register, heat map visualization data, mitigation action tracking, risk trending, and integration with Monte Carlo simulation for risk-based schedule/cost analysis.

**Module:** RiskRadar
**Port:** 3014
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1 (Layer 2 for AI risk prediction via Gemini)
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3014
## Schema: `risk`

## Responsibilities
- Risk register: identification, assessment, response strategy planning
- Heat map visualization data (probability x impact matrix)
- Risk categorization: schedule, cost, quality, safety, scope, external, contractual, environmental
- Mitigation action tracking with owners, deadlines, and effectiveness evaluation
- Risk trending: how risks evolve over time with review history
- Monte Carlo integration for risk-based schedule/cost simulation
- AI risk prediction via pattern recognition from project data (Layer 2)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/risk/register | Risk register |
| POST | /api/v1/risk/register | Add risk |
| PUT | /api/v1/risk/register/:id | Update risk |
| GET | /api/v1/risk/heat-map | Heat map data |
| GET | /api/v1/risk/trending | Risk trend over time |
| POST | /api/v1/risk/actions | Create mitigation action |
| PUT | /api/v1/risk/actions/:id | Update action status |
| GET | /api/v1/risk/stats | Risk summary by category |

## Database Schema

**Schema name:** `risk`

| Table | Key Columns |
|-------|-------------|
| risks | UUID, project_id, risk_id_code, title, description, category (schedule/cost/quality/safety/scope/external/contractual/environmental), probability (1-5), impact (1-5), risk_score, risk_level (low/medium/high/critical), response_strategy (avoid/mitigate/transfer/accept), mitigation_plan, contingency_plan, risk_owner, trigger_conditions, status (identified/assessed/mitigating/occurred/closed), identified_by, identified_date, last_review_date, related_zone_ids[], related_trade_ids[] |
| risk_actions | UUID, risk_id, action, assigned_to, due_date, status (pending/in_progress/completed/overdue), completion_date, effectiveness (effective/partial/ineffective) |
| risk_reviews | UUID, risk_id, review_date, reviewed_by, previous_score, new_score, notes, probability, impact |

## Key Metrics
- Total risks by level (critical/high/medium/low)
- Overdue mitigation actions
- Risk score trend
- Top 10 risks dashboard
- Risk response effectiveness %

## Environment Variables
```env
PORT=3014
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
SIMULATION_SERVICE_URL=http://localhost:8003
```

## Cross-Module Integration
- **TaktFlow:** Schedule risk feeds into constraint flagging
- **CostPilot:** Cost risk feeds into contingency budgeting
- **SafeZone:** Safety risks feed into safety risk matrix
- **ClaimShield:** Contractual risk feeds into claim preparation
- **Hub:** Risk health (critical risks, overdue actions) feeds Project Health Score

## Development
```bash
cd services/risk-service && npm install && npm run dev
```
