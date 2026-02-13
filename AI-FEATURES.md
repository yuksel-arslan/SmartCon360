# AI-FEATURES.md — TaktFlow AI Intelligence Layer

> **Version:** 1.0 | February 2026
> **Author:** Yuksel Arslan

---

## 3-Layer Architecture

TaktFlow AI is designed with progressive intelligence. Each layer adds capability, but **the system is fully functional at Layer 1 alone**.

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: DRL ENGINE (Optional)                                 │
│  Deep Reinforcement Learning — adaptive replanning,             │
│  simulation, learning from history                              │
│  Requires: Training infrastructure, GPU (recommended)           │
│  See: DRL-ARCHITECTURE.md                                       │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: AI-ENHANCED (Gemini API)                              │
│  Plan refinement, concierge, reports, drawing analysis          │
│  Requires: Google Gemini API key                                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE ENGINE (No AI dependency)                        │
│  Template-based plan generation, algorithmic takt calculation,  │
│  trade stacking detection, flowline visualization, LPS          │
│  Requires: Nothing — works out of the box                       │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Comparison

| Capability | Layer 1 (Core) | Layer 2 (AI) | Layer 3 (DRL) |
|------------|---------------|--------------|---------------|
| Create takt plan | Template + parameters | AI refines from text/drawings | DRL optimizes dynamically |
| Zone division | Manual or template-based | AI suggests from floor plan | WDM optimizes mathematically |
| Trade stacking detection | Algorithmic (rule-based) | Same | DRL prevents proactively |
| Flowline visualization | Full D3.js charts | Same | Same + DRL predictions overlay |
| Constraint management | Manual CRUD | AI auto-detects some | DRL factors into decisions |
| Progress tracking | Manual input, PPC calc | Same | DRL adjusts plan based on actuals |
| Reporting | Data export, basic charts | AI writes narrative reports | DRL adds predictive insights |
| What-if scenarios | Parameter sweep | AI suggests scenarios | DRL finds optimal scenario |
| Natural language | Not available | AI Concierge (chat) | Same + DRL action explanations |
| Replanning | Manual adjustment | AI suggests adjustments | **DRL auto-recommends in ms** |

---

## AI Feature Specifications

### AI-1: Intelligent Plan Generator

**Layer:** 1 (Core) + 2 (AI Enhancement)
**Services:** `takt-engine` + `ai-planner`
**Phase:** 1 (core) / 2 (AI enhancement)

#### Layer 1 Behavior (No AI)
```
Input:  Project type (hotel/hospital/...) + floor count + area + zone count
Engine: Template DB with domain knowledge from 44 years of experience
Output: Complete LBS + trade list + sequence + takt time + zone division + flowline
Time:   < 1 second
```

#### Layer 2 Behavior (With Gemini)
```
Input:  Free-text project description OR Layer 1 output for refinement
Engine: Gemini API parses text → extracts parameters → generates/refines plan
Output: Same as Layer 1, but adapted to project-specific nuances
Time:   3-5 seconds

Example input:  "300 room hotel, 12 floors, spa on ground floor,
                 conference center in basement, Istanbul location"
Example output: LBS with special zones for spa/conference,
                MEP-heavy areas flagged, local trade sequences applied
```

#### Layer 3 Behavior (With DRL)
```
Input:  Layer 1 or 2 output + historical project data
Engine: Trained PPO agent optimizes trade sequences and takt timing
Output: Optimized plan with flow efficiency score and confidence level
Time:   < 100ms (inference)
```

**What makes this different from competitors:** No competitor auto-generates a complete takt plan. LCMD, Touchplan, Vico — all require the planner to build everything manually from scratch. TaktFlow generates 80%, human calibrates 20%.

---

### AI-2: Drawing & BIM Analyzer

**Layer:** 2 (AI) + optional BIM
**Services:** `bim-service` + Gemini Vision API
**Phase:** 3

#### Gemini Vision (2D Drawings)
```
Input:  Architectural floor plan (PDF/PNG)
Engine: Gemini Vision API analyzes the image
Output: Room list, estimated areas, zone division suggestion, trade mapping
Accuracy: ~70-80%, always requires human review
Limitations: Struggles with complex MEP drawings, unlabeled plans
```

#### IFC/BIM Parser
```
Input:  IFC file from BIM software (Revit, ArchiCAD, etc.)
Engine: ifcopenshell extracts structured data
Output: Precise spaces, areas, volumes, building elements mapped to trades
Accuracy: ~95% for well-modeled IFC files
Limitations: Requires IFC format (not all projects have BIM)
```

**What makes this different:** Upload a drawing, get zones. No competitor offers AI-driven zone suggestion from floor plans.

---

### AI-3: Proactive Warning System

**Layer:** 1 (Core — algorithmic)
**Services:** `takt-engine` + `constraint-service`
**Phase:** 1

This is pure algorithmic intelligence — no AI API needed.

#### Detectable Issues
```
Trade Stacking:
  ⚠️ "Zone 3-5: Electrical and Mechanical overlap — add 2-day buffer"
  Detection: Date range comparison across assignments per zone

Takt Violation:
  ⚠️ "Reducing takt to 3 days causes stacking on floors 4-8"
  Detection: Grid recalculation with new parameters

Predecessor Block:
  ⚠️ "Drywall cannot enter Zone 6 — MEP predecessor incomplete"
  Detection: Dependency graph traversal

Buffer Erosion:
  ⚠️ "Buffer between Framing and MEP is 70% consumed in Zone 4"
  Detection: Planned vs actual gap analysis

Critical Path Alert:
  ⚠️ "Electrical is on critical path — any delay cascades to 5 trades"
  Detection: Longest path calculation through trade dependency graph
```

#### With DRL Enhancement (Layer 3)
```
DRL doesn't just detect — it PREVENTS:
  The agent learns patterns that lead to stacking and avoids them
  in its scheduling recommendations before they occur.
```

**What makes this different:** Competitors show you the plan. TaktFlow warns you before things go wrong.

---

### AI-4: Conversational Project Assistant (AI Concierge)

**Layer:** 2 (AI — requires Gemini API)
**Services:** `ai-concierge`
**Phase:** 2

```
Technology: Google Gemini API + Project DB context + RAG (vector search)
Interface: Chat panel in dashboard + mobile PWA
```

#### Conversation Examples
```
User: "Which trades are behind schedule?"
AI:   "Mechanical installation is 3 zones behind. Root cause:
       material delivery was 5 days late. Zones 7-9 will be affected.
       Recommendation: Add weekend shift for Zone 5-6 to recover."

User: "What happens if I change takt time to 5 days?"
AI:   "Total project duration extends by 12 days. However, trade
       stacking risk drops from 40% to 5%. Recommendation: Apply
       5-day takt only for MEP-heavy floors (4-8), keep 3 days
       for finishing floors."

User: "Why did PPC drop this week?"
AI:   "8 commitments made, 5 completed (PPC=62.5%). Three failures:
       1. Paint Zone-4: material not on site
       2. Drywall Zone-6: crew shortage (2 of 6 absent)
       3. Electrical Zone-5: drawing revision pending
       Top variance reason: Material (2 of 3 failures)."

User: "Show me the risk for next week"
AI:   "3 constraints unresolved for next week's work:
       1. [HIGH] Steel delivery for Zone 8 — no confirmed date
       2. [MED] Inspection approval for Zone 5 MEP — submitted, waiting
       3. [LOW] Crane schedule conflict Tuesday AM
       Recommendation: Escalate steel delivery today."
```

#### RAG Architecture
```
Vector DB (pgvector) stores:
  - Project documents, specs, RFIs
  - Historical conversation context
  - Completed project learnings (Project DNA)

Query flow:
  User question → Embed → Vector search for context
  → Gemini generates answer with project-specific data
```

**What makes this different:** No construction software lets you TALK to your project. This is the most visible differentiator for demos and sales.

---

### AI-5: What-If Simulation Engine

**Layer:** 1 (basic) + 2 (AI interpretation) + 3 (DRL optimization)
**Services:** `simulation-service` + `drl-engine`
**Phase:** 2 (basic) / 3 (DRL)

#### Layer 1: Parameter Sweep
```
Input:  "Change takt from 3 to 5 days" or "Add 2 buffer days after MEP"
Engine: Recalculate takt grid with new parameters
Output: New flowline, duration delta, stacking analysis
```

#### Layer 2: AI-Guided Scenarios
```
User:   "We're 2 weeks behind, how do we recover?"
AI generates 3 scenarios:
  → Scenario A: Weekend overtime (+cost), recover in 8 days
  → Scenario B: Cut buffers, risky but zero cost
  → Scenario C: Add parallel crew for Zone 5-8 → RECOMMENDED
Each with: duration impact, cost impact, risk score, flowline preview
```

#### Layer 3: DRL-Optimized
```
DRL agent runs thousands of simulations internally,
returns the mathematically optimal recovery plan.
Includes confidence score and sensitivity analysis.
```

**What makes this different:** Competitors show you ONE plan. TaktFlow shows you alternatives and recommends the best one.

---

### AI-6: Automated Report Writer

**Layer:** 2 (AI — requires Gemini API)
**Services:** `reporting-service`
**Phase:** 2

```
Input:   Project data (PPC, progress, constraints, variances)
Engine:  Gemini API + Jinja2 templates
Output:  Professional narrative report (PDF/HTML)
```

#### Report Types
```
Weekly Progress Report:
  "Week 12 Summary: PPC 78% (target 85%). MEP discipline is the
   bottleneck. Material delays in Zone 4-6 created cascading effects.
   Next week is critical: if Zone 7 MEP isn't completed, interior
   finishing halts for 3 zones. Recommendation: assign additional
   MEP crew."

Monthly Executive Summary:
  Project health score, milestone tracking, cost variance analysis,
  risk register update, trade performance comparison, lookahead.

Variance Analysis:
  Root cause breakdown by constraint category (design 15%,
  material 40%, labor 25%, space 10%, other 10%).
  Trend analysis: improving/deteriorating by trade.
```

**What makes this different:** Competitors give you raw data exports. TaktFlow writes the report for you, with analysis and recommendations.

---

### AI-7: Learning Engine (Project DNA)

**Layer:** 3 (requires historical data)
**Services:** `analytics-service` + `drl-engine`
**Phase:** 4

```
Every completed project teaches the system:

Project 1: Hotel, planned takt=3 days, actual=4.2 days
Project 2: Hotel, planned takt=3 days, actual=3.8 days
Project 3: Hotel → AI now suggests takt=4 days (realistic)

Additionally:
  - Regional productivity differences (Istanbul vs Ankara vs Dubai)
  - Trade-specific delay patterns (MEP always 15% over in hotels)
  - Seasonal effects (winter = +20% duration for exterior work)
  - Crew size optimization (8-person MEP crew optimal for 200m² zone)
```

#### Data Collection Points
```
From each project:
  - Planned vs actual durations per trade per zone
  - PPC history and variance reasons
  - Constraint patterns (which categories, resolution time)
  - Weather impact on productivity
  - Crew size vs productivity correlation
  - Material lead times by supplier/region
```

#### How It Improves the System
```
Plan Generation:  More realistic default durations
Zone Division:    Better work content estimation
Stacking Alerts:  Fewer false positives
Simulations:      More accurate stochastic parameters
Concierge:        Answers based on real outcomes, not theory
DRL Agent:        Retrained on real data, continuously improving
```

**What makes this different:** This is the long-term competitive moat. More projects = smarter system. No competitor has a learning feedback loop.

---

## Feature × Phase Matrix

| Feature | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---------|---------|---------|---------|---------|
| **AI-1: Plan Generator** | Core (templates) | +Gemini refinement | +DRL optimization | — |
| **AI-2: Drawing Analyzer** | — | — | Gemini Vision + BIM | — |
| **AI-3: Warning System** | Core (algorithmic) | +constraint AI | +DRL prevention | — |
| **AI-4: AI Concierge** | — | Full (Gemini + RAG) | +DRL explanations | — |
| **AI-5: What-If Simulation** | — | Basic + AI scenarios | +DRL optimal | — |
| **AI-6: Report Writer** | — | Full (Gemini) | — | — |
| **AI-7: Project DNA** | — | — | Data collection | Full learning loop |

---

## Competitive Differentiation Summary

| Step | LCMD / Touchplan / Vico | TaktFlow AI |
|------|------------------------|-------------|
| Create plan | Manual, from scratch | **AI generates, human calibrates** |
| Divide zones | Draw manually | **Upload drawing, AI suggests** |
| Detect conflicts | User must notice | **System warns proactively** |
| Analyze progress | Read dashboards | **Talk to your project** |
| Handle delays | Experience-based guessing | **AI simulates recovery scenarios** |
| Write reports | Manual in PowerPoint | **AI writes automatically** |
| Next project | Start from zero | **System learned from previous projects** |
