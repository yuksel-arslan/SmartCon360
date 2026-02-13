# RESOURCE-SERVICE.md

## Overview
Manages labor crews, equipment, and materials for takt plan execution. Tracks resource assignments per zone/period, calculates utilization, detects overallocation, and generates resource histograms.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)

## Port: 3006
## Schema: `resource`

## API Endpoints

### Crews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /resources/crews | List crews |
| POST | /resources/crews | Create crew |
| PATCH | /resources/crews/:id | Update crew |
| GET | /resources/crews/histogram | Crew histogram data |

### Equipment
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /resources/equipment | List equipment |
| POST | /resources/equipment | Add equipment |
| PATCH | /resources/equipment/:id | Update equipment |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /resources/materials | List materials |
| POST | /resources/materials | Add material |
| PATCH | /resources/materials/:id | Update material |
| GET | /resources/materials/delivery-schedule | Delivery timeline |

### Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /resources/assign | Assign resources to takt assignment |
| GET | /resources/utilization | Resource utilization report |
| GET | /resources/overallocation | Overallocation warnings |

## Environment Variables
```env
PORT=3006
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
```

## Setup & Run
```bash
cd services/resource-service
npm install && npx prisma migrate dev && npm run dev
```
