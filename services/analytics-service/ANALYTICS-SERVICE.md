# ANALYTICS-SERVICE.md

## Overview
Aggregates data from all services to compute dashboard KPIs, trend charts, and performance metrics. Provides pre-computed data for the frontend dashboard, eliminating the need for complex client-side calculations.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **Computation:** Pandas, NumPy
- **Cache:** Redis (pre-computed KPIs)
- **DB:** asyncpg

## Port: 8006

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/dashboard/:projectId | Full dashboard KPI set |
| GET | /analytics/ppc-trend/:projectId | PPC trend (6-52 weeks) |
| GET | /analytics/trade-reliability/:projectId | Trade Reliability Index |
| GET | /analytics/constraint-rate/:projectId | CRR trend |
| GET | /analytics/buffer-status/:planId | Buffer penetration data |
| GET | /analytics/s-curve/:projectId | Planned vs actual S-curve |
| GET | /analytics/resource-histogram/:planId | Resource over time |
| GET | /analytics/project-health/:projectId | AI health score (0-100) |

## Dashboard KPI Response
```json
{
  "ppc": {"current": 93, "trend": "up", "delta": 5},
  "takt_progress": {"current_period": 5, "total_periods": 11, "pct": 45},
  "open_constraints": {"count": 3, "critical": 1},
  "ai_health_score": {"score": 87, "factors": [...]},
  "upcoming_milestones": [...],
  "trade_stacking_risks": [...]
}
```

## Environment Variables
```env
PORT=8006
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=300
```

## Setup & Run
```bash
cd services/analytics-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8006
```
