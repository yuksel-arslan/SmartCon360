# CLAUDE.md — TaktFlow AI

## 🎯 Project Overview

TaktFlow AI is an AI-powered Takt Planning platform for the construction industry. It combines Location-Based Management System (LBMS), Takt Time Construction, and Last Planner System (LPS) with artificial intelligence to automate plan generation, predict delays, and provide conversational project insights.

**Product:** SaaS web application (PWA)
**Domain:** Construction project management / Lean Construction
**Creator:** Yuksel Arslan — 44 years construction engineering, mega-project management across 4 continents

## 🏗️ Architecture

Microservices architecture with 16 independent services, organized in a 3-layer intelligence model.

> **See also:** [AI-FEATURES.md](./AI-FEATURES.md) for detailed AI specifications, [DRL-ARCHITECTURE.md](./DRL-ARCHITECTURE.md) for DRL engine deep-dive.

### 3-Layer Intelligence Model

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: DRL ENGINE (Optional)                                 │
│  Deep RL adaptive replanning, simulation, learning from history │
│  Requires: Training infrastructure, GPU (recommended)           │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: AI-ENHANCED (Gemini API)                              │
│  Plan refinement, concierge, reports, drawing analysis          │
│  Requires: Google Gemini API key                                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE ENGINE (No AI dependency)                        │
│  Template plans, algorithmic takt calc, stacking detection,     │
│  flowline visualization, LPS, constraint management             │
│  Requires: Nothing — works out of the box                       │
└─────────────────────────────────────────────────────────────────┘
```

**The system MUST work fully at Layer 1 without any AI/DRL dependency.**

### Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15+)                 │
│              Tailwind CSS · Dark/Light Mode · PWA           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API GATEWAY (Port 3000)                   │
│             Express · JWT Auth · Rate Limiting               │
└──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬──┬─┘
   │   │   │   │   │   │   │   │   │   │   │   │   │   │  │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼  ▼
 Auth Proj Takt  AI  Flow Cnst Prog Sim  Res  Ntfy Rpt  BIM Cncg Anly DRL
 3001 3002 8001 8002 3003 3004 3005 8003 3006 3007 8004 8005 3008 8006 8007
```

### Service Map

| # | Service | Tech | Port | Layer | Purpose |
|---|---------|------|------|-------|---------|
| 1 | api-gateway | Node.js 22 / Express | 3000 | 1 | Routing, auth middleware, rate limiting |
| 2 | auth-service | Node.js 22 / Passport | 3001 | 1 | JWT, OAuth2, RBAC |
| 3 | project-service | Node.js 22 / Prisma | 3002 | 1 | Project CRUD, LBS, metadata |
| 4 | takt-engine | Python 3.11 / FastAPI | 8001 | 1 | Takt plan computation, template generation |
| 5 | ai-planner | Python 3.11 / LangChain | 8002 | 2 | AI plan generation & refinement (Gemini) |
| 6 | flowline-service | Node.js 22 | 3003 | 1 | Flowline computation & visualization data |
| 7 | constraint-service | Node.js 22 / Prisma | 3004 | 1 | Constraint CRUD + algorithmic detection |
| 8 | progress-service | Node.js 22 / Prisma | 3005 | 1 | Progress tracking, PPC calculation |
| 9 | simulation-service | Python 3.11 / NumPy | 8003 | 1+3 | What-if scenarios (L1: param sweep, L3: DRL) |
| 10 | resource-service | Node.js 22 / Prisma | 3006 | 1 | Labor, equipment, materials |
| 11 | notification-service | Node.js 22 / Socket.io | 3007 | 1 | Real-time alerts |
| 12 | reporting-service | Python 3.11 / Jinja2 | 8004 | 1+2 | Reports (L1: data export, L2: AI narrative) |
| 13 | bim-service | Python 3.11 / ifcopenshell | 8005 | 2 | IFC/BIM integration + Gemini Vision |
| 14 | ai-concierge | Node.js 22 / Gemini | 3008 | 2 | Natural language project interface |
| 15 | analytics-service | Python 3.11 / Pandas | 8006 | 1+3 | Dashboard KPIs + Project DNA (L3) |
| 16 | **drl-engine** | **Python 3.11 / PyTorch** | **8007** | **3** | **DRL adaptive replanning, WDM zone optimization** |

### AI Features (cross-service)

| ID | Feature | Layer | Services | Phase |
|----|---------|-------|----------|-------|
| AI-1 | Intelligent Plan Generator | 1+2+3 | takt-engine, ai-planner, drl-engine | 1-3 |
| AI-2 | Drawing & BIM Analyzer | 2 | bim-service | 3 |
| AI-3 | Proactive Warning System | 1 | takt-engine, constraint-service | 1 |
| AI-4 | Conversational Assistant | 2 | ai-concierge | 2 |
| AI-5 | What-If Simulation | 1+2+3 | simulation-service, drl-engine | 2-3 |
| AI-6 | Automated Report Writer | 2 | reporting-service | 2 |
| AI-7 | Learning Engine (Project DNA) | 3 | analytics-service, drl-engine | 4 |

> **Full AI feature specifications:** [AI-FEATURES.md](./AI-FEATURES.md)
> **DRL engine architecture:** [DRL-ARCHITECTURE.md](./DRL-ARCHITECTURE.md)

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
├── CLAUDE.md                    # Project spec & coding standards
├── AI-FEATURES.md               # 7 AI features & 3-layer architecture
├── DRL-ARCHITECTURE.md          # DRL engine deep-dive specification
├── DATABASE-SCHEMA.md           # Database schema documentation
├── API.md                       # API endpoint documentation
├── README.md
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── packages/
│   └── shared/                  # Shared types, utils, constants
├── services/
│   ├── api-gateway/             # Port 3000 — Layer 1
│   ├── auth-service/            # Port 3001 — Layer 1
│   ├── project-service/         # Port 3002 — Layer 1
│   ├── takt-engine/             # Port 8001 — Layer 1
│   ├── ai-planner/              # Port 8002 — Layer 2
│   ├── flowline-service/        # Port 3003 — Layer 1
│   ├── constraint-service/      # Port 3004 — Layer 1
│   ├── progress-service/        # Port 3005 — Layer 1
│   ├── simulation-service/      # Port 8003 — Layer 1+3
│   ├── resource-service/        # Port 3006 — Layer 1
│   ├── notification-service/    # Port 3007 — Layer 1
│   ├── reporting-service/       # Port 8004 — Layer 1+2
│   ├── bim-service/             # Port 8005 — Layer 2
│   ├── ai-concierge/            # Port 3008 — Layer 2
│   ├── analytics-service/       # Port 8006 — Layer 1+3
│   └── drl-engine/              # Port 8007 — Layer 3 (optional)
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

### DRL Engine (Layer 3 — optional)
- PyTorch 2.x
- Stable-Baselines3 (PPO)
- Gymnasium (RL environment interface)
- SimPy (Discrete Event Simulation)
- SciPy (WDM/WoLZo optimization)
- WandB (training metrics)

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

> **AI Feature mapping:** See [AI-FEATURES.md](./AI-FEATURES.md) for Feature × Phase Matrix

### Phase 1: Foundation — Layer 1 Core (6 weeks) ← CURRENT
- [x] Project setup, monorepo structure
- [x] auth-service (JWT, register/login)
- [x] project-service (CRUD, LBS)
- [x] takt-engine (basic takt calculation + template generation)
- [x] flowline-service (basic flowline data)
- [x] Frontend shell (sidebar, routing, theme)
- [x] Dashboard page (static KPIs)
- [ ] **AI-1 Core:** Template-based plan generation (no AI API needed)
- [ ] **AI-3 Core:** Algorithmic warning system (stacking, predecessor, buffer)
- [ ] Project creation wizard with AI-generated plan review
- [ ] constraint-service CRUD (Layer 1 — manual constraint management)

### Phase 2: AI Enhancement — Layer 2 (8 weeks)
- [ ] **AI-1 Enhanced:** Gemini API plan refinement from text descriptions
- [ ] **AI-4:** ai-concierge (conversational project assistant, Gemini + RAG)
- [ ] **AI-5 Basic:** simulation-service (parameter sweep + AI scenario suggestions)
- [ ] **AI-6:** reporting-service (AI narrative report generation)
- [ ] Interactive flowline chart with real-time updates
- [ ] Takt editor with drag & drop
- [ ] progress-service (PPC calculation)
- [ ] LPS pages (lookahead, weekly plan)

### Phase 3: DRL & BIM — Layer 3 Foundation (12 weeks)
- [ ] **DRL Phase 2A:** DES Simulator + WDM Engine + Reward Function
- [ ] **DRL Phase 2B:** PPO Training + Baseline Evaluation (30%+ improvement target)
- [ ] **DRL Phase 2C:** FastAPI service + Frontend integration
- [ ] **AI-2:** bim-service (IFC parse + Gemini Vision drawing analysis)
- [ ] **AI-1 DRL:** DRL-optimized plan generation
- [ ] **AI-5 DRL:** DRL-powered optimal scenario selection
- [ ] resource-service (labor, equipment, materials)
- [ ] Field progress tracking (mobile PWA)

### Phase 4: Intelligence & Learning (6 weeks)
- [ ] **AI-7:** Project DNA — learning engine from completed projects
- [ ] **DRL Phase 3:** GCN integration, transfer learning, online learning
- [ ] analytics-service (advanced KPIs, trend analysis)
- [ ] DRL action explainability (why the agent recommends X)

### Phase 5: Enterprise (8 weeks)
- [ ] Multi-project support
- [ ] P6 import/export
- [ ] Multi-Agent RL (MAPPO for large-scale projects)
- [ ] Mobile PWA optimization
- [ ] Marketplace / API platform
