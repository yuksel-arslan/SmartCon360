# QUALITY-SERVICE — QualityGate

## Overview
Manages quality control workflows for construction projects within SmartCon360. Handles inspection checklists, Non-Conformance Reports (NCRs), Inspection & Test Plans (ITPs), punch list management, and quality metrics including First Time Right (FTR) and Cost of Poor Quality (COPQ).

**Module:** QualityGate
**Port:** 3009
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1 (Layer 2 for AI photo-based defect detection via Gemini)
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3009
## Schema: `quality`

## Responsibilities
- Inspection checklist management (template-based, trade-specific)
- NCR (Non-Conformance Report) lifecycle: create, assign, track, close
- ITP (Inspection & Test Plan) definition with quality checkpoints per trade
- Photo documentation attached to inspections and NCRs
- FTR (First Time Right) tracking as a quality acceptance metric
- COPQ (Cost of Poor Quality) aggregation from rework costs
- Punch list management for deficiency tracking before handover
- AI quality scoring via Gemini photo analysis for defect detection (Layer 2)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/quality/inspections | List inspections (filterable) |
| POST | /api/v1/quality/inspections | Create inspection |
| GET | /api/v1/quality/inspections/:id | Get inspection detail |
| PUT | /api/v1/quality/inspections/:id | Update inspection |
| POST | /api/v1/quality/inspections/:id/complete | Complete inspection |
| GET | /api/v1/quality/ncr | List NCRs |
| POST | /api/v1/quality/ncr | Create NCR |
| PUT | /api/v1/quality/ncr/:id | Update NCR |
| POST | /api/v1/quality/ncr/:id/close | Close NCR |
| GET | /api/v1/quality/punch-list | List punch items |
| POST | /api/v1/quality/punch-list | Create punch item |
| GET | /api/v1/quality/stats | FTR, COPQ, open NCRs |
| GET | /api/v1/quality/templates | Checklist templates |

## Database Schema

**Schema name:** `quality`

| Table | Key Columns |
|-------|-------------|
| inspections | UUID, project_id, location_id, trade_id, checklist_template_id, inspector_id, status (scheduled/in_progress/passed/failed/na), scheduled_date, completed_date, score, notes, photo_urls[] |
| checklist_templates | UUID, name, trade_id, items (JSONB), version |
| ncr_reports | UUID, project_id, inspection_id, location_id, trade_id, title, description, severity (minor/major/critical), status (open/in_review/corrective_action/closed/void), root_cause, corrective_action, cost_impact, responsible_party, due_date, closed_date, photo_urls[], attachments[] |
| punch_items | UUID, project_id, location_id, trade_id, description, status (open/in_progress/completed/verified), priority, assigned_to, due_date, photo_urls[] |

## Key Metrics
- FTR (First Time Right) %
- Open NCR count by severity
- COPQ (Cost of Poor Quality)
- Inspection completion rate
- Average NCR resolution time (days)

## Environment Variables
```env
PORT=3009
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
VISION_SERVICE_URL=http://localhost:8008
```

## Cross-Module Integration
- **TaktFlow:** Inspection passed triggers takt progress update
- **CostPilot:** NCR cost impact feeds into COPQ in cost tracking
- **VisionAI:** Photo analysis for auto-detection of defects
- **CommHub:** NCR creation triggers notification to responsible party
- **SafeZone:** Quality failure with safety impact creates a safety incident
- **Hub:** Quality health (FTR, open NCRs) feeds Project Health Score

## Development
```bash
cd services/quality-service && npm install && npm run dev
```
