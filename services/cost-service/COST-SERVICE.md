# COST-SERVICE — CostPilot

## Overview
Manages cost control and financial tracking for construction projects within SmartCon360. Provides budget management, Earned Value Management (EVM), S-Curve visualization data, cost forecasting, COPQ aggregation, payment tracking, and cash flow projections.

**Module:** CostPilot
**Port:** 3011
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1 (Layer 2 for AI cost prediction via Gemini)
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3011
## Schema: `cost`

## Responsibilities
- Budget management aligned with WBS cost breakdown
- Earned Value Management (EVM): PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI
- S-Curve data generation for planned vs actual cost visualization
- Cost forecasting with EAC/ETC and trend analysis
- COPQ (Cost of Poor Quality) aggregation from QualityGate NCRs
- Payment application tracking with progress-based invoicing
- Cash flow projection with monthly inflow/outflow forecast
- AI cost prediction using Gemini for early warning (Layer 2)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/budgets | List budgets |
| POST | /api/v1/cost/budgets | Create budget |
| GET | /api/v1/cost/budgets/:id | Budget detail with items |
| PUT | /api/v1/cost/budgets/:id | Update budget |
| GET | /api/v1/cost/evm | Current EVM metrics |
| GET | /api/v1/cost/evm/history | EVM trend over time |
| GET | /api/v1/cost/s-curve | S-curve data (PV/EV/AC) |
| POST | /api/v1/cost/records | Record cost entry |
| GET | /api/v1/cost/forecast | EAC/ETC forecast |
| GET | /api/v1/cost/cashflow | Cash flow projection |
| GET | /api/v1/cost/copq | COPQ from QualityGate |
| GET | /api/v1/cost/stats | CPI, SPI, budget health |

## Database Schema

**Schema name:** `cost`

| Table | Key Columns |
|-------|-------------|
| budgets | UUID, project_id, name, total_amount, currency, status (draft/approved/active/closed), approved_by, version |
| budget_items | UUID, budget_id, wbs_code, description, trade_id, planned_amount, committed_amount, actual_amount, category (labor/material/equipment/subcontract/overhead) |
| cost_records | UUID, project_id, budget_item_id, amount, type (commitment/actual/forecast), date, description, invoice_ref, vendor, approved_by |
| evm_snapshots | UUID, project_id, snapshot_date, pv, ev, ac, cv, sv, cpi, spi, eac, etc, vac, tcpi, data_source (manual/calculated) |
| payment_applications | UUID, project_id, period_start, period_end, gross_amount, retention_pct, retention_amount, net_amount, status (draft/submitted/approved/paid) |

## Key Metrics
- CPI (Cost Performance Index)
- SPI (Schedule Performance Index)
- EAC (Estimate at Completion)
- Budget variance %
- Cash flow accuracy
- COPQ as % of budget

## Environment Variables
```env
PORT=3011
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
QUALITY_SERVICE_URL=http://localhost:3009
PROGRESS_SERVICE_URL=http://localhost:3005
```

## Cross-Module Integration
- **TaktFlow:** Schedule progress feeds Earned Value (EV) calculation
- **QualityGate:** NCR cost impact aggregated as COPQ
- **CrewFlow:** Crew overtime and labor costs feed into labor cost actuals
- **SupplyChain:** PO amounts feed into committed costs
- **ClaimShield:** Change order values trigger budget adjustments
- **Hub:** Cost health (CPI, SPI, budget variance) feeds Project Health Score

## Development
```bash
cd services/cost-service && npm install && npm run dev
```
