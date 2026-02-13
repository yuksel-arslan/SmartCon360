# CLAUDE.md — TaktFlow AI

## 🎯 Project Overview

TaktFlow AI is an AI-powered Takt Planning platform for the construction industry. It combines Location-Based Management System (LBMS), Takt Time Construction, and Last Planner System (LPS) with artificial intelligence to automate plan generation, predict delays, and provide conversational project insights.

**Product:** SaaS web application (PWA)
**Domain:** Construction project management / Lean Construction
**Creator:** Yuksel Arslan — 44 years construction engineering, mega-project management across 4 continents

## 🏗️ Architecture

Microservices architecture with 15 independent services.

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15+)                 │
│              Tailwind CSS · Dark/Light Mode · PWA           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API GATEWAY (Port 3000)                   │
│             Express · JWT Auth · Rate Limiting               │
└──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬────┘
   │   │   │   │   │   │   │   │   │   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
 Auth Proj Takt  AI  Flow Cnst Prog Sim  Res  Ntfy Rpt  BIM Cncg Anly
 3001 3002 8001 8002 3003 3004 3005 8003 3006 3007 8004 8005 3008 8006
```

### Service Map

| # | Service | Tech | Port | Purpose |
|---|---------|------|------|---------|
| 1 | api-gateway | Node.js 22 / Express | 3000 | Routing, auth middleware, rate limiting |
| 2 | auth-service | Node.js 22 / Passport | 3001 | JWT, OAuth2, RBAC |
| 3 | project-service | Node.js 22 / Prisma | 3002 | Project CRUD, LBS, metadata |
| 4 | takt-engine | Python 3.11 / FastAPI | 8001 | Takt plan computation |
| 5 | ai-planner | Python 3.11 / LangChain | 8002 | AI plan generation |
| 6 | flowline-service | Node.js 22 | 3003 | Flowline computation |
| 7 | constraint-service | Node.js 22 / Prisma | 3004 | Constraint management |
| 8 | progress-service | Node.js 22 / Prisma | 3005 | Progress tracking, PPC |
| 9 | simulation-service | Python 3.11 / NumPy | 8003 | What-if scenarios |
| 10 | resource-service | Node.js 22 / Prisma | 3006 | Labor, equipment, materials |
| 11 | notification-service | Node.js 22 / Socket.io | 3007 | Real-time alerts |
| 12 | reporting-service | Python 3.11 / Jinja2 | 8004 | AI report generation |
| 13 | bim-service | Python 3.11 / ifcopenshell | 8005 | IFC/BIM integration |
| 14 | ai-concierge | Node.js 22 / Gemini | 3008 | Natural language interface |
| 15 | analytics-service | Python 3.11 / Pandas | 8006 | Dashboard KPIs |

### Databases

| DB | Usage | Connection |
|----|-------|------------|
| PostgreSQL (Neon) | Primary data store | `DATABASE_URL` |
| Redis | Cache, sessions, pub/sub | `REDIS_URL` |
| TimescaleDB | Time-series progress data | `TIMESCALE_URL` |
| pgvector | Vector store for AI memory | `VECTOR_DB_URL` |

## 📁 Repository Structure

```
taktflow-ai/
├── CLAUDE.md
├── README.md
├── ARCHITECTURE.md
├── API.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── packages/
│   └── shared/                  # Shared types, utils, constants
├── services/
│   ├── api-gateway/             # Port 3000
│   ├── auth-service/            # Port 3001
│   ├── project-service/         # Port 3002
│   ├── takt-engine/             # Port 8001
│   ├── ai-planner/              # Port 8002
│   ├── flowline-service/        # Port 3003
│   ├── constraint-service/      # Port 3004
│   ├── progress-service/        # Port 3005
│   ├── simulation-service/      # Port 8003
│   ├── resource-service/        # Port 3006
│   ├── notification-service/    # Port 3007
│   ├── reporting-service/       # Port 8004
│   ├── bim-service/             # Port 8005
│   ├── ai-concierge/            # Port 3008
│   └── analytics-service/       # Port 8006
└── frontend/                    # Next.js 15+ app
```

## 🛠️ Tech Stack

### Backend (Node.js services)
- Node.js 22+
- TypeScript 5.x (strict mode)
- Express.js
- Prisma ORM (PostgreSQL)
- Socket.io (WebSocket)
- Zod (validation)
- Jest (testing)

### Backend (Python services)
- Python 3.11
- FastAPI
- SQLAlchemy / asyncpg
- LangChain (AI chains)
- NumPy / Pandas (computation)
- Pydantic (validation)
- pytest (testing)

### Frontend
- Next.js 15+ (App Router)
- TypeScript 5.x (strict)
- Tailwind CSS 4.x (dark/light mode)
- Framer Motion 11+ (animations)
- D3.js 7+ (flowline/charts)
- Zustand 5+ (state)
- Socket.io Client (real-time)
- React Flow 12+ (dependency graphs)

### Fonts
- Display: Fraunces (headings, hero)
- Body: Inter (UI text, forms)
- Mono: JetBrains Mono (IDs, technical data)

### Infrastructure
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Vercel (frontend) / Railway (services)
- Neon (PostgreSQL)
- Upstash (Redis)
- Cloudflare (CDN)

## 📐 Coding Standards

### TypeScript (Node.js services)
```typescript
// Use strict types, no `any`
// Use Zod for runtime validation
// Use Prisma for DB access
// Error handling: custom AppError class
// Logging: structured JSON (pino)
// Naming: camelCase for variables, PascalCase for types/interfaces
```

### Python services
```python
# Use type hints everywhere
# Use Pydantic for request/response models
# Use FastAPI dependency injection
# Async/await for all I/O
# Naming: snake_case for variables/functions, PascalCase for classes
```

### Frontend
```typescript
// Functional components only
// Custom hooks for logic extraction
// Zustand for global state
// React Query for server state
// Tailwind utility classes (no CSS modules)
// Always support dark/light mode via CSS variables
```

### API Conventions
```
Base: /api/v1
Format: JSON
Auth: Bearer JWT token
Pagination: ?page=1&limit=20
Sort: ?sort=-created_at
Filter: ?status=active&trade=MEP
Errors: { error: string, code: string, details?: any }
```

### Git
```
Branch: main → develop → feature/xxx
Commits: conventional commits (feat:, fix:, docs:, refactor:)
PR: required review, passing CI
```

## 🏛️ Domain Concepts

### Takt Planning Terms
- **LBS (Location Breakdown Structure):** Hierarchical division of project space (Site → Building → Floor → Zone → Room)
- **Takt Zone:** Equal-work-content area where trades perform work sequentially
- **Takt Time:** Standard duration for one trade to complete work in one zone (typically 3-5 business days)
- **Takt Train (Wagon):** Sequence of trades flowing through zones like an assembly line
- **Flowline:** Visual chart showing all trades' progress across zones over time
- **Buffer:** Time/space gap between trades to absorb variation and prevent stacking
- **Trade Stacking:** Undesirable situation where multiple trades occupy the same zone simultaneously

### Last Planner System (LPS) Terms
- **Phase Planning:** High-level milestones broken into takt-compatible phases
- **Lookahead:** 6-week rolling window of upcoming work, constraint screening
- **Weekly Work Plan:** Committed tasks for current week by each trade
- **PPC (Percent Plan Complete):** Key reliability metric — committed tasks completed / total committed
- **Variance:** Deviation from plan with root cause analysis
- **Constraint:** Any prerequisite that must be resolved before work can begin (8 categories)

### Constraint Categories
1. **Design** — Drawing/spec issues, RFIs pending
2. **Material** — Procurement, delivery, storage
3. **Equipment** — Availability, mobilization
4. **Labor** — Crew availability, skills, permits
5. **Space** — Access, staging, trade stacking
6. **Predecessor** — Prior work not complete
7. **Permit** — Regulatory approvals
8. **Information** — Missing data, decisions pending

## ⚡ Key Rules for Claude Code

1. **Every microservice MUST have its own .md file** in the service root directory with complete documentation
2. **Dark/Light mode is mandatory** — all components must support both themes via Tailwind
3. **No hardcoded colors** — use CSS variables or Tailwind theme tokens
4. **TypeScript strict mode** — no `any` types
5. **All API responses** follow the standard envelope: `{ data, meta, error }`
6. **Prisma migrations** must be named descriptively
7. **Environment variables** must be documented in each service's .md file
8. **Docker** — every service must have a Dockerfile
9. **Tests** — minimum unit tests for business logic
10. **Fonts** — Fraunces (display), Inter (body), JetBrains Mono (code/technical)

## 🚀 Development Commands

```bash
# Start all services locally
docker-compose up -d

# Start frontend
cd frontend && npm run dev

# Start individual Node.js service
cd services/auth-service && npm run dev

# Start individual Python service
cd services/takt-engine && uvicorn src.main:app --reload --port 8001

# Run migrations
cd services/project-service && npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run tests
npm test                    # Node.js services
pytest                      # Python services
```

## 📊 Implementation Phases

### Phase 1: Foundation (6 weeks) ← CURRENT
- [x] Project setup, monorepo structure
- [ ] auth-service (JWT, register/login)
- [ ] project-service (CRUD, LBS)
- [ ] takt-engine (basic takt calculation)
- [ ] flowline-service (basic flowline data)
- [ ] Frontend shell (sidebar, routing, theme)
- [ ] Dashboard page (static KPIs)

### Phase 2: AI Core (8 weeks)
- [ ] ai-planner (generative takt plans)
- [ ] constraint-service (CRUD + auto-detect)
- [ ] simulation-service (what-if scenarios)
- [ ] Interactive flowline chart
- [ ] Takt editor with drag & drop

### Phase 3: Lean Integration (6 weeks)
- [ ] progress-service (PPC calculation)
- [ ] LPS pages (lookahead, weekly plan)
- [ ] resource-service
- [ ] Field progress tracking

### Phase 4: Intelligence (6 weeks)
- [ ] ai-concierge (NLP interface)
- [ ] analytics-service
- [ ] reporting-service (AI reports)
- [ ] bim-service (IFC parse)
- [ ] Project DNA (learning engine)

### Phase 5: Enterprise (8 weeks)
- [ ] Multi-project support
- [ ] P6 import/export
- [ ] Mobile PWA optimization
- [ ] Advanced analytics
- [ ] Marketplace / API platform
