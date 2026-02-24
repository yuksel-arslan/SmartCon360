# Takt Service

## Overview

Consolidated Python service for takt time computation, flowline visualization, and Monte Carlo simulation. Merges the former `takt-engine`, `flowline-service`, and `simulation-service` into a single FastAPI application with sub-app mounting.

## Tech Stack

- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **Computation:** NumPy, Pandas
- **Simulation:** SimPy (Discrete Event Simulation)
- **Validation:** Pydantic
- **Database:** SQLAlchemy / asyncpg

## Port & Endpoints

**Port:** 8001

### Takt Engine (`/takt-engine/api/v1/takt`)
- `POST /compute` — Calculate takt time from LBS + trades
- `GET /plans` — List takt plans
- `POST /plans` — Create/save takt plan
- Template-based plan generation

### Flowline (`/api/v1/flowline`)
- `GET /project/:projectId` — Flowline chart data
- Flowline computation and visualization data

### Simulation (`/simulation-engine/api/v1/simulate`)
- `POST /scenario` — Run what-if simulation
- Parameter sweep analysis
- Monte Carlo simulation (configurable iterations)

## Mount Structure

```python
app.mount("/takt-engine", takt_app)           # FastAPI sub-app
app.include_router(flowline_router)           # Flowline endpoints
app.mount("/simulation-engine", simulation_app) # FastAPI sub-app
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `8001` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `CORE_SERVICE_URL` | Core service for project data | `http://localhost:3001` |
| `MONTE_CARLO_ITERATIONS` | Simulation iteration count | `10000` |

## Development

```bash
cd services/takt-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

## Docker

`Dockerfile` — Python 3.11 slim image with pip dependencies.

## Dependencies

- PostgreSQL (via SQLAlchemy)
- core-service (project and LBS data)
