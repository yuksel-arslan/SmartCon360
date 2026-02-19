# CLAIMS-SERVICE — ClaimShield

## Overview
Manages claims, change orders, and delay analysis for construction projects within SmartCon360. Handles the full lifecycle of change orders (initiate, review, approve, track), maintains a claims register with evidence, performs delay analysis, and tracks entitlements and dispute resolution.

**Module:** ClaimShield
**Port:** 3012
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3012
## Schema: `claims`

## Responsibilities
- Change order management: initiate, review, approve, track
- Claims register with evidence linking and document management
- Delay analysis: time impact analysis, concurrent delay identification
- Entitlement tracking for extension of time (EOT) and cost compensation
- Document linking for correspondence, RFIs, and meeting minutes
- Dispute tracking through escalation stages (negotiation/mediation/arbitration)
- Financial impact tracking with change order value and budget adjustment

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/claims/change-orders | List change orders |
| POST | /api/v1/claims/change-orders | Create change order |
| PUT | /api/v1/claims/change-orders/:id | Update change order |
| POST | /api/v1/claims/change-orders/:id/approve | Approve change order |
| GET | /api/v1/claims/register | Claims register |
| POST | /api/v1/claims/register | Submit claim |
| PUT | /api/v1/claims/register/:id | Update claim |
| GET | /api/v1/claims/delay-analysis | Delay events and analysis |
| POST | /api/v1/claims/delay-events | Record delay event |
| GET | /api/v1/claims/stats | CO count, claim values |

## Database Schema

**Schema name:** `claims`

| Table | Key Columns |
|-------|-------------|
| change_orders | UUID, project_id, co_number, title, description, type (owner_directed/contractor_claim/design_change/unforeseen_condition), status (draft/submitted/under_review/approved/rejected/disputed), cost_impact, time_impact_days, submitted_by, submitted_date, decided_by, decided_date, attachments[], related_rfi_ids[] |
| claims | UUID, project_id, claim_number, title, description, claimant, respondent, category (delay/disruption/acceleration/scope_change/unforeseen), status (notified/substantiated/negotiating/resolved/escalated), amount_claimed, amount_awarded, time_claimed_days, time_awarded_days, evidence_urls[], resolution_method (negotiation/mediation/arbitration/litigation) |
| delay_events | UUID, project_id, claim_id, event_date, description, delay_type (excusable/non_excusable/compensable/concurrent), days_impact, affected_activities[], responsible_party, supporting_docs[] |

## Key Metrics
- Pending change orders (count and value)
- Approved CO value vs original contract
- Claim success rate
- Average CO processing time (days)
- EOT days awarded

## Environment Variables
```env
PORT=3012
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
COST_SERVICE_URL=http://localhost:3011
TAKT_ENGINE_URL=http://localhost:8001
```

## Cross-Module Integration
- **CostPilot:** Approved change orders trigger budget adjustments
- **TaktFlow:** Extension of time triggers schedule update
- **CommHub:** CO/Claim status changes trigger notifications
- **RiskRadar:** Claim patterns feed into risk identification
- **StakeHub:** Claim escalation triggers stakeholder notification

## Development
```bash
cd services/claims-service && npm install && npm run dev
```
