# PROGRESS-SERVICE.md

## Overview
Tracks field progress against takt plan, calculates PPC (Percent Plan Complete), manages variance records, and provides progress analytics. The bridge between planned work and site reality.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **File Storage:** S3-compatible (progress photos)

## Port: 3005
## Schema: `progress`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /progress/update | Submit progress update |
| GET | /progress/assignment/:assignmentId | Progress history for assignment |
| GET | /progress/zone/:zoneId | Progress by zone |
| GET | /progress/trade/:tradeId | Progress by trade |
| POST | /progress/ppc/calculate | Calculate PPC for a week |
| GET | /progress/ppc/history | PPC trend data |
| GET | /progress/ppc/current | Current week PPC |
| GET | /progress/ppc/by-trade | PPC breakdown by trade |
| POST | /progress/variance | Record variance |
| GET | /progress/variance/history | Variance trend |
| GET | /progress/variance/reasons | Top variance reasons |
| POST | /progress/daily-log | Submit daily log |
| GET | /progress/daily-log/:date | Get daily log |

## PPC Calculation
```
PPC = (Tasks Completed This Week / Tasks Committed This Week) × 100

Where "committed" = tasks in the weekly work plan
And "completed" = tasks marked 100% by week end
```

## Environment Variables
```env
PORT=3005
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
S3_BUCKET=taktflow-progress-photos
S3_REGION=us-east-1
S3_ACCESS_KEY=<key>
S3_SECRET_KEY=<secret>
```

## Setup & Run
```bash
cd services/progress-service
npm install && npx prisma migrate dev && npm run dev
```
