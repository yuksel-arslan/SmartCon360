# SmartCon360

**AI-Powered Unified Construction Management Platform**

13 integrated modules covering all 10 PMBOK knowledge areas + OHS + ESG in a single platform. Combines Takt Time Construction, Location-Based Management (LBMS), Last Planner System (LPS), and Deep Reinforcement Learning.

## Modules

| Module | Brand | Purpose |
|--------|-------|---------|
| Takt Flow | **TaktFlow** | Takt planning, flowline, LPS, constraints |
| Quality Control | **QualityGate** | NCR, inspections, FTR, punch lists |
| OHS / Safety | **SafeZone** | Risk matrix, incidents, PTW, toolbox talks |
| Cost Management | **CostPilot** | EVM, S-curve, budgets, forecasting |
| Resource Management | **CrewFlow** | Crews, equipment, materials |
| Claims | **ClaimShield** | Change orders, claims, delay analysis |
| Visual Progress | **VisionAI** | AI photo analysis, defect detection |
| Supply Chain | **SupplyChain AI** | MRP, procurement, JIT delivery |
| Risk Management | **RiskRadar** | Risk register, heat map, mitigation |
| Communication | **CommHub** | RFI, transmittals, meeting minutes |
| Stakeholders | **StakeHub** | RACI matrix, decision log |
| Sustainability | **GreenSite** | Carbon, waste, LEED/BREEAM |
| Orchestrator | **SmartCon360 Hub** | Project Health Score, AI concierge |

## Quick Start

```bash
# 1. Clone and setup
cp .env.example .env

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Start backend services
cd services/auth-service && npm install && npm run dev
cd services/project-service && npm install && npm run dev
cd services/takt-engine && pip install -r requirements.txt && uvicorn src.main:app --reload --port 8001
cd services/api-gateway && npm install && npm run dev

# 4. Start frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:3100

## Architecture

27 microservices · Node.js 22 + Python 3.11 · Next.js 15 · Tailwind CSS 4 · PostgreSQL · Redis

See [CLAUDE.md](./CLAUDE.md) for full architecture details.

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Full architecture & coding standards |
| [SMARTCON360-PLATFORM.md](./SMARTCON360-PLATFORM.md) | 13 module specifications |
| [AI-FEATURES.md](./AI-FEATURES.md) | 7+ AI features & 3-layer architecture |
| [DRL-ARCHITECTURE.md](./DRL-ARCHITECTURE.md) | DRL engine deep-dive |
| [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) | Database schema |
| [API.md](./API.md) | API specification |
| Each service has its own .md | Detailed service documentation |

## Tech Stack

**Backend:** Express.js, FastAPI, Prisma, LangChain, Socket.io
**Frontend:** Next.js 15, TypeScript 5, Tailwind CSS 4, Framer Motion, D3.js, Zustand
**AI:** Gemini 2.5 Pro/Flash, pgvector, PyTorch, Stable-Baselines3
**Infra:** Docker, PostgreSQL, Redis, Vercel, Railway

## License

Proprietary — SmartCon360 © 2026
