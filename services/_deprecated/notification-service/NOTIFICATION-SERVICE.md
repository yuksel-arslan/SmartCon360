# NOTIFICATION-SERVICE.md

## Overview
Handles real-time notifications via WebSocket (Socket.io), in-app notifications, email alerts, and push notifications. Subscribes to Redis pub/sub for cross-service event propagation.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js + Socket.io 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Pub/Sub:** Redis
- **Email:** Resend API

## Port: 3007
## Schema: `notification`

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| takt:progress-updated | Server→Client | Zone progress changed |
| takt:constraint-alert | Server→Client | New/critical constraint |
| takt:plan-changed | Server→Client | Plan revision |
| takt:trade-stacking | Server→Client | Trade stacking detected |
| takt:ai-suggestion | Server→Client | AI recommendation ready |
| user:presence | Bidirectional | User online status |
| notification:new | Server→Client | New notification |
| notification:read | Client→Server | Mark as read |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications | List notifications (paginated) |
| PATCH | /notifications/:id/read | Mark as read |
| POST | /notifications/read-all | Mark all as read |
| GET | /notifications/unread-count | Get unread count |
| GET | /notifications/preferences | Get notification preferences |
| PATCH | /notifications/preferences | Update preferences |

## Environment Variables
```env
PORT=3007
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=<key>
FROM_EMAIL=notifications@taktflow.ai
FRONTEND_URL=https://taktflow.ai
```

## Setup & Run
```bash
cd services/notification-service
npm install && npx prisma migrate dev && npm run dev
```
