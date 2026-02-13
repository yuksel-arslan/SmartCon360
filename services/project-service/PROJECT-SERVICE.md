# PROJECT-SERVICE.md

## Overview
Manages projects, project membership, Location Breakdown Structure (LBS), and trade definitions. The central registry for all project metadata that other services reference.

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod
- **File Upload:** multer (project logos, documents)

## Port: 3002
## Schema: `project`

## API Endpoints

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects | List user's projects (paginated) |
| POST | /projects | Create new project |
| GET | /projects/:id | Get project details |
| PATCH | /projects/:id | Update project |
| DELETE | /projects/:id | Archive project |
| GET | /projects/:id/summary | Project summary with KPIs |

### Project Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/members | List members |
| POST | /projects/:id/members | Invite member |
| PATCH | /projects/:id/members/:uid | Update role |
| DELETE | /projects/:id/members/:uid | Remove member |

### Locations (LBS)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/locations | Get LBS tree |
| POST | /projects/:id/locations | Create location |
| POST | /projects/:id/locations/bulk | Bulk create locations |
| PATCH | /projects/:id/locations/:locId | Update location |
| DELETE | /projects/:id/locations/:locId | Delete location |
| POST | /projects/:id/locations/reorder | Reorder locations |
| GET | /projects/:id/locations/flat | Flat list (for dropdowns) |

### Trades
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/trades | List trades |
| POST | /projects/:id/trades | Add trade |
| PATCH | /projects/:id/trades/:tradeId | Update trade |
| DELETE | /projects/:id/trades/:tradeId | Remove trade |
| POST | /projects/:id/trades/reorder | Reorder trades |

## Database Tables
- `project.projects` — Project metadata
- `project.project_members` — Team membership
- `project.locations` — LBS hierarchy (materialized path)
- `project.trades` — Trade definitions with dependencies

## Key Business Logic
- LBS uses materialized path pattern for efficient tree queries
- Location `code` is auto-generated from hierarchy: B1-F02-Z01
- Trade `predecessor_trade_ids` defines dependency graph
- Project `status` transitions: planning → active → on_hold → completed → archived

## Environment Variables
```env
PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
MAX_PROJECTS_FREE=1
MAX_PROJECTS_PRO=5
MAX_PROJECTS_BUSINESS=20
```

## Dependencies
- express, zod, @prisma/client, prisma
- multer, sharp (image processing)
- pino, uuid

## Setup & Run
```bash
cd services/project-service
npm install
npx prisma migrate dev
npm run dev
```
