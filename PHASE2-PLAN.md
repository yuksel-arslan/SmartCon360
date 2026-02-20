# SmartCon360 — Phase 2 Implementation Plan

## Mevcut Durum

**Tamamlanan:**
- Auth, Project CRUD, LBS, Takt Engine, Flowline, Constraints, Progress
- Frontend shell (sidebar, routing, dark/light theme, 10-step wizard)
- CostPilot modulu (9 tab, tam backend + frontend)
- 5 konsolide servis: core-service, takt-service, ai-service, ops-service, realtime-service

**Referans pattern:** CostPilot (ops-service icinde) — tum yeni moduller ayni pattern'i takip edecek.

**Veritabani:** Prisma (core-service), diger servisler REST ile core-service'e baglanir.

---

## Sprint 0: TaktFlow DB + API Integration (Phase 1 Completion)

> **Oncelik:** Phase 2'ye gecmeden once TaktFlow'un temelini saglam yapmak.
> Tum in-memory store'lar PostgreSQL'e, tum mock data'lar gercek API'lere baglanacak.

### 0A. Prisma Schema — TaktFlow Modelleri

Mevcut schema'ya (core-service/prisma/schema.prisma) eklenmesi gereken modeller:

```prisma
// TAKT PLAN
model TaktPlan {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId   String   @map("project_id") @db.Uuid
  name        String   @db.VarChar(255)
  version     Int      @default(1)
  status      String   @default("draft") @db.VarChar(20)  // draft | active | archived
  taktTime    Int      @map("takt_time")                   // days per takt period
  startDate   DateTime @map("start_date") @db.Date
  endDate     DateTime? @map("end_date") @db.Date
  bufferType  String   @default("time") @map("buffer_type") @db.VarChar(20)
  bufferSize  Int      @default(0) @map("buffer_size")
  generatedBy String   @default("manual") @map("generated_by") @db.VarChar(20)
  totalPeriods Int?    @map("total_periods")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at")

  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  zones       TaktZone[]
  wagons      TaktWagon[]
  assignments TaktAssignment[]

  @@index([projectId])
  @@map("takt_plans")
  @@schema("public")
}

// TAKT ZONE (plan-specific zone mapping)
model TaktZone {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  planId    String @map("plan_id") @db.Uuid
  locationId String? @map("location_id") @db.Uuid  // links to Location model
  name      String @db.VarChar(255)
  code      String @db.VarChar(50)
  sequence  Int

  plan        TaktPlan         @relation(fields: [planId], references: [id], onDelete: Cascade)
  assignments TaktAssignment[]

  @@unique([planId, sequence])
  @@index([planId])
  @@map("takt_zones")
  @@schema("public")
}

// TAKT WAGON (trade in a plan, with sequence)
model TaktWagon {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  planId       String @map("plan_id") @db.Uuid
  tradeId      String @map("trade_id") @db.Uuid  // links to Trade model
  sequence     Int
  durationDays Int    @map("duration_days")
  bufferAfter  Int    @default(0) @map("buffer_after")
  crewSize     Int?   @map("crew_size")

  plan        TaktPlan         @relation(fields: [planId], references: [id], onDelete: Cascade)
  assignments TaktAssignment[]

  @@unique([planId, sequence])
  @@index([planId])
  @@map("takt_wagons")
  @@schema("public")
}

// TAKT ASSIGNMENT (zone x wagon intersection)
model TaktAssignment {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  planId        String    @map("plan_id") @db.Uuid
  zoneId        String    @map("zone_id") @db.Uuid
  wagonId       String    @map("wagon_id") @db.Uuid
  periodNumber  Int       @map("period_number")
  plannedStart  DateTime  @map("planned_start") @db.Date
  plannedEnd    DateTime  @map("planned_end") @db.Date
  actualStart   DateTime? @map("actual_start") @db.Date
  actualEnd     DateTime? @map("actual_end") @db.Date
  status        String    @default("planned") @db.VarChar(20)  // planned | in_progress | completed | delayed
  progressPct   Float     @default(0) @map("progress_pct")
  notes         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @default(now()) @updatedAt @map("updated_at")

  plan   TaktPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  zone   TaktZone @relation(fields: [zoneId], references: [id], onDelete: Cascade)
  wagon  TaktWagon @relation(fields: [wagonId], references: [id], onDelete: Cascade)

  @@unique([planId, zoneId, wagonId])
  @@index([planId])
  @@index([zoneId])
  @@index([wagonId])
  @@map("takt_assignments")
  @@schema("public")
}

// CONSTRAINT (replace in-memory store)
model Constraint {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  projectId    String    @map("project_id") @db.Uuid
  title        String    @db.VarChar(255)
  description  String?
  category     String    @db.VarChar(20)  // design|material|equipment|labor|space|predecessor|permit|information
  status       String    @default("open") @db.VarChar(20)  // open|in_progress|resolved|cancelled
  priority     String    @default("medium") @db.VarChar(10)  // critical|high|medium|low
  zoneId       String?   @map("zone_id") @db.Uuid
  tradeId      String?   @map("trade_id") @db.Uuid
  assignedTo   String?   @map("assigned_to") @db.Uuid
  dueDate      DateTime? @map("due_date") @db.Date
  resolvedDate DateTime? @map("resolved_date") @db.Date
  resolvedBy   String?   @map("resolved_by") @db.Uuid
  resolutionNotes String? @map("resolution_notes")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @default(now()) @updatedAt @map("updated_at")

  @@index([projectId])
  @@index([status])
  @@index([category])
  @@index([dueDate])
  @@map("constraints")
  @@schema("public")
}
```

### 0B. Backend — In-Memory → Prisma Migration

**Degisecek dosyalar:**

| Dosya | Degisiklik |
|-------|-----------|
| `core-service/prisma/schema.prisma` | TaktPlan, TaktZone, TaktWagon, TaktAssignment, Constraint modelleri ekle |
| `core-service/src/modules/constraint/store.ts` | Map → Prisma client |
| `core-service/src/modules/constraint/routes/constraints.ts` | store import → prisma queries |
| `core-service/src/modules/progress/store.ts` | Map → Prisma client (WeeklyCommitment, PPCRecord, DailyLog zaten schema'da var) |
| `core-service/src/modules/progress/routes/commitments.ts` | store import → prisma queries |
| `core-service/src/modules/progress/routes/ppc.ts` | store import → prisma queries |
| `core-service/src/modules/progress/routes/daily-log.ts` | store import → prisma queries |
| `core-service/src/modules/progress/routes/progress.ts` | store import → prisma queries |

**Yeni routes eklenmesi gereken:**

| Route | Amac |
|-------|------|
| `POST /api/v1/projects/:id/takt-plans` | Takt plan olustur (takt-engine'den hesapla, DB'ye kaydet) |
| `GET /api/v1/projects/:id/takt-plans` | Projenin takt planlarini listele |
| `GET /api/v1/projects/:id/takt-plans/:planId` | Plan detay (zones, wagons, assignments dahil) |
| `PUT /api/v1/projects/:id/takt-plans/:planId` | Plan guncelle (takt editor save) |
| `PATCH /api/v1/takt-assignments/:id` | Assignment status/progress guncelle |
| `GET /api/v1/projects/:id/flowline/:planId` | Flowline verisini DB'den cek |

### 0C. Takt-Service (Python) Entegrasyonu

Takt-service'in `plans_db` (in-memory dict) kaldirilacak. Iki opsiyon:

**Opsiyon A (Tercih edilen):** core-service Node.js takt plan CRUD'u yapar, hesaplama icin takt-service Python API'sini cagirir.
- core-service → `POST http://takt-service:8001/takt/compute` (hesaplama)
- core-service DB'ye yazar
- Frontend → core-service API

**Opsiyon B:** takt-service dogrudan PostgreSQL'e baglanir (SQLAlchemy).
- Daha karmasik, iki servis ayni DB'ye erisir

→ **Opsiyon A** ile gidecegiz: core-service orchestrator, takt-service saf hesaplama motoru.

### 0D. Frontend — Mock Data → Real API

**Degisecek dosyalar:**

| Dosya | Degisiklik |
|-------|-----------|
| `frontend/src/app/(dashboard)/takt-editor/page.tsx` | `handleSave()` fake delay → `POST/PUT /api/v1/projects/:id/takt-plans/:planId` |
| `frontend/src/app/(dashboard)/takt-editor/page.tsx` | Sayfa yuklenirken `GET /api/v1/projects/:id/takt-plans/:planId` ile gercek veri |
| `frontend/src/app/(dashboard)/flowline/page.tsx` | `DEMO_FLOWLINE` → `GET /api/v1/projects/:id/flowline/:planId` |
| `frontend/src/app/(dashboard)/flowline/page.tsx` | Fake WebSocket → gercek Socket.io (veya polling baslangiçta) |
| `frontend/src/app/(dashboard)/lps/page.tsx` | Mock data → `GET/POST /api/v1/progress/commitments` |
| `frontend/src/app/(dashboard)/lps/page.tsx` | PPC mock → `GET /api/v1/progress/ppc/*` |
| `frontend/src/app/(dashboard)/constraints/page.tsx` | `DEMO_CONSTRAINTS` fallback → gercek API only |
| `frontend/src/app/(dashboard)/simulation/page.tsx` | Mock fallback → `POST /api/v1/simulate/*` (takt-service) |
| `frontend/src/app/(dashboard)/dashboard/page.tsx` | Static KPI → gercek proje verisinden hesaplanan KPI'lar |
| `frontend/src/lib/mockData.ts` | Dosya kaldirilacak (veya sadece dev seed icin tutulacak) |
| `frontend/src/lib/stores/progress-store.ts` | `initDemoData()` → API fetch |
| `frontend/src/lib/stores/takt-plans.ts` | In-memory `plansDb` → API fetch |

### 0E. Simulation API Expose

Takt-service'deki simulation engine'i REST endpoint'leri ile acmak:

| Endpoint | Amac |
|----------|------|
| `POST /simulate/what-if` | What-if scenario calistir |
| `POST /simulate/monte-carlo` | Monte Carlo simulasyonu |
| `POST /simulate/compare` | Senaryo karsilastir |

### 0F. Constraint Frontend Sayfasi

Simdi sadece backend routes var, UI yok. Constraint management sayfasi:
- Constraint List (filter by category, status, priority)
- Create/Edit Constraint form
- Constraint Stats dashboard
- CRR (Constraint Removal Rate) chart

---

### Sprint 0 Adim Sirasi

```
1. Prisma schema guncelle (TaktPlan, TaktZone, TaktWagon, TaktAssignment, Constraint)
2. Migration olustur ve calistir
3. Constraint store.ts → Prisma'ya gecir
4. Progress store.ts → Prisma'ya gecir (commitments, ppc, daily-log)
5. Takt plan CRUD routes ekle (core-service)
6. Takt-service'i saf compute API'sine donustur (plans_db kaldir)
7. Simulation API endpointlerini ac (takt-service)
8. Frontend takt-editor → gercek save API
9. Frontend flowline → gercek data API
10. Frontend LPS → gercek commitments/ppc API
11. Frontend constraints sayfasi olustur
12. Frontend simulation → gercek simulate API
13. Frontend dashboard → gercek KPI API
14. mockData.ts temizle
```

---

## Sprint Plani (8 Sprint)

### Sprint 1: QualityGate (NCR, Checklist, FTR)

**Backend (ops-service icine eklenir):**
- Prisma modelleri: Inspection, NCR, Checklist, ChecklistItem, QualityMetric
- CRUD routes: `/api/v1/projects/:id/quality/*`
- Endpointler: inspections, ncr, checklists, quality-metrics
- FTR (First Time Right) hesaplama logic'i
- COPQ (Cost of Poor Quality) tracking

**Frontend (`/quality/` altinda):**
- Quality Dashboard (FTR rate, open NCR count, inspection stats)
- NCR List + Create/Edit form
- Inspection Checklists + template olusturma
- Inspection Results tablosu
- Quality Metrics & trends grafikleri

---

### Sprint 2: SafeZone (OHS, Incident Reporting, PTW)

**Backend (ops-service):**
- Prisma modelleri: SafetyIncident, RiskAssessment, PermitToWork, ToolboxTalk, JSA
- Routes: `/api/v1/projects/:id/safety/*`
- OHS risk matrix hesaplama (likelihood x severity)
- LTIR (Lost Time Injury Rate) hesaplama
- Incident workflow (report → investigate → close)

**Frontend (`/safety/` altinda):**
- Safety Dashboard (LTIR, open incidents, PTW status)
- Incident List + Report form
- Risk Matrix (5x5 grid gorunumu)
- Permit to Work management
- Toolbox Talk kayitlari
- JSA (Job Safety Analysis) formlari

---

### Sprint 3: RiskRadar (Risk Register, Heat Map)

**Backend (ops-service):**
- Prisma modelleri: Risk, RiskCategory, RiskMitigation, RiskHistory
- Routes: `/api/v1/projects/:id/risks/*`
- Risk scoring (probability x impact)
- Mitigation tracking
- Risk trend analysis

**Frontend (`/risk/` altinda):**
- Risk Dashboard (top risks, trend)
- Risk Register tablosu (CRUD)
- Heat Map (probability x impact matrix)
- Risk Mitigation tracking
- Risk History & trend grafikleri

---

### Sprint 4: CommHub + ClaimShield

**CommHub Backend (ops-service):**
- Prisma modelleri: RFI, Transmittal, MeetingMinutes, Correspondence
- Routes: `/api/v1/projects/:id/communication/*`
- Escalation engine (overdue RFI → auto notify)
- Status workflow (open → in review → answered → closed)

**CommHub Frontend (`/communication/` altinda):**
- Communication Dashboard (open RFI, pending transmittals)
- RFI List + Create/Detail
- Transmittal Log
- Meeting Minutes

**ClaimShield Backend (ops-service):**
- Prisma modelleri: ChangeOrder, Claim, DelayEvent, ClaimDocument
- Routes: `/api/v1/projects/:id/claims/*`
- Change order workflow (draft → submitted → approved/rejected)
- Delay analysis (concurrent delay detection)

**ClaimShield Frontend (`/claims/` altinda):**
- Claims Dashboard (pending CO value, open claims)
- Change Order List + Create/Edit
- Claims Register
- Delay Events Log

---

### Sprint 5: SupplyChain + StakeHub

**SupplyChain Backend (ops-service):**
- Prisma modelleri: Supplier, PurchaseOrder, MaterialRequirement, Delivery
- Routes: `/api/v1/projects/:id/supply/*`
- MRP (Material Requirements Planning) hesaplama
- JIT delivery tracking
- Supplier performance scoring

**SupplyChain Frontend (`/supply/` altinda):**
- Supply Dashboard (pending orders, delivery status)
- Supplier Directory
- Purchase Order management
- Material Requirements List
- Delivery Tracking

**StakeHub Backend (ops-service):**
- Prisma modelleri: Stakeholder, EngagementLog, AuthorityMatrix, StakeholderReport
- Routes: `/api/v1/projects/:id/stakeholders/*`
- Influence/Interest matrix
- Engagement tracking

**StakeHub Frontend (`/stakeholders/` altinda):**
- Stakeholder Dashboard
- Stakeholder Register (CRUD)
- Authority/Interest Matrix (gorsel)
- Engagement Log

---

### Sprint 6: GreenSite (ESG, Carbon, LEED)

**Backend (ops-service):**
- Prisma modelleri: CarbonEntry, WasteRecord, EnergyUsage, SustainabilityTarget, LEEDCredit
- Routes: `/api/v1/projects/:id/sustainability/*`
- Carbon footprint hesaplama
- Waste diversion rate tracking
- LEED/BREEAM credit checklist

**Frontend (`/sustainability/` altinda):**
- ESG Dashboard (carbon total, waste diversion %, energy use)
- Carbon Tracking (entry + trend)
- Waste Management log
- Energy Usage tracking
- LEED/BREEAM Credit tracker

---

### Sprint 7: Hub + Dashboard + Cross-Module Integration

**Hub Backend (ops-service veya ayri hub logic):**
- Project Health Score hesaplama (tum modullerin KPI'larindan)
  - Schedule Performance (TaktFlow PPC, SPI)
  - Cost Performance (CostPilot CPI)
  - Quality Score (QualityGate FTR)
  - Safety Score (SafeZone LTIR)
  - Risk Level (RiskRadar weighted score)
- Cross-module event pipeline
- Module licensing middleware

**Dashboard guncelleme:**
- Gercek proje verilerine baglama (Hotel Sapphire Istanbul)
- Project Health Score widget
- Her modülden ozet KPI karti
- Cross-module alerts (ornek: kalite sorunu → risk artisi)
- Quick-action linkler (her modüle)

---

### Sprint 8: LPS + Flowline + Takt Editor

**Last Planner System:**
- Phase Planning sayfasi
- 6-hafta Lookahead gorünümü
- Weekly Work Plan (commitment + tracking)
- PPC (Percent Plan Complete) hesaplama ve trend
- Variance Analysis + root cause

**Flowline Enhancement:**
- Interaktif flowline chart (zoom, pan, hover detail)
- Gercek progress overlay (planned vs actual)
- Trade stacking uyarisi (gorsel)
- Buffer goruntuleme

**Takt Editor:**
- Drag & drop trade siralama
- Zone-trade matris editoru
- Takt time ayarlama per trade per zone
- Template'den plan olusturma (wizard'daki veri ile)

---

## Her Sprint Icin Standart Checklist

1. Prisma schema guncelle + migration
2. Backend routes + controllers + validation (Zod)
3. Frontend sayfalar + componentler
4. Dark/light mode desteegi
5. Sidebar navigation guncelle
6. API response format: `{ data, meta, error }`
7. Module licensing middleware check
8. Temel unit testler

---

## Oncelik Sirasi

```
Sprint 0: TaktFlow DB+API ← ONCE BU! Phase 1 tamamlanmali
Sprint 1: QualityGate     ← Ilk yeni modul (safety-critical)
Sprint 2: SafeZone        ← OHS zorunlu
Sprint 3: RiskRadar       ← Risk yonetimi
Sprint 4: CommHub + Claim ← Iletisim + degisiklik yonetimi
Sprint 5: Supply + Stake  ← Tedarik + paydas
Sprint 6: GreenSite       ← ESG
Sprint 7: Hub + Dashboard ← Tum modulleri birlestir
Sprint 8: LPS + Flowline  ← Planlama cekirdegi canlandir
```

## Baslatma

Sprint 0 (TaktFlow DB + API) ile baslanacak. Onay verildiginde implementation'a gecilecek.
