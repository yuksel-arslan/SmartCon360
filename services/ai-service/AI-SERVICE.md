# AI Service

## Overview

Consolidated Python service for all AI-powered features: plan generation (Gemini), BIM/IFC parsing, report generation, analytics, and DRL stubs. Merges the former `ai-planner`, `bim-service`, `reporting-service`, `analytics-service`, `vision-service`, and `drl-engine` into a single FastAPI application.

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **AI:** LangChain + Google Gemini API
- **BIM:** IFC parsing (ifcopenshell-compatible)
- **Validation:** Pydantic
- **Database:** SQLAlchemy / asyncpg

## Port & Endpoints

**Port:** 8002

### AI Planner (`/planner/api/v1/planner`)
- `POST /generate` — AI-powered plan generation (Gemini)
- Plan refinement from text descriptions
- Template-based fallback (Layer 1)

### Reporting (`/reporting/api/v1/reports`)
- `POST /generate` — Generate reports
- AI narrative generation (Layer 2)
- Data export (Layer 1)

### BIM (`/api/v1/bim`)
- IFC file parsing and quantity extraction
- WBS generation from BIM models
- BOQ formatting
- Drawing analysis (Gemini Vision)

### Analytics (`/api/v1/analytics`)
- Dashboard KPI aggregation
- Trend analysis (stub)
- Project DNA (future Layer 3)

### DRL (`/api/v1/drl`)
- Deep Reinforcement Learning endpoints (stub)
- Adaptive replanning (future Layer 3)

## Mount Structure

```python
app.mount("/planner", planner_app)        # AI planner sub-app
app.mount("/reporting", reporting_app)    # Reporting sub-app
app.include_router(analytics_router)      # Analytics stub
app.include_router(drl_router)            # DRL stub
app.include_router(bim_qto_router)        # BIM full implementation
```

## Layer Detection

Health endpoint returns current AI capability layer:
- **Layer 1:** No Gemini API key — template/algorithmic only
- **Layer 2:** Gemini API key present — AI-enhanced features active

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `8002` |
| `GEMINI_API_KEY` | Google Gemini API key | — (Layer 1 without) |
| `AI_MODEL` | Gemini model to use | `gemini-2.0-flash` |
| `CORE_SERVICE_URL` | Core service for project data | `http://localhost:3001` |

## Development

```bash
cd services/ai-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8002
```

## Tests

```bash
cd services/ai-service && pytest tests/
```

## Docker

`Dockerfile` — Python 3.11 slim image with pip dependencies.

## Dependencies

- core-service (project data for AI context)
- Google Gemini API (optional — Layer 2)
