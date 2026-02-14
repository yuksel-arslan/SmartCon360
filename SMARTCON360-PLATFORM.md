# SMARTCON360-PLATFORM.md — 13-Module Platform Specification

## Platform Vision

SmartCon360 is a **single unified construction management platform** that replaces the need for 13 separate applications. One login, one sidebar, one data ecosystem — powered by AI.

**Competitive positioning:** Procore-level coverage + AI-first architecture + Lean Construction (Takt/LBMS/LPS) specialization.

```
┌────────────────────────────────────────────────────────────────────────┐
│  Traditional approach:  13 tools × 13 logins × 13 integrations       │
│  SmartCon360 approach:  1 platform × 1 login × native data flow      │
└────────────────────────────────────────────────────────────────────────┘
```

## Module Overview

| # | Module | Brand Name | Service(s) | Port(s) | PMBOK Area |
|---|--------|------------|------------|---------|------------|
| 1 | Planning & Scheduling | **TaktFlow** | takt-engine, ai-planner, flowline, constraint, progress, simulation, bim, drl-engine | 8001-8007, 3003-3005 | Schedule |
| 2 | Quality Control | **QualityGate** | quality-service | 3009 | Quality |
| 3 | OHS / Safety | **SafeZone** | safety-service | 3010 | OHS/HSE |
| 4 | Cost Management | **CostPilot** | cost-service | 3011 | Cost |
| 5 | Resource Management | **CrewFlow** | resource-service | 3006 | Resource |
| 6 | Claims & Change Orders | **ClaimShield** | claims-service | 3012 | Scope |
| 7 | Visual Progress | **VisionAI** | vision-service | 8008 | Integration |
| 8 | Supply Chain | **SupplyChain AI** | supply-chain-service | 3013 | Procurement |
| 9 | Risk Management | **RiskRadar** | risk-service | 3014 | Risk |
| 10 | Communication | **CommHub** | comm-service, notification-service | 3015, 3007 | Communication |
| 11 | Stakeholder Mgmt | **StakeHub** | stakeholder-service | 3016 | Stakeholder |
| 12 | ESG & Environment | **GreenSite** | sustainability-service | 3017 | Environmental |
| 13 | Master Orchestrator | **SmartCon360 Hub** | hub-service, analytics-service, ai-concierge | 3018, 8006, 3008 | Integration |

---

## Module 1: TaktFlow — Planning & Scheduling

**Status:** Phase 1 completed, Phase 2 in progress

### Core Capabilities
- Location Breakdown Structure (LBS) — hierarchical zone definition
- Takt plan computation — algorithmic takt time calculation
- Template-based plan generation (hotel, hospital, residential, etc.)
- Flowline visualization (D3.js) with segment detail drilling
- Constraint management (8 categories)
- Last Planner System (LPS) — lookahead, weekly work plans, PPC
- Progress tracking with PPC calculation
- What-if simulation (Monte Carlo, parameter sweep)
- BIM/IFC integration with Gemini Vision analysis
- DRL-powered adaptive replanning (Layer 3)

### Key Metrics
- PPC (Percent Plan Complete)
- Takt compliance rate
- Buffer consumption
- Trade stacking incidents
- Critical path adherence

### Existing Services
| Service | Port | Layer | Status |
|---------|------|-------|--------|
| takt-engine | 8001 | 1 | Active |
| ai-planner | 8002 | 2 | Active |
| flowline-service | 3003 | 1 | Active |
| constraint-service | 3004 | 1 | Stub |
| progress-service | 3005 | 1 | Active |
| simulation-service | 8003 | 1+3 | Active |
| reporting-service | 8004 | 1+2 | Active |
| bim-service | 8005 | 2 | Stub |
| drl-engine | 8007 | 3 | Stub |

### Frontend Routes
| Route | Page |
|-------|------|
| /dashboard | Unified dashboard (Hub) |
| /flowline | Flowline visualization |
| /takt-editor | Takt grid editor |
| /constraints | Constraint management |
| /lps | Last Planner System |
| /simulation | What-if scenarios |

---

## Module 2: QualityGate — Quality Control

**Service:** quality-service (Port 3009)
**Status:** New — Phase 2

### Core Capabilities
- **Inspection checklists** — template-based, trade-specific
- **NCR (Non-Conformance Reports)** — create, assign, track, close
- **ITP (Inspection & Test Plans)** — pre-defined quality checkpoints per trade
- **Photo documentation** — attach photos to inspections/NCRs
- **FTR (First Time Right)** tracking — quality acceptance metric
- **COPQ (Cost of Poor Quality)** — rework cost aggregation (feeds CostPilot)
- **Punch list management** — deficiency tracking before handover
- **AI quality scoring** — Gemini analyzes photo for defect detection (Layer 2)

### Database Schema (quality schema)
```
inspections          — UUID, project_id, location_id, trade_id, checklist_template_id,
                       inspector_id, status (scheduled/in_progress/passed/failed/na),
                       scheduled_date, completed_date, score, notes, photo_urls[]
checklist_templates  — UUID, name, trade_id, items (JSONB), version
ncr_reports          — UUID, project_id, inspection_id, location_id, trade_id,
                       title, description, severity (minor/major/critical),
                       status (open/in_review/corrective_action/closed/void),
                       root_cause, corrective_action, cost_impact, responsible_party,
                       due_date, closed_date, photo_urls[], attachments[]
punch_items          — UUID, project_id, location_id, trade_id, description,
                       status (open/in_progress/completed/verified), priority,
                       assigned_to, due_date, photo_urls[]
```

### API Endpoints
```
GET    /api/v1/quality/inspections              — List inspections
POST   /api/v1/quality/inspections              — Create inspection
GET    /api/v1/quality/inspections/:id           — Get inspection detail
PUT    /api/v1/quality/inspections/:id           — Update inspection
POST   /api/v1/quality/inspections/:id/complete  — Complete inspection
GET    /api/v1/quality/ncr                       — List NCRs
POST   /api/v1/quality/ncr                       — Create NCR
PUT    /api/v1/quality/ncr/:id                   — Update NCR
POST   /api/v1/quality/ncr/:id/close             — Close NCR
GET    /api/v1/quality/punch-list                — List punch items
POST   /api/v1/quality/punch-list                — Create punch item
GET    /api/v1/quality/stats                     — FTR, COPQ, open NCRs
GET    /api/v1/quality/templates                 — Checklist templates
```

### Key Metrics
- FTR (First Time Right) %
- Open NCR count by severity
- COPQ (Cost of Poor Quality)
- Inspection completion rate
- Average NCR resolution time (days)

### Cross-Module Integration
- **TaktFlow:** Inspection passed → takt progress updated
- **CostPilot:** NCR cost impact → COPQ in cost tracking
- **VisionAI:** Photo analysis → auto-detect defects
- **CommHub:** NCR created → notification to responsible party
- **SafeZone:** Quality failure with safety impact → safety incident

---

## Module 3: SafeZone — OHS / Safety

**Service:** safety-service (Port 3010)
**Status:** New — Phase 2

### Core Capabilities
- **Risk matrix** — 5x5 probability × impact for each zone/trade
- **Incident reporting** — near miss, first aid, lost time, fatality
- **PTW (Permit to Work)** — authorization workflow for hazardous tasks
- **JSA (Job Safety Analysis)** — systematic risk assessment per activity
- **Toolbox talks** — daily safety briefing records
- **Safety observation cards** — proactive hazard identification
- **PPE compliance tracking** — per zone/trade
- **LTIR/TRIR calculation** — safety performance metrics

### Database Schema (safety schema)
```
safety_risks         — UUID, project_id, location_id, trade_id, hazard,
                       probability (1-5), impact (1-5), risk_score,
                       control_measures[], residual_risk, status, reviewed_by
incidents            — UUID, project_id, location_id, type (near_miss/first_aid/
                       medical/lost_time/fatality), date, time, description,
                       injured_person, witness[], root_cause, corrective_action,
                       days_lost, cost, photo_urls[], status (reported/investigating/
                       closed), reported_by, investigated_by
permits_to_work      — UUID, project_id, location_id, work_type, hazards[],
                       precautions[], status (requested/approved/active/closed/revoked),
                       requested_by, approved_by, valid_from, valid_until
toolbox_talks        — UUID, project_id, date, topic, attendees[], conducted_by,
                       location_id, notes, sign_off_url
safety_observations  — UUID, project_id, location_id, observation_type (safe/unsafe),
                       description, corrective_action, photo_urls[], observed_by
```

### API Endpoints
```
GET    /api/v1/safety/risks                 — Risk matrix
POST   /api/v1/safety/risks                 — Add risk assessment
GET    /api/v1/safety/incidents              — List incidents
POST   /api/v1/safety/incidents              — Report incident
PUT    /api/v1/safety/incidents/:id          — Update incident
GET    /api/v1/safety/permits                — List PTW
POST   /api/v1/safety/permits                — Request PTW
PUT    /api/v1/safety/permits/:id/approve    — Approve PTW
GET    /api/v1/safety/toolbox-talks          — List toolbox talks
POST   /api/v1/safety/toolbox-talks          — Record toolbox talk
GET    /api/v1/safety/observations           — List observations
POST   /api/v1/safety/observations           — Submit observation
GET    /api/v1/safety/stats                  — LTIR, TRIR, incident trends
```

### Key Metrics
- LTIR (Lost Time Injury Rate)
- TRIR (Total Recordable Incident Rate)
- Near miss reporting rate
- PTW compliance %
- Toolbox talk attendance %
- Risk score by zone (heat map)

### Cross-Module Integration
- **TaktFlow:** High-risk zone → constraint flagged automatically
- **CrewFlow:** Incident → crew reassignment triggered
- **CommHub:** Critical incident → immediate escalation
- **RiskRadar:** Safety risks feed into project risk register
- **GreenSite:** Environmental safety incidents linked

---

## Module 4: CostPilot — Cost Management

**Service:** cost-service (Port 3011)
**Status:** New — Phase 2

### Core Capabilities
- **Budget management** — WBS-aligned cost breakdown
- **EVM (Earned Value Management)** — PV, EV, AC, CPI, SPI, EAC, ETC, VAC
- **S-Curve visualization** — planned vs actual cost over time
- **Cost forecasting** — EAC/ETC with trend analysis
- **COPQ aggregation** — rework costs from QualityGate
- **Payment tracking** — progress-based invoicing
- **Cash flow projection** — monthly inflow/outflow forecast
- **AI cost prediction** — Gemini analyzes trends for early warning (Layer 2)

### Database Schema (cost schema)
```
budgets              — UUID, project_id, name, total_amount, currency,
                       status (draft/approved/active/closed), approved_by, version
budget_items         — UUID, budget_id, wbs_code, description, trade_id,
                       planned_amount, committed_amount, actual_amount,
                       category (labor/material/equipment/subcontract/overhead)
cost_records         — UUID, project_id, budget_item_id, amount, type
                       (commitment/actual/forecast), date, description,
                       invoice_ref, vendor, approved_by
evm_snapshots        — UUID, project_id, snapshot_date, pv, ev, ac,
                       cv, sv, cpi, spi, eac, etc, vac, tcpi,
                       data_source (manual/calculated)
payment_applications — UUID, project_id, period_start, period_end,
                       gross_amount, retention_pct, retention_amount,
                       net_amount, status (draft/submitted/approved/paid)
```

### API Endpoints
```
GET    /api/v1/cost/budgets                  — List budgets
POST   /api/v1/cost/budgets                  — Create budget
GET    /api/v1/cost/budgets/:id              — Budget detail with items
PUT    /api/v1/cost/budgets/:id              — Update budget
GET    /api/v1/cost/evm                      — Current EVM metrics
GET    /api/v1/cost/evm/history              — EVM trend over time
GET    /api/v1/cost/s-curve                  — S-curve data (PV/EV/AC)
POST   /api/v1/cost/records                  — Record cost entry
GET    /api/v1/cost/forecast                 — EAC/ETC forecast
GET    /api/v1/cost/cashflow                 — Cash flow projection
GET    /api/v1/cost/copq                     — COPQ from QualityGate
GET    /api/v1/cost/stats                    — CPI, SPI, budget health
```

### Key Metrics
- CPI (Cost Performance Index)
- SPI (Schedule Performance Index)
- EAC (Estimate at Completion)
- Budget variance %
- Cash flow accuracy
- COPQ as % of budget

### Cross-Module Integration
- **TaktFlow:** Schedule progress → EV calculation
- **QualityGate:** NCR cost impact → COPQ aggregation
- **CrewFlow:** Crew overtime/costs → labor cost actuals
- **SupplyChain:** PO amounts → committed costs
- **ClaimShield:** Change order values → budget adjustments
- **Hub:** Cost health feeds Project Health Score

---

## Module 5: CrewFlow — Resource Management

**Service:** resource-service (Port 3006)
**Status:** Existing stub — Phase 2 enhancement

### Core Capabilities
- **Crew management** — trade crews with foreman, size, skills
- **Equipment tracking** — cranes, scaffolding, lifts with availability
- **Material management** — quantities, delivery tracking
- **Resource assignments** — crew-to-zone allocation
- **Utilization dashboard** — histogram, overallocation warnings
- **Crew productivity tracking** — output per man-hour by trade
- **Resource leveling** — automated crew balancing suggestions

### Cross-Module Integration
- **TaktFlow:** Zone assignments → resource allocation
- **CostPilot:** Crew costs → labor cost actuals
- **SafeZone:** Incident → crew reassignment
- **SupplyChain:** Material delivery → resource availability

---

## Module 6: ClaimShield — Claims & Change Orders

**Service:** claims-service (Port 3012)
**Status:** New — Phase 2

### Core Capabilities
- **Change order management** — initiate, review, approve, track
- **Claims register** — log claims with evidence
- **Delay analysis** — time impact analysis, concurrent delay identification
- **Entitlement tracking** — extension of time (EOT), cost compensation
- **Document linking** — attach correspondence, RFIs, meeting minutes
- **Dispute tracking** — escalation stages (negotiation/mediation/arbitration)
- **Financial impact** — change order value tracking, budget adjustment

### Database Schema (claims schema)
```
change_orders        — UUID, project_id, co_number, title, description,
                       type (owner_directed/contractor_claim/design_change/
                       unforeseen_condition), status (draft/submitted/under_review/
                       approved/rejected/disputed), cost_impact, time_impact_days,
                       submitted_by, submitted_date, decided_by, decided_date,
                       attachments[], related_rfi_ids[]
claims               — UUID, project_id, claim_number, title, description,
                       claimant, respondent, category (delay/disruption/acceleration/
                       scope_change/unforeseen), status (notified/substantiated/
                       negotiating/resolved/escalated), amount_claimed, amount_awarded,
                       time_claimed_days, time_awarded_days, evidence_urls[],
                       resolution_method (negotiation/mediation/arbitration/litigation)
delay_events         — UUID, project_id, claim_id, event_date, description,
                       delay_type (excusable/non_excusable/compensable/concurrent),
                       days_impact, affected_activities[], responsible_party,
                       supporting_docs[]
```

### API Endpoints
```
GET    /api/v1/claims/change-orders          — List change orders
POST   /api/v1/claims/change-orders          — Create change order
PUT    /api/v1/claims/change-orders/:id      — Update change order
POST   /api/v1/claims/change-orders/:id/approve — Approve CO
GET    /api/v1/claims/register               — Claims register
POST   /api/v1/claims/register               — Submit claim
PUT    /api/v1/claims/register/:id           — Update claim
GET    /api/v1/claims/delay-analysis         — Delay events & analysis
POST   /api/v1/claims/delay-events           — Record delay event
GET    /api/v1/claims/stats                  — CO count, claim values
```

### Key Metrics
- Pending change orders (count & value)
- Approved CO value vs original contract
- Claim success rate
- Average CO processing time (days)
- EOT days awarded

### Cross-Module Integration
- **CostPilot:** Approved CO → budget adjustment
- **TaktFlow:** EOT → schedule update
- **CommHub:** CO/Claim status change → notification
- **RiskRadar:** Claim patterns → risk identification
- **StakeHub:** Claim escalation → stakeholder notification

---

## Module 7: VisionAI — Visual Progress Tracking

**Service:** vision-service (Port 8008, Python/FastAPI)
**Status:** New — Phase 3

### Core Capabilities
- **Photo upload & organization** — by zone, trade, date
- **AI progress detection** — Gemini Vision analyzes site photos for completion %
- **Defect detection** — AI identifies visible quality issues
- **Before/after comparison** — visual timeline per zone
- **360 photo support** — panoramic site capture
- **Time-lapse generation** — automated progress videos
- **Integration with QualityGate** — defect → NCR auto-creation

---

## Module 8: SupplyChain AI — Procurement

**Service:** supply-chain-service (Port 3013)
**Status:** New — Phase 2

### Core Capabilities
- **MRP (Material Requirements Planning)** — auto-calculate material needs from takt plan
- **Procurement tracking** — RFQ, PO, delivery status
- **Supplier management** — vendor database, performance scoring
- **JIT delivery scheduling** — align deliveries with takt zone schedule
- **Lead time tracking** — early warning for late materials
- **Inventory management** — on-site stock levels
- **AI procurement suggestions** — optimal order timing based on lead time patterns

### Database Schema (supply_chain schema)
```
suppliers            — UUID, name, category, contact_person, email, phone,
                       address, rating (1-5), lead_time_avg_days, payment_terms,
                       status (active/suspended/blacklisted), certifications[]
purchase_orders      — UUID, project_id, supplier_id, po_number, status
                       (draft/submitted/confirmed/shipped/received/cancelled),
                       items (JSONB), total_amount, currency, order_date,
                       expected_delivery, actual_delivery, delivery_location_id
material_requirements — UUID, project_id, trade_id, material_name, specification,
                        unit, required_qty, ordered_qty, received_qty, installed_qty,
                        required_by_date, zone_ids[], status (planned/ordered/
                        in_transit/received/installed/shortage)
delivery_schedule    — UUID, project_id, po_id, zone_id, planned_date,
                       actual_date, status (scheduled/in_transit/delivered/delayed),
                       notes
```

### API Endpoints
```
GET    /api/v1/supply/suppliers              — List suppliers
POST   /api/v1/supply/suppliers              — Add supplier
GET    /api/v1/supply/purchase-orders        — List POs
POST   /api/v1/supply/purchase-orders        — Create PO
PUT    /api/v1/supply/purchase-orders/:id    — Update PO
POST   /api/v1/supply/purchase-orders/:id/receive — Receive delivery
GET    /api/v1/supply/mrp                    — Material requirements
POST   /api/v1/supply/mrp/calculate          — Calculate MRP from plan
GET    /api/v1/supply/deliveries             — Delivery schedule
GET    /api/v1/supply/inventory              — On-site inventory
GET    /api/v1/supply/stats                  — On-time delivery %, shortages
```

### Key Metrics
- On-time delivery rate %
- Material shortage count
- Supplier performance score
- Lead time variance
- Inventory turnover

### Cross-Module Integration
- **TaktFlow:** Takt plan → MRP auto-calculation
- **CostPilot:** PO amounts → committed costs
- **RiskRadar:** Late delivery risk → risk register
- **CommHub:** Delivery alert → supplier notification
- **TaktFlow constraint:** Material not delivered → auto-constraint

---

## Module 9: RiskRadar — Risk Management

**Service:** risk-service (Port 3014)
**Status:** New — Phase 2

### Core Capabilities
- **Risk register** — identification, assessment, response planning
- **Heat map visualization** — probability × impact matrix
- **Risk categories** — schedule, cost, quality, safety, scope, external
- **Mitigation tracking** — action plans with owners and deadlines
- **Risk trending** — how risks evolve over time
- **Monte Carlo integration** — risk-based schedule/cost simulation
- **AI risk prediction** — pattern recognition from project data (Layer 2)

### Database Schema (risk schema)
```
risks                — UUID, project_id, risk_id_code, title, description,
                       category (schedule/cost/quality/safety/scope/external/
                       contractual/environmental), probability (1-5), impact (1-5),
                       risk_score, risk_level (low/medium/high/critical),
                       response_strategy (avoid/mitigate/transfer/accept),
                       mitigation_plan, contingency_plan, risk_owner,
                       trigger_conditions, status (identified/assessed/mitigating/
                       occurred/closed), identified_by, identified_date,
                       last_review_date, related_zone_ids[], related_trade_ids[]
risk_actions         — UUID, risk_id, action, assigned_to, due_date,
                       status (pending/in_progress/completed/overdue),
                       completion_date, effectiveness (effective/partial/ineffective)
risk_reviews         — UUID, risk_id, review_date, reviewed_by,
                       previous_score, new_score, notes, probability, impact
```

### API Endpoints
```
GET    /api/v1/risk/register                 — Risk register
POST   /api/v1/risk/register                 — Add risk
PUT    /api/v1/risk/register/:id             — Update risk
GET    /api/v1/risk/heat-map                 — Heat map data
GET    /api/v1/risk/trending                 — Risk trend over time
POST   /api/v1/risk/actions                  — Create mitigation action
PUT    /api/v1/risk/actions/:id              — Update action status
GET    /api/v1/risk/stats                    — Risk summary by category
```

### Key Metrics
- Total risks by level (critical/high/medium/low)
- Overdue mitigation actions
- Risk score trend
- Top 10 risks dashboard
- Risk response effectiveness %

### Cross-Module Integration
- **TaktFlow:** Schedule risk → constraint flagging
- **CostPilot:** Cost risk → contingency budgeting
- **SafeZone:** Safety risk → safety risk matrix
- **ClaimShield:** Contractual risk → claim preparation
- **Hub:** Risk health feeds Project Health Score

---

## Module 10: CommHub — Communication Management

**Service:** comm-service (Port 3015) + notification-service (Port 3007)
**Status:** notification-service exists, comm-service new — Phase 2

### Core Capabilities
- **RFI management** — Request for Information tracking
- **Transmittals** — document distribution records
- **Meeting minutes** — templates, action items, attendance
- **Correspondence log** — letters, emails, notices
- **Escalation engine** — auto-escalate unresponded items
- **Real-time notifications** — WebSocket push (existing)
- **Daily reports** — auto-generated site diary

### Database Schema (comm schema)
```
rfis                 — UUID, project_id, rfi_number, subject, question,
                       status (draft/submitted/answered/closed), priority,
                       submitted_by, assigned_to, due_date, answer,
                       answered_by, answered_date, attachments[],
                       related_location_ids[], related_trade_ids[]
transmittals         — UUID, project_id, transmittal_number, subject,
                       from_party, to_parties[], documents (JSONB),
                       purpose (for_approval/for_information/for_review/
                       for_construction), status (sent/acknowledged/responded),
                       sent_date, acknowledged_date
meeting_minutes      — UUID, project_id, meeting_type (weekly/monthly/
                       coordination/safety/special), date, location,
                       attendees (JSONB), agenda_items (JSONB),
                       action_items (JSONB), minutes_by, approved_by
correspondence       — UUID, project_id, type (letter/email/notice/memo),
                       reference_number, subject, from_party, to_party,
                       date, content, attachments[], status (sent/received/
                       acknowledged/action_required)
```

### API Endpoints
```
GET    /api/v1/comm/rfi                      — List RFIs
POST   /api/v1/comm/rfi                      — Create RFI
PUT    /api/v1/comm/rfi/:id                  — Update/Answer RFI
GET    /api/v1/comm/transmittals             — List transmittals
POST   /api/v1/comm/transmittals             — Create transmittal
GET    /api/v1/comm/meetings                 — List meeting minutes
POST   /api/v1/comm/meetings                 — Record meeting
GET    /api/v1/comm/correspondence           — Correspondence log
POST   /api/v1/comm/correspondence           — Log correspondence
GET    /api/v1/comm/stats                    — Open RFIs, response times
```

### Key Metrics
- Open RFI count & average response time
- Overdue items by category
- Communication volume trends
- Action item completion rate

---

## Module 11: StakeHub — Stakeholder Management

**Service:** stakeholder-service (Port 3016)
**Status:** New — Phase 2

### Core Capabilities
- **Stakeholder register** — all project parties with roles
- **Authority matrix (RACI)** — Responsible, Accountable, Consulted, Informed
- **Engagement tracking** — satisfaction scores, feedback log
- **Decision log** — who decided what, when, why
- **Organizational chart** — visual project org structure
- **Contact directory** — searchable party contacts

### Database Schema (stakeholder schema)
```
stakeholders         — UUID, project_id, name, organization, role,
                       category (owner/contractor/subcontractor/consultant/
                       authority/supplier/community), influence (low/medium/high),
                       interest (low/medium/high), email, phone,
                       engagement_strategy, status (active/inactive)
authority_matrix     — UUID, project_id, activity, responsible_id,
                       accountable_id, consulted_ids[], informed_ids[],
                       threshold_amount, notes
decisions            — UUID, project_id, decision_number, title, description,
                       decided_by, decision_date, rationale, impact,
                       stakeholders_consulted[], status (pending/decided/
                       implemented/reversed), attachments[]
```

### API Endpoints
```
GET    /api/v1/stakeholders/register         — Stakeholder register
POST   /api/v1/stakeholders/register         — Add stakeholder
PUT    /api/v1/stakeholders/register/:id     — Update stakeholder
GET    /api/v1/stakeholders/raci             — Authority matrix
POST   /api/v1/stakeholders/raci             — Define RACI entry
GET    /api/v1/stakeholders/decisions        — Decision log
POST   /api/v1/stakeholders/decisions        — Log decision
GET    /api/v1/stakeholders/org-chart        — Org chart data
```

---

## Module 12: GreenSite — ESG & Environmental

**Service:** sustainability-service (Port 3017)
**Status:** New — Phase 2

### Core Capabilities
- **Carbon footprint tracking** — CO2 emissions by activity/material
- **Waste management** — waste types, volumes, disposal/recycling rates
- **Water usage monitoring** — consumption tracking
- **Energy consumption** — fuel, electricity per zone/period
- **LEED/BREEAM tracking** — certification credit tracking
- **Environmental incident log** — spills, emissions, noise complaints
- **ESG reporting** — automated sustainability reports
- **Dust & noise monitoring** — compliance thresholds

### Database Schema (sustainability schema)
```
carbon_records       — UUID, project_id, date, source (transport/equipment/
                       material/energy), activity, quantity, unit,
                       emission_factor, co2_kg, scope (1/2/3), notes
waste_records        — UUID, project_id, date, waste_type (concrete/steel/
                       wood/plastic/hazardous/mixed/soil), quantity_tons,
                       disposal_method (landfill/recycle/reuse/incinerate),
                       recycled_pct, transporter, destination, manifest_number
energy_records       — UUID, project_id, date, type (diesel/petrol/electricity/
                       lpg), quantity, unit, cost, equipment_id, zone_id
certification_credits — UUID, project_id, system (leed/breeam/greenstar/envision),
                        credit_id, credit_name, category, target_level,
                        current_status (not_started/in_progress/achieved/not_achieved),
                        points_possible, points_achieved, evidence_urls[]
env_incidents        — UUID, project_id, date, type (spill/emission/noise/dust/
                       water_contamination), description, severity, location_id,
                       corrective_action, reported_to_authority, photo_urls[]
```

### API Endpoints
```
GET    /api/v1/sustainability/carbon         — Carbon records
POST   /api/v1/sustainability/carbon         — Log carbon entry
GET    /api/v1/sustainability/carbon/summary — CO2 summary
GET    /api/v1/sustainability/waste          — Waste records
POST   /api/v1/sustainability/waste          — Log waste entry
GET    /api/v1/sustainability/waste/summary  — Recycling rate
GET    /api/v1/sustainability/energy         — Energy records
POST   /api/v1/sustainability/energy         — Log energy entry
GET    /api/v1/sustainability/certification  — LEED/BREEAM status
PUT    /api/v1/sustainability/certification/:id — Update credit
GET    /api/v1/sustainability/incidents      — Environmental incidents
POST   /api/v1/sustainability/incidents      — Report incident
GET    /api/v1/sustainability/dashboard      — ESG dashboard data
```

### Key Metrics
- Total CO2 emissions (tons)
- Waste recycling rate %
- Energy intensity (kWh/m2)
- LEED points achieved vs target
- Environmental incident rate

### Cross-Module Integration
- **CostPilot:** Carbon offset costs, waste disposal costs
- **SafeZone:** Environmental incidents linked
- **CommHub:** ESG report distribution
- **Hub:** ESG score in Project Health Score

---

## Module 13: SmartCon360 Hub — Master Orchestrator

**Service:** hub-service (Port 3018) + analytics-service (Port 8006) + ai-concierge (Port 3008)
**Status:** analytics-service stub exists, hub-service new — Phase 2

### Core Capabilities
- **Unified Dashboard** — all 12 modules' key metrics on one screen
- **Project Health Score** — AI-calculated 0-100 score from all module data
- **Cross-module analytics** — correlations, trends, predictions
- **Module licensing** — enable/disable modules per organization
- **AI Concierge** — natural language query across all modules
- **Automated alerts** — cross-module threshold monitoring
- **Executive reporting** — board-level project summary

### Project Health Score Formula
```
Health Score = weighted average of:
  - Schedule Health (TaktFlow PPC, takt compliance)     × 0.20
  - Cost Health (CostPilot CPI, SPI, budget variance)   × 0.20
  - Quality Health (QualityGate FTR, open NCRs)          × 0.15
  - Safety Health (SafeZone LTIR, incidents)              × 0.15
  - Risk Health (RiskRadar critical risks, overdue)       × 0.10
  - Resource Health (CrewFlow utilization, overtime)       × 0.10
  - Supply Health (SupplyChain on-time delivery)           × 0.05
  - Communication Health (CommHub response times)          × 0.05
```

### Frontend Routes
| Route | Page |
|-------|------|
| /dashboard | Unified dashboard — Project Health Score, module KPIs |
| /ai | AI Concierge — cross-module natural language interface |

---

## Cross-Module Data Flow Diagram

```
                    ┌─────────────┐
                    │     Hub     │ ← Project Health Score
                    │  Dashboard  │ ← Executive Reports
                    └──────┬──────┘
                           │ aggregates from all
          ┌────────┬───────┼───────┬────────┐
          │        │       │       │        │
    ┌─────▼──┐ ┌───▼───┐ ┌▼─────┐ ┌▼──────┐ ┌▼────────┐
    │TaktFlow│ │CostPlt│ │QltyGt│ │SafeZn │ │RiskRadr │
    │Schedule│ │ Cost  │ │Qualit│ │Safety │ │ Risk    │
    └──┬─────┘ └──┬────┘ └──┬───┘ └──┬────┘ └──┬──────┘
       │          │         │        │          │
       │  ┌───────┘         │        │          │
       │  │  ┌──────────────┘        │          │
       ▼  ▼  ▼                       ▼          ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ CrewFlow │  │SupplyAI  │  │CommHub   │  │ClaimShld │
    │Resources │  │Procuremnt│  │Comms     │  │Claims    │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
                                     │
                              ┌──────┴──────┐
                              │  StakeHub   │
                              │Stakeholders │
                              └─────────────┘
                       ┌──────────┐  ┌──────────┐
                       │VisionAI  │  │GreenSite │
                       │Photos    │  │ESG       │
                       └──────────┘  └──────────┘
```

## Frontend Architecture

### Single Next.js Application

All 13 modules share one frontend app with:
- **Single layout** with modular sidebar
- **Route-based module access** — each module under its own directory
- **Shared components** — tables, forms, charts, dialogs
- **Module-aware auth** — sidebar shows only licensed modules
- **Consistent UI** — same design language across all modules

### Sidebar Navigation Groups

```
PLANNING
  Dashboard           /dashboard
  Flowline            /flowline
  Takt Editor         /takt-editor
  Constraints         /constraints
  Last Planner        /lps

QUALITY & SAFETY
  QualityGate         /quality
  SafeZone            /safety
  VisionAI            /vision

COST & RESOURCES
  CostPilot           /cost
  CrewFlow            /resources

SUPPLY & RISK
  SupplyChain         /supply
  RiskRadar           /risk
  ClaimShield         /claims

COMMUNICATION
  CommHub             /communication
  StakeHub            /stakeholders

SUSTAINABILITY
  GreenSite           /sustainability

AI & ANALYTICS
  AI Concierge        /ai
  Reports             /reports
  Simulation          /simulation
```
