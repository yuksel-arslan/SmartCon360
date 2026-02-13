# SIMULATION-SERVICE.md

## Overview
Runs what-if scenario simulations on takt plans. Supports parameter changes (crew size, takt time, trade sequence), Monte Carlo risk analysis, and impact visualization. Returns simulation results without modifying the actual plan.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **Computation:** NumPy, SciPy (Monte Carlo)
- **Validation:** Pydantic v2

## Port: 8003

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /simulate/what-if | Run a what-if scenario |
| POST | /simulate/monte-carlo | Run Monte Carlo simulation |
| POST | /simulate/compare | Compare multiple scenarios |
| GET | /simulate/history/:projectId | Past simulation results |

## What-if Parameters
```json
{
  "plan_id": "uuid",
  "changes": [
    {"type": "add_crew", "trade_id": "uuid", "count": 2},
    {"type": "change_takt_time", "new_value": 3},
    {"type": "move_trade", "trade_id": "uuid", "new_sequence": 2},
    {"type": "add_buffer", "after_wagon_id": "uuid", "periods": 1},
    {"type": "delay_zone", "zone_id": "uuid", "days": 5}
  ]
}
```

## Response
```json
{
  "original_end_date": "2026-08-15",
  "simulated_end_date": "2026-07-30",
  "delta_days": -16,
  "trade_stacking_conflicts": [],
  "resource_overallocations": [],
  "cost_impact": -12500,
  "risk_score_change": -0.15,
  "flowline_data": {}
}
```

## Environment Variables
```env
PORT=8003
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
MONTE_CARLO_ITERATIONS=10000
```

## Setup & Run
```bash
cd services/simulation-service
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8003
```
