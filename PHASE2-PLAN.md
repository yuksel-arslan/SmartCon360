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
Sprint 1: QualityGate     ← Ilk implement (safety-critical)
Sprint 2: SafeZone        ← OHS zorunlu
Sprint 3: RiskRadar       ← Risk yonetimi
Sprint 4: CommHub + Claim ← Iletisim + degisiklik yonetimi
Sprint 5: Supply + Stake  ← Tedarik + paydas
Sprint 6: GreenSite       ← ESG
Sprint 7: Hub + Dashboard ← Tum modulleri birlestir
Sprint 8: LPS + Flowline  ← Planlama cekirdegi canlandir
```

## Baslatma

Sprint 1 (QualityGate) ile baslamaya hazir. Onay verildiginde implementation'a gecilecek.
