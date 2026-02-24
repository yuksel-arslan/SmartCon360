# CLAUDE.md — SmartCon360

## Project Overview

SmartCon360 is an AI-powered **unified construction management platform** that integrates 13 specialized modules into a single SaaS application. It covers all 10 PMBOK knowledge areas plus OHS and ESG, combining Location-Based Management System (LBMS), Takt Time Construction, Last Planner System (LPS), and Deep Reinforcement Learning with a modular, licensable architecture.

**Product:** SaaS web application (PWA) — single platform, modular licensing
**Domain:** Full-spectrum construction project management
**Creator:** Yuksel Arslan — 44 years construction engineering, mega-project management across 4 continents
**URL:** app.smartcon360.com

> **See also:**
> - [SMARTCON360-PLATFORM.md](./SMARTCON360-PLATFORM.md) — 13 modules, licensing tiers, cross-module synergy
> - [AI-FEATURES.md](./AI-FEATURES.md) — 7 AI features & 3-layer architecture
> - [DRL-ARCHITECTURE.md](./DRL-ARCHITECTURE.md) — DRL engine deep-dive
> - [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) — Database schema documentation
> - [API.md](./API.md) — API endpoint documentation

## 13-Module Platform Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                      SmartCon360 Platform                            │
│              "Tek Platform, Tum Insaat Yonetimi"                    │
│              "One Platform, Full Construction Management"            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CORE (Planning · Cost · Resources)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  TaktFlow    │  │  CostPilot   │  │  CrewFlow    │              │
│  │  Planning &  │  │  Cost & EVM  │  │  Resource    │              │
│  │  Scheduling  │  │  Management  │  │  Management  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  QUALITY & SAFETY                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ QualityGate  │  │  SafeZone    │  │  VisionAI    │              │
│  │ Quality Ctrl │  │  OHS / HSE   │  │  Visual Prog │              │
│  │ NCR, FTR     │  │  Risk Matrix │  │  AI Analysis │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  SUPPLY & RISK                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ SupplyChain  │  │  RiskRadar   │  │ ClaimShield  │              │
│  │ Procurement  │  │  Risk Mgmt   │  │ Claims &     │              │
│  │ MRP, JIT     │  │  Heat Map    │  │ Change Ord.  │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  COMMUNICATION & ESG                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  CommHub     │  │  StakeHub    │  │  GreenSite   │              │
│  │ Comm. Mgmt   │  │  Stakeholder │  │  ESG & Env.  │              │
│  │ Escalation   │  │  Management  │  │  Carbon/LEED │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
│  ORCHESTRATION                                                       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │  SmartCon360 Hub — Master AI Orchestrator                │       │
│  │  Cross-module data synthesis, Project Health Score,      │       │
│  │  Unified Dashboard, Module Licensing                     │       │
│  └──────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
```

### PMBOK Coverage

| # | PMBOK Knowledge Area | Module(s) |
|---|----------------------|-----------|
| 1 | Integration Management | Hub (orchestrator) |
| 2 | Scope Management | TaktFlow (LBS) + ClaimShield (CO) |
| 3 | Schedule Management | TaktFlow (takt, flowline, LPS) |
| 4 | Cost Management | CostPilot (EVM, CPI/SPI, S-Curve) |
| 5 | Quality Management | QualityGate (NCR, checklist, FTR) |
| 6 | Resource Management | CrewFlow (crews, equipment) |
| 7 | Communication Management | CommHub (notifications, escalation) |
| 8 | Risk Management | RiskRadar (heat map, what-if) |
| 9 | Procurement Management | SupplyChain AI (MRP, JIT, RFQ) |
| 10 | Stakeholder Management | StakeHub (authority matrix, reports) |
| +1 | OHS / HSE | SafeZone (risk matrix, incident reporting) |
| +2 | ESG / Environmental | GreenSite (carbon, waste, LEED) |

### Licensing Tiers

| Tier | Modules | Target |
|------|---------|--------|
| **Starter** | TaktFlow + CommHub | Small contractor |
| **Professional** | + QualityGate + SafeZone + CostPilot | Mid-size firm |
| **Enterprise** | + CrewFlow + SupplyChain + RiskRadar + ClaimShield | Large firm |
| **Ultimate** | + VisionAI + StakeHub + GreenSite + Hub AI | Mega project |

## Architecture

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

### Service Architecture (Consolidated)

> **Note:** The original 27 microservices have been consolidated into 6 services + 1 extension.
> The old services are archived in `services/_deprecated/` for reference.

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15+)                          │
│        Single App · Modular Sidebar · Tailwind CSS · Dark/Light · PWA│
│        app.smartcon360.com                                           │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                         │
│            Express · JWT Auth · Rate Limiting · Module Access Ctrl   │
└──────┬──────────┬──────────────┬──────────────┬──────────────┬──────┘
       │          │              │              │              │
       ▼          ▼              ▼              ▼              ▼
  CORE-SVC   OPS-SVC     PLATFORM-SVC    TAKT-SVC        AI-SVC
  Port 3001  Port 3002   Port 3003       Port 8001       Port 8002
  Node.js    Node.js     Node.js         Python 3.11     Python 3.11
  ┌────────┐ ┌─────────┐ ┌────────────┐  ┌────────────┐  ┌──────────┐
  │ auth   │ │ quality │ │ hub        │  │ takt-engine│  │ planner  │
  │ project│ │ safety  │ │ notification│  │ flowline   │  │ reporting│
  │ constr.│ │ cost    │ │ resource   │  │ simulation │  │ bim      │
  │ progres│ │ claims  │ └────────────┘  └────────────┘  │ analytics│
  └────────┘ │ risk    │                                  │ drl      │
             │ supply  │       EXTENSION                  └──────────┘
             │ comm    │   AI-RISK-ENGINE
             │ stakeh. │   Port 8010
             │ sustain.│   Python 3.11
             └─────────┘
```

### Complete Service Map

| # | Service | Tech | Port | Modules | Purpose |
|---|---------|------|------|---------|---------|
| 1 | **api-gateway** | Node.js 22 / Express | 3000 | — | Routing, JWT auth, rate limiting, module licensing |
| 2 | **core-service** | Node.js 22 / Prisma | 3001 | auth, project, constraint, progress | Auth + project CRUD + LBS/WBS/CBS/BOQ + LPS + constraints |
| 3 | **ops-service** | Node.js 22 / Prisma | 3002 | quality, safety, cost, claims, risk, supply-chain, comm, stakeholder, sustainability | All operational modules (QualityGate, SafeZone, CostPilot, ClaimShield, RiskRadar, SupplyChain, CommHub, StakeHub, GreenSite) |
| 4 | **platform-service** | Node.js 22 / Express | 3003 | hub, notification, resource | Cross-module orchestration, Project Health Score, notifications, CrewFlow |
| 5 | **takt-service** | Python 3.11 / FastAPI | 8001 | takt, flowline, simulation | Takt computation, flowline visualization, Monte Carlo simulation |
| 6 | **ai-service** | Python 3.11 / FastAPI | 8002 | planner, reporting, bim, analytics, drl | AI plan generation (Gemini), BIM/IFC parsing, report generation, analytics stubs |
| 7 | **ai-risk-engine** (ext.) | Python 3.11 / FastAPI | 8010 | — | Rule-based risk assessment, delay domino analysis, explainable scoring |

### Cross-Module Synergy Pipeline

```
VisionAI captures photo → QualityGate validates quality
  → TaktFlow updates takt progress → CostPilot updates EVM
    → CrewFlow moves crew to next zone → CommHub notifies subcontractor
      → RiskRadar updates risk heat map → Hub recalculates Health Score
```

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
| AI-8 | Visual Progress Tracking | 2 | vision-service | 3 |
| AI-9 | Cross-Module Intelligence | 2 | hub-service, analytics-service | 4 |

> **Full AI feature specifications:** [AI-FEATURES.md](./AI-FEATURES.md)
> **DRL engine architecture:** [DRL-ARCHITECTURE.md](./DRL-ARCHITECTURE.md)

### Databases

| DB | Usage | Connection |
|----|-------|------------|
| PostgreSQL (Neon) | Primary data store | `DATABASE_URL` |
| Redis | Cache, sessions, pub/sub | `REDIS_URL` |
| TimescaleDB | Time-series progress data | `TIMESCALE_URL` |
| pgvector | Vector store for AI memory | `VECTOR_DB_URL` |

## Repository Structure

```
smartcon360/
├── CLAUDE.md                    # Project spec & coding standards (this file)
├── SMARTCON360-PLATFORM.md      # 13-module architecture & specs
├── AI-FEATURES.md               # 7+ AI features & 3-layer architecture
├── DRL-ARCHITECTURE.md          # DRL engine deep-dive specification
├── DATABASE-SCHEMA.md           # Database schema documentation
├── API.md                       # API endpoint documentation
├── README.md
├── docker-compose.yml
├── .env.example
├── packages/
│   └── shared/                  # Shared types, utils, constants
├── services/
│   ├── api-gateway/             # Port 3000 — Routing, auth, rate limiting
│   ├── core-service/            # Port 3001 — auth + project + constraint + progress
│   ├── ops-service/             # Port 3002 — quality + safety + cost + claims + risk + supply + comm + stakeholder + sustainability
│   ├── platform-service/        # Port 3003 — hub + notification + resource
│   ├── takt-service/            # Port 8001 — takt-engine + flowline + simulation (Python)
│   ├── ai-service/              # Port 8002 — ai-planner + bim + reporting + analytics + drl (Python)
│   ├── extensions/
│   │   └── ai-risk-engine/      # Port 8010 — Rule-based risk assessment (Python)
│   └── _deprecated/             # Archived: original 27 microservices (pre-consolidation)
├── engines/                     # Standalone engine utilities
├── smartcon_bim_engine/         # Standalone BIM/IFC parsing engine (Python)
├── scripts/                     # DB init, data parsing scripts
└── frontend/                    # Next.js 15+ app (single unified frontend)
    ├── prisma/                  # Prisma schema (single source of truth)
    ├── vercel.json              # Vercel deployment config
    └── src/app/
        ├── (auth)/              # Login, register
        └── (dashboard)/         # All module pages
            ├── dashboard/       # Hub — unified dashboard
            ├── planning/        # TaktFlow — flowline, takt editor
            ├── quality/         # QualityGate — NCR, checklists
            ├── safety/          # SafeZone — OHS, incidents
            ├── cost/            # CostPilot — EVM, S-curve
            ├── resources/       # CrewFlow — crews, equipment
            ├── supply/          # SupplyChain — procurement, MRP
            ├── risk/            # RiskRadar — risk register
            ├── claims/          # ClaimShield — change orders
            ├── communication/   # CommHub — RFI, transmittals
            ├── stakeholders/    # StakeHub — stakeholder register
            ├── sustainability/  # GreenSite — ESG, carbon
            ├── vision/          # VisionAI — photo analysis
            ├── ai/              # AI Concierge
            ├── reports/         # Reports
            ├── simulation/      # Simulation
            └── settings/        # Platform settings
```

## Tech Stack

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

## Coding Standards

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
Module Access: X-Module header for licensing enforcement
```

### Git
```
Branch: main → develop → feature/xxx
Commits: conventional commits (feat:, fix:, docs:, refactor:)
PR: required review, passing CI
```

## Domain Concepts

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

### Cost Management Terms (CostPilot)
- **EVM (Earned Value Management):** PV, EV, AC, CPI, SPI, EAC, ETC, VAC
- **S-Curve:** Cumulative cost/progress visualization over time
- **COPQ (Cost of Poor Quality):** Rework + waste cost tracking

### Quality Terms (QualityGate)
- **NCR (Non-Conformance Report):** Defect documentation and resolution
- **FTR (First Time Right):** Quality metric — work accepted on first inspection
- **ITP (Inspection & Test Plan):** Pre-defined quality checkpoints

### Safety Terms (SafeZone)
- **PTW (Permit to Work):** Authorization for hazardous activities
- **JSA (Job Safety Analysis):** Systematic risk assessment per task
- **LTIR (Lost Time Injury Rate):** Safety performance metric

## Key Rules for Claude Code

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
11. **Module isolation** — each module's frontend routes are under their own directory
12. **Cross-module data** flows through the hub-service, not direct service-to-service calls
13. **Licensing** — all module-specific API routes must check module access via middleware

## Development Commands

```bash
# Start all services locally
docker-compose up -d

# Start frontend
cd frontend && npm run dev

# Start individual Node.js service
cd services/core-service && npm run dev    # Port 3001
cd services/ops-service && npm run dev     # Port 3002
cd services/platform-service && npm run dev # Port 3003
cd services/api-gateway && npm run dev     # Port 3000

# Start individual Python service
cd services/takt-service && uvicorn src.main:app --reload --port 8001
cd services/ai-service && uvicorn src.main:app --reload --port 8002

# Run migrations (from frontend or core-service — same schema)
cd frontend && npx prisma migrate dev
cd frontend && npx prisma generate

# Run tests
npm test                    # Node.js services
pytest                      # Python services
```

## Implementation Phases

> **AI Feature mapping:** See [AI-FEATURES.md](./AI-FEATURES.md) for Feature x Phase Matrix

### Phase 1: Foundation — Layer 1 Core (6 weeks) [COMPLETED]
- [x] Project setup, monorepo structure
- [x] auth-service (JWT, register/login)
- [x] project-service (CRUD, LBS)
- [x] takt-engine (basic takt calculation + template generation)
- [x] flowline-service (basic flowline data)
- [x] Frontend shell (sidebar, routing, theme)
- [x] Dashboard page (static KPIs)
- [x] AI-1 Core: Template-based plan generation
- [x] AI-3 Core: Algorithmic warning system
- [x] Project creation wizard
- [x] constraint-service CRUD

### Phase 2: SmartCon360 Platform Unification + AI Enhancement (10 weeks) ← CURRENT
- [ ] **Platform rebrand:** SmartCon360 unified frontend with modular sidebar
- [ ] **QualityGate:** quality-service (NCR, checklists, inspections, FTR)
- [ ] **SafeZone:** safety-service (OHS risk matrix, incident reporting, PTW)
- [ ] **CostPilot:** cost-service (budgets, EVM, S-curve, forecasting)
- [ ] **ClaimShield:** claims-service (change orders, claims register, delay analysis)
- [ ] **SupplyChain:** supply-chain-service (MRP, procurement, JIT, suppliers)
- [ ] **RiskRadar:** risk-service (risk register, heat map, mitigation tracking)
- [ ] **CommHub:** comm-service (RFI, transmittals, meeting minutes)
- [ ] **StakeHub:** stakeholder-service (stakeholder register, authority matrix)
- [ ] **GreenSite:** sustainability-service (carbon tracking, waste, LEED)
- [ ] **Hub:** hub-service (cross-module orchestration, Project Health Score)
- [ ] **AI-1 Enhanced:** Gemini API plan refinement from text descriptions
- [ ] **AI-4:** ai-concierge (conversational project assistant, Gemini + RAG)
- [ ] **AI-5 Basic:** simulation-service (parameter sweep + AI scenario suggestions)
- [ ] **AI-6:** reporting-service (AI narrative report generation)
- [ ] Interactive flowline chart with real-time updates
- [ ] Takt editor with drag & drop
- [ ] progress-service (PPC calculation)
- [ ] LPS pages (lookahead, weekly plan)
- [ ] Module licensing middleware in api-gateway

### Phase 3: VisionAI + DRL + BIM — Layer 2+3 (12 weeks)
- [ ] **VisionAI:** vision-service (photo progress analysis, defect detection)
- [ ] **DRL Phase 2A:** DES Simulator + WDM Engine + Reward Function
- [ ] **DRL Phase 2B:** PPO Training + Baseline Evaluation (30%+ improvement target)
- [ ] **DRL Phase 2C:** FastAPI service + Frontend integration
- [ ] **AI-2:** bim-service (IFC parse + Gemini Vision drawing analysis)
- [ ] **AI-1 DRL:** DRL-optimized plan generation
- [ ] **AI-5 DRL:** DRL-powered optimal scenario selection
- [ ] Field progress tracking (mobile PWA)

### Phase 4: Intelligence & Learning (6 weeks)
- [ ] **AI-7:** Project DNA — learning engine from completed projects
- [ ] **AI-9:** Cross-module intelligence (Hub AI)
- [ ] **DRL Phase 3:** GCN integration, transfer learning, online learning
- [ ] analytics-service (advanced KPIs, trend analysis)
- [ ] DRL action explainability

### Phase 5: Enterprise (8 weeks)
- [ ] Multi-project portfolio management
- [ ] P6 import/export
- [ ] Multi-Agent RL (MAPPO for large-scale projects)
- [ ] Mobile PWA optimization
- [ ] Marketplace / API platform
- [ ] White-label support
