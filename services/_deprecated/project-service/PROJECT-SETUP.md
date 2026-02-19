# Project Setup Module

## Overview

The Project Setup module extends the `project-service` (Port 3002) to provide a comprehensive
project initialization workflow. It manages:

1. **Classification Standard Selection** — WBS/CBS standard (Uniclass 2015 default)
2. **Drawing Upload** — PDF, DWG, DXF, RVT, IFC file management by discipline
3. **BOQ Upload** — Excel/CSV import with auto-transfer to CostPilot WorkItems
4. **WBS Generation** — Work Breakdown Structure from standard templates or manual
5. **CBS Generation** — Cost Breakdown Structure linked to WBS
6. **Trade Templates** — Discipline-based sub-trades for TaktFlow Takt plans

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  PROJECT SETUP WIZARD (Frontend)                                 │
│  /projects/:id/setup                                             │
│                                                                  │
│  Step 1: Classification → Step 2: Drawings → Step 3: BOQ        │
│  Step 4: WBS → Step 5: CBS → Step 6: Trades → Step 7: Review    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│  PROJECT-SERVICE (Port 3002)                                     │
│                                                                  │
│  Routes:                                                         │
│  ├── /projects/:id/setup/*      Setup state management           │
│  ├── /projects/:id/drawings/*   Drawing CRUD + upload            │
│  ├── /projects/:id/wbs/*        WBS CRUD + template generation   │
│  ├── /projects/:id/cbs/*        CBS CRUD + template generation   │
│  └── /projects/:id/boq/*        BOQ upload, parse, confirm       │
│                                                                  │
│  Templates:                                                      │
│  ├── wbs-templates.ts           Uniclass/MasterFormat/UniFormat   │
│  ├── cbs-templates.ts           Uniclass Ss / UniFormat CBS       │
│  └── trade-discipline-templates.ts  5 disciplines, per-project   │
└──────────────────────────────────────────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │  TaktFlow    │    │  CostPilot   │    │  Hub         │
  │  Takt Plan   │    │  WorkItems   │    │  Health      │
  │  from Trades │    │  from BOQ    │    │  Score       │
  └──────────────┘    └──────────────┘    └──────────────┘
```

## Database Models

| Model | Table | Purpose |
|-------|-------|---------|
| Drawing | drawings | Uploaded drawing file metadata |
| WbsNode | wbs_nodes | WBS tree structure (self-referential) |
| CbsNode | cbs_nodes | CBS tree linked to WBS nodes |
| ProjectSetup | project_setup | Setup wizard state tracking |

## API Endpoints

### Setup State
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/setup | Get setup state and config |
| PATCH | /projects/:id/setup | Update setup state |
| POST | /projects/:id/setup/complete-step | Mark step as completed |
| GET | /projects/:id/setup/trade-templates | Get trade templates for project type |
| POST | /projects/:id/setup/apply-trades | Apply selected trades to project |
| POST | /projects/:id/setup/finalize | Finalize setup, activate project |
| GET | /projects/:id/setup/export | Export all setup data for cross-module use |

### Drawings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/drawings | List drawings (filterable by discipline) |
| POST | /projects/:id/drawings | Upload drawings (multipart, max 50 files) |
| PATCH | /projects/:id/drawings/:drawingId | Update drawing metadata |
| DELETE | /projects/:id/drawings/:drawingId | Delete drawing |
| GET | /projects/:id/drawings/summary | Drawing statistics by discipline/type |

### WBS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/wbs | Get WBS tree |
| POST | /projects/:id/wbs | Create single WBS node (manual) |
| POST | /projects/:id/wbs/generate | Generate WBS from template |
| GET | /projects/:id/wbs/standards | Available WBS standards |
| GET | /projects/:id/wbs/template-preview | Preview template without saving |
| PATCH | /projects/:id/wbs/:nodeId | Update WBS node |
| DELETE | /projects/:id/wbs/:nodeId | Soft delete WBS node |

### CBS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /projects/:id/cbs | Get CBS tree with WBS links |
| POST | /projects/:id/cbs | Create single CBS node (manual) |
| POST | /projects/:id/cbs/generate | Generate CBS linked to WBS |
| GET | /projects/:id/cbs/standards | Available CBS standards |
| PATCH | /projects/:id/cbs/:nodeId | Update CBS node |
| DELETE | /projects/:id/cbs/:nodeId | Soft delete CBS node |

### BOQ
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /projects/:id/boq/upload | Upload and parse BOQ file |
| POST | /projects/:id/boq/confirm | Confirm import to CostPilot |
| GET | /projects/:id/boq/status | Check BOQ import status |

## Supported Standards

### WBS Standards
| Standard | Code | Region | Description |
|----------|------|--------|-------------|
| Uniclass 2015 | uniclass | UK/International | EF (Elements/Functions) table |
| MasterFormat 2018 | masterformat | US/Canada | CSI Division-based (Div 01-33) |
| UniFormat II | uniformat | US/International | ASTM E1557 system/assembly |
| Custom | custom | Any | Manual WBS creation |

### CBS Standards
| Standard | Code | Linked WBS | Description |
|----------|------|------------|-------------|
| Uniclass 2015 Ss | uniclass_ss | uniclass/masterformat | Systems table |
| UniFormat II CBS | uniformat_cbs | uniformat | Cost breakdown by system |

## Disciplines & Sub-Trades

| Discipline | Sub-Trades | Key Wagons |
|------------|------------|------------|
| Structural | 8 | Formwork, Rebar, Concrete, Stripping, Waterproofing |
| Mechanical | 7 | Plumbing, HVAC, Fire Suppression, Equipment |
| Electrical | 9 | Rough-in, Cable Tray, Lighting, Fire Alarm, BMS |
| Architectural | 12 | Masonry, Drywall, Tiling, Ceiling, Painting, FF&E |
| Landscape | 8 | Grading, Hard/Soft Landscaping, Drainage, Irrigation |

## Cross-Module Integration

| Flow | Source | Target | Trigger | Behavior |
|------|--------|--------|---------|----------|
| BOQ → CostPilot | BOQ Confirm | cost-service WorkItems | POST /boq/confirm | Best-effort: creates work items in cost-service |
| CBS → CostPilot | Setup Export | cost-service Budgets | GET /setup/export | Provides CBS data for budget item creation |
| WBS → TaktFlow | Setup Export | takt-engine | GET /setup/export | Provides WBS + trades for takt plan structure |
| Setup → Hub | Finalize | hub-service Events | POST /setup/finalize | Notifies hub for Health Score recalculation |

### Service URLs (env vars)
| Variable | Default | Target |
|----------|---------|--------|
| COST_SERVICE_URL | http://localhost:3011 | CostPilot |
| HUB_SERVICE_URL | http://localhost:3018 | Hub |
| TAKT_ENGINE_URL | http://localhost:8001 | TaktFlow |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3002 | Service port |
| DATABASE_URL | — | PostgreSQL connection string |
| UPLOAD_DIR | ./uploads | File upload directory |
| LOG_LEVEL | info | Pino log level |
| COST_SERVICE_URL | http://localhost:3011 | CostPilot service URL |
| HUB_SERVICE_URL | http://localhost:3018 | Hub service URL |
| TAKT_ENGINE_URL | http://localhost:8001 | Takt engine URL |

## Dependencies

```json
{
  "multer": "File upload handling",
  "xlsx": "Excel/CSV parsing for BOQ"
}
```
