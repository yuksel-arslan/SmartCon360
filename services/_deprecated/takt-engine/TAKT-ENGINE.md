# TAKT-ENGINE.md

## Overview
Core computation engine for Takt Planning. Calculates takt time, generates takt grids, computes flowline data, validates plans for trade stacking, and manages plan versioning. This is the mathematical heart of TaktFlow AI.

## Tech Stack
- **Runtime:** Python 3.11
- **Framework:** FastAPI
- **Language:** Python with type hints
- **Computation:** NumPy, SciPy
- **Validation:** Pydantic v2
- **DB:** asyncpg (direct SQL for performance)
- **Testing:** pytest, pytest-asyncio

## Port: 8001
## Schema: `takt`

## API Endpoints

### Takt Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /takt/plans | Create new takt plan |
| GET | /takt/plans/:planId | Get plan with all data |
| PATCH | /takt/plans/:planId | Update plan settings |
| DELETE | /takt/plans/:planId | Delete plan |
| POST | /takt/plans/:planId/activate | Set as active plan |
| GET | /takt/plans/:planId/versions | List plan versions |

### Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /takt/plans/:planId/zones | List zones |
| POST | /takt/plans/:planId/zones | Add zone |
| PATCH | /takt/plans/:planId/zones/:zoneId | Update zone |
| POST | /takt/plans/:planId/zones/reorder | Reorder zones |
| POST | /takt/plans/:planId/zones/balance | Auto-balance work content |

### Wagons (Trade sequences)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /takt/plans/:planId/wagons | List wagons |
| POST | /takt/plans/:planId/wagons | Add wagon |
| PATCH | /takt/plans/:planId/wagons/:wagonId | Update wagon |
| POST | /takt/plans/:planId/wagons/reorder | Reorder wagons |

### Computation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /takt/compute/grid | Compute full takt grid (assignments) |
| POST | /takt/compute/flowline | Compute flowline data points |
| POST | /takt/compute/validate | Validate plan for conflicts |
| POST | /takt/compute/critical-path | Calculate critical chain |
| GET | /takt/compute/summary/:planId | Plan summary statistics |

## Core Algorithms

### Takt Time Calculation
```python
def calculate_takt_time(zones: list, trades: list, target_duration: int) -> int:
    """
    takt_time = target_duration / (num_zones + num_trades - 1)
    Rounded up to nearest integer day.
    """
```

### Grid Generation
```python
def generate_takt_grid(plan: TaktPlan) -> list[TaktAssignment]:
    """
    For each zone z (1..Z) and wagon w (1..W):
        period = z + w - 1 + buffer_offset(w)
        start_date = plan.start_date + (period - 1) * takt_time
        end_date = start_date + wagon.duration - 1
    """
```

### Trade Stacking Detection
```python
def detect_trade_stacking(assignments: list) -> list[Conflict]:
    """
    For each zone, check if any period has > 1 active trade.
    Returns list of conflicts with zone, period, and involved trades.
    """
```

### Flowline Data
```python
def compute_flowline(plan: TaktPlan) -> FlowlineData:
    """
    Returns array of line segments per wagon:
    [{wagon_id, zone_id, x_start, x_end, y_position, color}]
    Where x = time (periods), y = zone sequence
    """
```

## Database Tables
- `takt.takt_plans` — Plan metadata and configuration
- `takt.takt_zones` — Zone definitions with sequencing
- `takt.takt_wagons` — Trade wagon definitions
- `takt.takt_assignments` — The computed grid (zone × wagon × period)

## Environment Variables
```env
PORT=8001
DATABASE_URL=postgresql://user:pass@localhost:5432/taktflow
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

## Dependencies
```
fastapi==0.115.*
uvicorn==0.34.*
asyncpg==0.30.*
numpy==2.1.*
scipy==1.14.*
pydantic==2.10.*
python-dateutil==2.9.*
```

## Setup & Run
```bash
cd services/takt-engine
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001
```

## Testing
```bash
pytest tests/ -v
pytest tests/ -v --cov=src
```
