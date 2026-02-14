# COST-SERVICE — CostPilot

## Overview

Full-spectrum cost management service for SmartCon360. Covers the **complete cost lifecycle** from quantity takeoff (metraj) through unit price analysis, cost estimation (kesif), budgeting, progress-based payment certificates (hakedis), and Earned Value Management (EVM).

**Module:** CostPilot
**Port:** 3011
**Tech:** Node.js 22 / Express / Prisma
**Layer:** 1 (Layer 2 for AI cost prediction via Gemini)
**Status:** Phase 2 — Active Development

## Cost Lifecycle

```
Cizim/BIM ─→ Metraj ─→ BOQ ─→ Birim Fiyat ─→ Kesif ─→ Butce
(optional)   (qty)    (items)  (unit price)   (est.)   (approved)
                                                          │
Imalat ─→ Imalat Metraji ─→ Hakedis ─→ EVM ─→ S-Curve ─→ Forecast
(field)   (measured qty)    (payment)   (PV/EV/AC)
```

**BIM is optional.** Quantity takeoff works at 3 levels:
1. **Manual entry** — direct quantity input with calculation formulas
2. **Spreadsheet import** — Excel/CSV BOQ import
3. **BIM extraction** — automated from IFC model (Phase 3, when BIM available)

## Tech Stack
- **Runtime:** Node.js 22+
- **Framework:** Express.js 4.x
- **Language:** TypeScript 5.x (strict)
- **ORM:** Prisma (PostgreSQL)
- **Validation:** Zod

## Schema: `cost`

## Service Architecture

```
cost-service/
├── src/
│   ├── index.ts                 # Express app entry
│   ├── routes/
│   │   ├── work-items.ts        # Is kalemleri / pozlar
│   │   ├── unit-prices.ts       # Birim fiyat analizi
│   │   ├── quantity-takeoff.ts  # Metraj cetveli
│   │   ├── estimates.ts         # Kesif / yaklasik maliyet
│   │   ├── budgets.ts           # Butce yonetimi
│   │   ├── payment-certs.ts     # Hakedis
│   │   ├── evm.ts               # Earned Value Management
│   │   └── cashflow.ts          # Nakit akisi
│   ├── services/
│   │   ├── work-item.service.ts
│   │   ├── unit-price.service.ts
│   │   ├── quantity.service.ts
│   │   ├── estimate.service.ts
│   │   ├── budget.service.ts
│   │   ├── payment.service.ts
│   │   ├── evm.service.ts
│   │   └── cashflow.service.ts
│   ├── schemas/                 # Zod validation schemas
│   └── utils/
│       ├── evm-calculator.ts    # EVM formulas
│       └── price-escalation.ts  # Fiyat farki hesaplama
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── COST-SERVICE.md
```

## API Endpoints

### Work Items (Is Kalemleri / Pozlar)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/work-items | List work items (filterable by category, trade) |
| POST | /api/v1/cost/work-items | Create work item |
| GET | /api/v1/cost/work-items/:id | Work item detail with unit price |
| PUT | /api/v1/cost/work-items/:id | Update work item |
| DELETE | /api/v1/cost/work-items/:id | Delete work item |
| POST | /api/v1/cost/work-items/import | Import from Excel/CSV |
| GET | /api/v1/cost/work-items/templates | Standard poz templates (Bayindirlik, etc.) |

### Unit Price Analysis (Birim Fiyat Analizi)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/unit-prices | List unit price analyses |
| POST | /api/v1/cost/unit-prices | Create unit price analysis |
| GET | /api/v1/cost/unit-prices/:id | Analysis detail with resource breakdown |
| PUT | /api/v1/cost/unit-prices/:id | Update analysis |
| POST | /api/v1/cost/unit-prices/:id/resources | Add resource to analysis (labor/material/equipment) |
| PUT | /api/v1/cost/unit-prices/:id/resources/:rid | Update resource in analysis |
| DELETE | /api/v1/cost/unit-prices/:id/resources/:rid | Remove resource from analysis |
| POST | /api/v1/cost/unit-prices/recalculate | Recalculate all prices with new rates |

### Quantity Takeoff (Metraj)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/quantities | List quantity takeoffs (by project, location, trade) |
| POST | /api/v1/cost/quantities | Create quantity entry |
| PUT | /api/v1/cost/quantities/:id | Update quantity |
| DELETE | /api/v1/cost/quantities/:id | Delete quantity entry |
| POST | /api/v1/cost/quantities/import | Import metraj from Excel/CSV |
| GET | /api/v1/cost/quantities/summary | Summary by work item / location |
| GET | /api/v1/cost/quantities/by-location/:locationId | Quantities for a specific location |

### Estimates (Kesif / Yaklasik Maliyet)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/estimates | List estimates |
| POST | /api/v1/cost/estimates | Create estimate |
| GET | /api/v1/cost/estimates/:id | Estimate detail with all items |
| PUT | /api/v1/cost/estimates/:id | Update estimate |
| POST | /api/v1/cost/estimates/:id/generate | Auto-generate from metraj + unit prices |
| POST | /api/v1/cost/estimates/:id/approve | Approve estimate → create budget |
| GET | /api/v1/cost/estimates/:id/compare/:otherId | Compare two estimates |

### Budgets (Butce)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/budgets | List budgets |
| POST | /api/v1/cost/budgets | Create budget |
| GET | /api/v1/cost/budgets/:id | Budget detail with items |
| PUT | /api/v1/cost/budgets/:id | Update budget |
| POST | /api/v1/cost/budgets/:id/approve | Approve budget |
| GET | /api/v1/cost/budgets/:id/variance | Budget vs actual variance |

### Payment Certificates (Hakedis)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/payments | List payment certificates |
| POST | /api/v1/cost/payments | Create new hakedis period |
| GET | /api/v1/cost/payments/:id | Hakedis detail with imalat metraji |
| PUT | /api/v1/cost/payments/:id | Update hakedis |
| POST | /api/v1/cost/payments/:id/items | Add imalat metraji to hakedis |
| PUT | /api/v1/cost/payments/:id/items/:itemId | Update imalat quantity |
| POST | /api/v1/cost/payments/:id/submit | Submit for approval |
| POST | /api/v1/cost/payments/:id/approve | Approve hakedis |
| GET | /api/v1/cost/payments/:id/report | Generate hakedis raporu (PDF) |
| GET | /api/v1/cost/payments/summary | Cumulative payment summary |

### EVM (Earned Value Management)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/evm | Current EVM metrics (CPI, SPI, EAC, etc.) |
| GET | /api/v1/cost/evm/history | EVM trend over time |
| GET | /api/v1/cost/s-curve | S-curve data (PV/EV/AC over time) |
| POST | /api/v1/cost/evm/snapshot | Take EVM snapshot |
| GET | /api/v1/cost/forecast | EAC/ETC forecast with trends |

### Cash Flow & Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/cost/cashflow | Cash flow projection |
| POST | /api/v1/cost/records | Record cost entry |
| GET | /api/v1/cost/copq | COPQ from QualityGate |
| GET | /api/v1/cost/stats | Dashboard KPIs |

## Database Schema

### work_items (Is Kalemleri / Pozlar)
```sql
CREATE TABLE cost.work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    code VARCHAR(30) NOT NULL,              -- "04.606/2A", "IMO-001", custom code
    name VARCHAR(500) NOT NULL,             -- "250 dozlu beton dökümü"
    description TEXT,
    unit VARCHAR(20) NOT NULL,              -- m3, m2, kg, adet, mt, ton, lt, set

    category VARCHAR(50) NOT NULL,          -- insaat, mekanik, elektrik, altyapi, peyzaj, idari
    subcategory VARCHAR(100),               -- kaba_yapi, ince_yapi, tesisat, etc.
    trade_id UUID REFERENCES project.trades(id),

    -- Poz source
    source VARCHAR(30) DEFAULT 'custom',    -- bayindirlik, custom, imported
    source_year INTEGER,                    -- 2026 (rayiç yılı)

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, code)
);
```

### unit_price_analyses (Birim Fiyat Analizi)
```sql
CREATE TABLE cost.unit_price_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id) ON DELETE CASCADE,

    version INTEGER DEFAULT 1,
    analysis_date DATE DEFAULT CURRENT_DATE,

    -- Calculated totals
    labor_cost DECIMAL(15, 4) DEFAULT 0,        -- Toplam işçilik
    material_cost DECIMAL(15, 4) DEFAULT 0,     -- Toplam malzeme
    equipment_cost DECIMAL(15, 4) DEFAULT 0,    -- Toplam makine
    subtotal DECIMAL(15, 4) DEFAULT 0,          -- İşçilik + Malzeme + Makine

    overhead_pct DECIMAL(5, 2) DEFAULT 0,       -- Genel gider %
    profit_pct DECIMAL(5, 2) DEFAULT 0,         -- Müteahhit kârı %
    overhead_amount DECIMAL(15, 4) DEFAULT 0,
    profit_amount DECIMAL(15, 4) DEFAULT 0,

    unit_price DECIMAL(15, 4) NOT NULL,         -- Final birim fiyat
    currency VARCHAR(3) DEFAULT 'TRY',

    -- Source
    source VARCHAR(30) DEFAULT 'manual',        -- manual, bayindirlik, imported
    notes TEXT,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### unit_price_resources (Analiz Kaynaklari - Iscilik/Malzeme/Makine)
```sql
CREATE TABLE cost.unit_price_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES cost.unit_price_analyses(id) ON DELETE CASCADE,

    resource_type VARCHAR(20) NOT NULL,         -- labor, material, equipment

    code VARCHAR(30),                           -- Rayiç no: "01.501", "04.031/1"
    name VARCHAR(500) NOT NULL,                 -- "Düz işçi", "Portland çimento", "Beton mikseri"
    unit VARCHAR(20) NOT NULL,                  -- saat, kg, m3, adet, sefer

    quantity DECIMAL(15, 6) NOT NULL,           -- Miktar (birim iş kalemi başına)
    unit_rate DECIMAL(15, 4) NOT NULL,          -- Birim rayiç
    total DECIMAL(15, 4) NOT NULL,              -- quantity × unit_rate

    -- Rayiç kaynağı
    rate_source VARCHAR(30) DEFAULT 'manual',   -- manual, bayindirlik, market, supplier_quote
    rate_date DATE,

    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### quantity_takeoffs (Metraj Cetveli)
```sql
CREATE TABLE cost.quantity_takeoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),   -- LBS bağlantısı (bina/kat/zone)

    -- Metraj
    quantity DECIMAL(15, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,

    -- Hesap detayı
    calculation_formula TEXT,                    -- "12.50 x 4.20 x 0.30 = 15.75"
    dimensions JSONB,                           -- {"length": 12.5, "width": 4.2, "height": 0.3, "count": 1, "deduction": 0}

    -- Kaynak
    source VARCHAR(30) DEFAULT 'manual',        -- manual, bim, drawing, spreadsheet
    drawing_ref VARCHAR(100),                   -- Pafta no: "A-101", "S-203"
    bim_element_id VARCHAR(100),                -- IFC GUID (BIM varsa)

    -- Revizyon
    revision INTEGER DEFAULT 1,
    revision_reason TEXT,

    notes TEXT,
    measured_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### estimates (Kesif / Yaklasik Maliyet)
```sql
CREATE TABLE cost.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,                 -- "Yaklaşık Maliyet v3", "İhale Teklifi"
    type VARCHAR(30) NOT NULL,                  -- yaklasik_maliyet, ihale_teklif, revize_kesif, ek_kesif

    total_amount DECIMAL(18, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'TRY',

    -- KDV
    vat_pct DECIMAL(5, 2) DEFAULT 20,
    vat_amount DECIMAL(18, 2) DEFAULT 0,
    grand_total DECIMAL(18, 2) DEFAULT 0,       -- total + vat

    status VARCHAR(20) DEFAULT 'draft',         -- draft, submitted, approved, superseded

    approved_by UUID REFERENCES auth.users(id),
    approved_date DATE,
    version INTEGER DEFAULT 1,
    parent_estimate_id UUID REFERENCES cost.estimates(id),

    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### estimate_items (Kesif Kalemleri)
```sql
CREATE TABLE cost.estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES cost.estimates(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),

    quantity DECIMAL(15, 4) NOT NULL,            -- Metrajdan gelen miktar
    unit_price DECIMAL(15, 4) NOT NULL,          -- Birim fiyat analizinden
    total_price DECIMAL(18, 2) NOT NULL,         -- quantity × unit_price

    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### budgets (Butce)
```sql
CREATE TABLE cost.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    estimate_id UUID REFERENCES cost.estimates(id),  -- Keşiften oluşturulan bütçe

    name VARCHAR(255) NOT NULL,
    total_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',

    status VARCHAR(20) DEFAULT 'draft',         -- draft, approved, active, closed
    approved_by UUID REFERENCES auth.users(id),
    version INTEGER DEFAULT 1,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### budget_items (Butce Kalemleri)
```sql
CREATE TABLE cost.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES cost.budgets(id) ON DELETE CASCADE,
    work_item_id UUID REFERENCES cost.work_items(id),

    wbs_code VARCHAR(30),
    description VARCHAR(500) NOT NULL,
    trade_id UUID REFERENCES project.trades(id),

    planned_amount DECIMAL(18, 2) NOT NULL,
    committed_amount DECIMAL(18, 2) DEFAULT 0,
    actual_amount DECIMAL(18, 2) DEFAULT 0,

    category VARCHAR(30) NOT NULL,              -- labor, material, equipment, subcontract, overhead

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### payment_certificates (Hakedis)
```sql
CREATE TABLE cost.payment_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    budget_id UUID REFERENCES cost.budgets(id),

    period_number INTEGER NOT NULL,             -- 1, 2, 3... (hakediş no)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Tutarlar
    gross_amount DECIMAL(18, 2) DEFAULT 0,          -- Brüt toplam

    -- Kesintiler
    retention_pct DECIMAL(5, 2) DEFAULT 0,          -- Teminat kesintisi %
    retention_amount DECIMAL(18, 2) DEFAULT 0,
    advance_deduction DECIMAL(18, 2) DEFAULT 0,     -- Avans kesintisi
    other_deductions DECIMAL(18, 2) DEFAULT 0,      -- Diğer kesintiler
    deduction_notes TEXT,

    -- Fiyat farkı
    price_escalation DECIMAL(18, 2) DEFAULT 0,      -- Fiyat farkı (+/-)
    escalation_index VARCHAR(50),                    -- TÜİK endeksi referansı
    escalation_formula TEXT,                         -- Fiyat farkı formülü

    -- KDV
    vat_pct DECIMAL(5, 2) DEFAULT 20,
    vat_amount DECIMAL(18, 2) DEFAULT 0,

    net_amount DECIMAL(18, 2) DEFAULT 0,            -- Ödenecek tutar
    cumulative_amount DECIMAL(18, 2) DEFAULT 0,     -- Kümülatif toplam

    status VARCHAR(20) DEFAULT 'draft',             -- draft, submitted, reviewed, approved, paid
    submitted_date DATE,
    approved_by UUID REFERENCES auth.users(id),
    approved_date DATE,
    payment_date DATE,

    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(project_id, period_number)
);
```

### payment_items (Hakedis Kalemleri / Imalat Metraji)
```sql
CREATE TABLE cost.payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES cost.payment_certificates(id) ON DELETE CASCADE,
    work_item_id UUID NOT NULL REFERENCES cost.work_items(id),

    location_id UUID REFERENCES project.locations(id),

    -- Metraj
    contract_qty DECIMAL(15, 4) NOT NULL,           -- Sözleşme metrajı
    previous_qty DECIMAL(15, 4) DEFAULT 0,          -- Önceki hakediş toplam
    current_qty DECIMAL(15, 4) DEFAULT 0,           -- Bu dönem imalat
    cumulative_qty DECIMAL(15, 4) DEFAULT 0,        -- Toplam imalat (previous + current)

    -- Birim fiyat
    unit_price DECIMAL(15, 4) NOT NULL,

    -- Tutarlar
    current_amount DECIMAL(18, 2) DEFAULT 0,        -- current_qty × unit_price
    cumulative_amount DECIMAL(18, 2) DEFAULT 0,     -- cumulative_qty × unit_price

    -- Yüzde
    completion_pct DECIMAL(5, 2) DEFAULT 0,         -- cumulative_qty / contract_qty × 100

    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### evm_snapshots (EVM Kayitlari)
```sql
CREATE TABLE cost.evm_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,

    snapshot_date DATE NOT NULL,

    -- Core EVM
    pv DECIMAL(18, 2) NOT NULL,                     -- Planned Value
    ev DECIMAL(18, 2) NOT NULL,                     -- Earned Value (hakediş bazlı)
    ac DECIMAL(18, 2) NOT NULL,                     -- Actual Cost

    -- Variances
    cv DECIMAL(18, 2),                              -- Cost Variance (EV - AC)
    sv DECIMAL(18, 2),                              -- Schedule Variance (EV - PV)

    -- Indices
    cpi DECIMAL(8, 4),                              -- Cost Performance Index (EV / AC)
    spi DECIMAL(8, 4),                              -- Schedule Performance Index (EV / PV)

    -- Forecasts
    eac DECIMAL(18, 2),                             -- Estimate at Completion
    etc DECIMAL(18, 2),                             -- Estimate to Complete
    vac DECIMAL(18, 2),                             -- Variance at Completion
    tcpi DECIMAL(8, 4),                             -- To-Complete Performance Index

    data_source VARCHAR(20) DEFAULT 'calculated',   -- calculated, manual

    created_at TIMESTAMP DEFAULT NOW()
);
```

### cost_records (Maliyet Kayitlari)
```sql
CREATE TABLE cost.cost_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES cost.budget_items(id),

    amount DECIMAL(18, 2) NOT NULL,
    type VARCHAR(20) NOT NULL,                      -- commitment, actual, forecast
    date DATE NOT NULL,
    description TEXT,
    invoice_ref VARCHAR(100),
    vendor VARCHAR(255),

    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Key Metrics
- CPI (Cost Performance Index)
- SPI (Schedule Performance Index)
- EAC (Estimate at Completion)
- Budget variance %
- Hakedis cumulative vs budget
- Metraj completion % by trade
- COPQ as % of budget

## Environment Variables
```env
PORT=3011
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
QUALITY_SERVICE_URL=http://localhost:3009
PROGRESS_SERVICE_URL=http://localhost:3005
SUPPLY_CHAIN_SERVICE_URL=http://localhost:3013
```

## Cross-Module Integration
- **TaktFlow:** Schedule progress → EV calculation; LBS locations → metraj lokasyonlari
- **QualityGate:** NCR cost impact → COPQ aggregation
- **CrewFlow:** Crew overtime/labor costs → labor cost actuals
- **SupplyChain:** PO amounts → committed costs; material prices → birim fiyat guncelleme
- **ClaimShield:** Change order values → budget adjustments, ek kesif
- **BIM Service:** IFC model → otomatik metraj cikarma (Phase 3, BIM varsa)
- **Hub:** Cost health (CPI, SPI, budget variance) → Project Health Score

## Development
```bash
cd services/cost-service && npm install && npm run dev
```
