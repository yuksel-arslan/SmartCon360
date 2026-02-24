# AI Risk Engine

## Overview
- **Purpose:** Proactive risk detection and early warning system for construction projects
- **Layer:** Extension (Intelligence Layer)
- **Status:** Development
- **Dependencies:** core-service (data source), Redis (optional cache)

## Architecture

### Evolution Strategy
```
Stage 1 (MVP): Rule-Based Engine ← CURRENT
  → Configurable rules + weighted scoring
  → Float, weather, resource, dependency inputs
  → Confidence score = data completeness %
  → DATA COLLECTION: every assessment + actual outcome logged

Stage 2 (Data >= 50 projects): Hybrid
  → Rule-based + basic regression model
  → Model vs rule comparison dashboard

Stage 3 (Data >= 200 projects): Full ML
  → Trained model replaces rules for scoring
  → Rules remain as guardrails
```

### Key Principle
**AI ONLY RECOMMENDS — NEVER makes direct plan changes.**
All recommendations require human approval.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /risk-engine/assess/{project_id} | Project-wide risk assessment |
| POST | /risk-engine/impact/{activity_id} | Delay domino effect analysis |
| GET | /risk-engine/explain/{assessment_id} | Explainable risk output |
| GET | /risk-engine/rules/{project_id} | List active rules |
| PUT | /risk-engine/rules/{project_id}/{rule_id} | Customize rule config |
| POST | /risk-engine/feedback/{assessment_id} | Record actual outcome (ML data) |
| GET | /risk-engine/health | Service health check |

## Default Rules

| Code | Name | Category | Weight | Trigger |
|------|------|----------|--------|---------|
| R001 | low_float_warning | schedule | 0.25 | Float < threshold days |
| R002 | resource_overallocation | resource | 0.20 | Utilization > 90% |
| R003 | predecessor_delay_cascade | dependency | 0.30 | Predecessor delayed |
| R004 | weather_sensitivity | weather | 0.15 | Outdoor + rain > 60% |
| R005 | critical_path_behind | schedule | 0.30 | Critical activity behind |
| R006 | cost_overrun_warning | cost | 0.20 | CPI < 0.95 |
| R007 | schedule_variance_warning | schedule | 0.20 | SPI < 0.95 |
| R008 | trade_stacking_risk | complexity | 0.25 | Multiple trades in zone |
| R009 | open_constraints_high | dependency | 0.20 | Open constraints > threshold |
| R010 | ppc_declining | schedule | 0.20 | PPC trending down |

## Data Models

See `app/models/risk.py` for full Pydantic models.

## Events
- **Publishes:** risk.assessed, risk.threshold_exceeded
- **Listens:** schedule.updated, progress.recorded, cost.evm.calculated

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 8010 | Service port |
| CORE_SERVICE_URL | http://localhost:3001 | Core service URL |
| OPS_SERVICE_URL | http://localhost:3002 | Ops service URL |
| DATABASE_URL | - | PostgreSQL connection (for persistence) |

## Test Coverage
- Unit: Pending
- Integration: Pending

## Deployment
- Port: 8010
- Docker: ai-risk-engine
- Health check: /health
