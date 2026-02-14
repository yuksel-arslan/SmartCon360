# SUPPLY-CHAIN-SERVICE — SupplyChain AI

## Overview
Manages procurement, material requirements, supplier relationships, and delivery logistics for construction projects within SmartCon360. Provides MRP (Material Requirements Planning) auto-calculated from the takt plan, JIT delivery scheduling, lead time tracking, and AI-powered procurement suggestions.

**Module:** SupplyChain AI
**Port:** 3013
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1 (Layer 2 for AI procurement suggestions via Gemini)
**Status:** Phase 2 — Scaffold

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Port: 3013
## Schema: `supply_chain`

## Responsibilities
- MRP (Material Requirements Planning) auto-calculated from takt plan
- Procurement tracking: RFQ, PO creation, delivery status
- Supplier management with vendor database and performance scoring
- JIT (Just-In-Time) delivery scheduling aligned with takt zone schedule
- Lead time tracking with early warning for late materials
- Inventory management for on-site stock levels
- AI procurement suggestions for optimal order timing based on lead time patterns (Layer 2)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/supply/suppliers | List suppliers |
| POST | /api/v1/supply/suppliers | Add supplier |
| GET | /api/v1/supply/purchase-orders | List purchase orders |
| POST | /api/v1/supply/purchase-orders | Create purchase order |
| PUT | /api/v1/supply/purchase-orders/:id | Update purchase order |
| POST | /api/v1/supply/purchase-orders/:id/receive | Receive delivery |
| GET | /api/v1/supply/mrp | Material requirements |
| POST | /api/v1/supply/mrp/calculate | Calculate MRP from plan |
| GET | /api/v1/supply/deliveries | Delivery schedule |
| GET | /api/v1/supply/inventory | On-site inventory |
| GET | /api/v1/supply/stats | On-time delivery %, shortages |

## Database Schema

**Schema name:** `supply_chain`

| Table | Key Columns |
|-------|-------------|
| suppliers | UUID, name, category, contact_person, email, phone, address, rating (1-5), lead_time_avg_days, payment_terms, status (active/suspended/blacklisted), certifications[] |
| purchase_orders | UUID, project_id, supplier_id, po_number, status (draft/submitted/confirmed/shipped/received/cancelled), items (JSONB), total_amount, currency, order_date, expected_delivery, actual_delivery, delivery_location_id |
| material_requirements | UUID, project_id, trade_id, material_name, specification, unit, required_qty, ordered_qty, received_qty, installed_qty, required_by_date, zone_ids[], status (planned/ordered/in_transit/received/installed/shortage) |
| delivery_schedule | UUID, project_id, po_id, zone_id, planned_date, actual_date, status (scheduled/in_transit/delivered/delayed), notes |

## Key Metrics
- On-time delivery rate %
- Material shortage count
- Supplier performance score
- Lead time variance
- Inventory turnover

## Environment Variables
```env
PORT=3013
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
TAKT_ENGINE_URL=http://localhost:8001
COST_SERVICE_URL=http://localhost:3011
```

## Cross-Module Integration
- **TaktFlow:** Takt plan data feeds MRP auto-calculation
- **CostPilot:** PO amounts feed into committed costs
- **RiskRadar:** Late delivery risk feeds into risk register
- **CommHub:** Delivery alerts trigger supplier notifications
- **TaktFlow constraint:** Material not delivered auto-creates a constraint

## Development
```bash
cd services/supply-chain-service && npm install && npm run dev
```
