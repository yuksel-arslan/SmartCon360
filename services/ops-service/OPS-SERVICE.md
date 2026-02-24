# Ops Service

## Overview

Consolidated Node.js service hosting all operational modules: QualityGate, SafeZone, CostPilot, ClaimShield, RiskRadar, SupplyChain, CommHub, StakeHub, and GreenSite. Merges 9 former standalone services into a single deployment.

## Tech Stack

- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript 5.x (strict mode)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod
- **Logging:** Pino (structured JSON)

## Port & Endpoints

**Port:** 3002

### Quality Module (`/api/v1/quality`) — QualityGate
- NCR (Non-Conformance Reports) CRUD
- Inspection checklists
- FTR (First Time Right) metrics
- COPQ (Cost of Poor Quality) tracking

### Safety Module (`/api/v1/safety`) — SafeZone
- OHS risk matrix
- Incident reporting
- PTW (Permit to Work)
- Toolbox talks / JSA

### Cost Module (`/api/v1/cost`) — CostPilot
- Work items, unit prices, resources
- Quantity takeoffs, estimates
- Budgets, payments, cost records
- EVM (Earned Value Management)
- Cost catalogs, classification mapping

### Claims Module (`/api/v1/claims`) — ClaimShield
- Change orders CRUD
- Claims register
- Delay analysis (domino effect)

### Risk Module (`/api/v1/risk`) — RiskRadar
- Risk register
- Heat map data
- Mitigation tracking

### Supply Chain Module (`/api/v1/supply-chain`) — SupplyChain
- MRP (Material Requirements Planning)
- Procurement management
- JIT delivery tracking
- Supplier management

### Communication Module (`/api/v1/comm`) — CommHub
- RFI management
- Transmittals
- Meeting minutes
- Escalation engine

### Stakeholder Module (`/api/v1/stakeholder`) — StakeHub
- Stakeholder register
- Authority/RACI matrix
- Engagement tracking

### Sustainability Module (`/api/v1/sustainability`) — GreenSite
- Carbon tracking
- Waste management
- LEED/BREEAM compliance

## Modules

| Module | Directory | Brand Name |
|--------|-----------|------------|
| quality | `src/modules/quality/` | QualityGate |
| safety | `src/modules/safety/` | SafeZone |
| cost | `src/modules/cost/` | CostPilot |
| claims | `src/modules/claims/` | ClaimShield |
| risk | `src/modules/risk/` | RiskRadar |
| supply-chain | `src/modules/supply-chain/` | SupplyChain |
| comm | `src/modules/comm/` | CommHub |
| stakeholder | `src/modules/stakeholder/` | StakeHub |
| sustainability | `src/modules/sustainability/` | GreenSite |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `CORE_SERVICE_URL` | Core service URL for auth verification | `http://localhost:3001` |

## Database

Uses Prisma ORM with shared schema. Models span cost, quality, safety, claims, risk, supply-chain, communication, stakeholder, and sustainability schemas.

## Development

```bash
cd services/ops-service && npm run dev
```

## Docker

`Dockerfile` — Multi-stage Node.js build.

## Dependencies

- PostgreSQL (direct via Prisma)
- core-service (JWT verification proxy)
