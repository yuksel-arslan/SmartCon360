# SAFETY-SERVICE — SafeZone

## Overview
Manages occupational health and safety (OHS/HSE) for construction projects within SmartCon360. Covers risk matrices, incident reporting, Permit to Work (PTW), Job Safety Analysis (JSA), toolbox talks, safety observations, PPE compliance, and safety performance metrics (LTIR/TRIR).

**Module:** SafeZone
**Port:** 3010
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3010
## Schema: `safety`

## Responsibilities
- Risk matrix management (5x5 probability x impact) for each zone/trade
- Incident reporting: near miss, first aid, medical treatment, lost time, fatality
- Permit to Work (PTW) authorization workflow for hazardous tasks
- Job Safety Analysis (JSA) for systematic risk assessment per activity
- Toolbox talk records with attendance tracking
- Safety observation cards for proactive hazard identification
- PPE compliance tracking per zone and trade
- LTIR/TRIR calculation and safety performance metrics

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/safety/risks | Risk matrix |
| POST | /api/v1/safety/risks | Add risk assessment |
| GET | /api/v1/safety/incidents | List incidents |
| POST | /api/v1/safety/incidents | Report incident |
| PUT | /api/v1/safety/incidents/:id | Update incident |
| GET | /api/v1/safety/permits | List PTW |
| POST | /api/v1/safety/permits | Request PTW |
| PUT | /api/v1/safety/permits/:id/approve | Approve PTW |
| GET | /api/v1/safety/toolbox-talks | List toolbox talks |
| POST | /api/v1/safety/toolbox-talks | Record toolbox talk |
| GET | /api/v1/safety/observations | List observations |
| POST | /api/v1/safety/observations | Submit observation |
| GET | /api/v1/safety/stats | LTIR, TRIR, incident trends |

## Database Schema

**Schema name:** `safety`

| Table | Key Columns |
|-------|-------------|
| safety_risks | UUID, project_id, location_id, trade_id, hazard, probability (1-5), impact (1-5), risk_score, control_measures[], residual_risk, status, reviewed_by |
| incidents | UUID, project_id, location_id, type (near_miss/first_aid/medical/lost_time/fatality), date, time, description, injured_person, witness[], root_cause, corrective_action, days_lost, cost, photo_urls[], status (reported/investigating/closed), reported_by, investigated_by |
| permits_to_work | UUID, project_id, location_id, work_type, hazards[], precautions[], status (requested/approved/active/closed/revoked), requested_by, approved_by, valid_from, valid_until |
| toolbox_talks | UUID, project_id, date, topic, attendees[], conducted_by, location_id, notes, sign_off_url |
| safety_observations | UUID, project_id, location_id, observation_type (safe/unsafe), description, corrective_action, photo_urls[], observed_by |

## Key Metrics
- LTIR (Lost Time Injury Rate)
- TRIR (Total Recordable Incident Rate)
- Near miss reporting rate
- PTW compliance %
- Toolbox talk attendance %
- Risk score by zone (heat map)

## Environment Variables
```env
PORT=3010
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
```

## Cross-Module Integration
- **TaktFlow:** High-risk zone triggers constraint flagged automatically
- **CrewFlow:** Incident triggers crew reassignment
- **CommHub:** Critical incident triggers immediate escalation notification
- **RiskRadar:** Safety risks feed into project risk register
- **GreenSite:** Environmental safety incidents linked
- **Hub:** Safety health (LTIR, incidents) feeds Project Health Score

## Development
```bash
cd services/safety-service && npm install && npm run dev
```
