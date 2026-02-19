# COMM-SERVICE — CommHub

## Overview
Manages formal project communications for construction projects within SmartCon360. Handles RFIs (Request for Information), transmittals, meeting minutes, correspondence logs, escalation workflows, and daily reports. Works alongside the existing notification-service (Port 3007) for real-time WebSocket push notifications.

**Module:** CommHub
**Port:** 3015
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3015
## Schema: `comm`

## Responsibilities
- RFI (Request for Information) management: create, assign, track, answer, close
- Transmittal management: document distribution records with acknowledgment
- Meeting minutes: templates, action item tracking, attendance records
- Correspondence log: letters, emails, notices, memos
- Escalation engine: auto-escalate unresponded items based on SLAs
- Daily reports and auto-generated site diary
- Integration with notification-service for real-time push

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/comm/rfi | List RFIs |
| POST | /api/v1/comm/rfi | Create RFI |
| PUT | /api/v1/comm/rfi/:id | Update/Answer RFI |
| GET | /api/v1/comm/transmittals | List transmittals |
| POST | /api/v1/comm/transmittals | Create transmittal |
| GET | /api/v1/comm/meetings | List meeting minutes |
| POST | /api/v1/comm/meetings | Record meeting |
| GET | /api/v1/comm/correspondence | Correspondence log |
| POST | /api/v1/comm/correspondence | Log correspondence |
| GET | /api/v1/comm/stats | Open RFIs, response times |

## Database Schema

**Schema name:** `comm`

| Table | Key Columns |
|-------|-------------|
| rfis | UUID, project_id, rfi_number, subject, question, status (draft/submitted/answered/closed), priority, submitted_by, assigned_to, due_date, answer, answered_by, answered_date, attachments[], related_location_ids[], related_trade_ids[] |
| transmittals | UUID, project_id, transmittal_number, subject, from_party, to_parties[], documents (JSONB), purpose (for_approval/for_information/for_review/for_construction), status (sent/acknowledged/responded), sent_date, acknowledged_date |
| meeting_minutes | UUID, project_id, meeting_type (weekly/monthly/coordination/safety/special), date, location, attendees (JSONB), agenda_items (JSONB), action_items (JSONB), minutes_by, approved_by |
| correspondence | UUID, project_id, type (letter/email/notice/memo), reference_number, subject, from_party, to_party, date, content, attachments[], status (sent/received/acknowledged/action_required) |

## Key Metrics
- Open RFI count and average response time
- Overdue items by category
- Communication volume trends
- Action item completion rate

## Environment Variables
```env
PORT=3015
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
NOTIFICATION_SERVICE_URL=http://localhost:3007
```

## Cross-Module Integration
- **notification-service:** Real-time WebSocket push for all communication events
- **QualityGate:** NCR creation triggers responsible party notification
- **SafeZone:** Critical incident triggers immediate escalation
- **ClaimShield:** CO/Claim status changes trigger notifications
- **SupplyChain:** Delivery alerts trigger supplier communication
- **StakeHub:** Escalated items notify relevant stakeholders

## Development
```bash
cd services/comm-service && npm install && npm run dev
```
