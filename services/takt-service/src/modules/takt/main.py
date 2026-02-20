"""TaktFlow AI — Takt Engine Service (Port 8001)

Stateless computation service. All persistence is handled by core-service.
This service only receives data, computes, and returns results.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
import logging

from .core.calculator import (
    ZoneInput, WagonInput as WagonCalcInput,
    generate_takt_grid, detect_trade_stacking,
    compute_flowline_data, calculate_total_periods, add_working_days,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("takt-engine")

app = FastAPI(title="TaktFlow AI — Takt Engine (Stateless Compute)", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request/Response Models ──

class ZoneInputModel(BaseModel):
    id: str
    name: str
    sequence: int = Field(ge=1)
    area_sqm: Optional[float] = None


class WagonInputModel(BaseModel):
    id: str
    trade_id: str
    sequence: int = Field(ge=1)
    duration_days: int = Field(ge=1, le=30)
    buffer_after: int = Field(default=0, ge=0)
    crew_size: Optional[int] = None


class ComputeGridRequest(BaseModel):
    """Compute a takt grid from zones and wagons. No persistence."""
    zones: list[ZoneInputModel] = Field(min_length=1)
    wagons: list[WagonInputModel] = Field(min_length=1)
    takt_time: int = Field(ge=1, le=30)
    start_date: date
    buffer_size: int = Field(default=0, ge=0)


class ValidateRequest(BaseModel):
    """Validate a grid for trade stacking conflicts."""
    zones: list[ZoneInputModel] = Field(min_length=1)
    wagons: list[WagonInputModel] = Field(min_length=1)
    takt_time: int = Field(ge=1, le=30)
    start_date: date


class FlowlineRequest(BaseModel):
    """Compute flowline visualization data."""
    zones: list[ZoneInputModel] = Field(min_length=1)
    wagons: list[WagonInputModel] = Field(min_length=1)
    takt_time: int = Field(ge=1, le=30)
    start_date: date


# ── Endpoints ──

@app.get("/health")
def health():
    return {"status": "ok", "service": "takt-engine", "mode": "stateless-compute"}


@app.post("/takt/compute/grid")
def compute_grid(req: ComputeGridRequest):
    """Compute takt grid assignments. Returns computed data without persisting."""
    zones = [ZoneInput(id=z.id, name=z.name, sequence=z.sequence) for z in req.zones]
    wagons = [WagonCalcInput(
        id=w.id, trade_id=w.trade_id, sequence=w.sequence,
        duration_days=w.duration_days, buffer_after=w.buffer_after,
    ) for w in req.wagons]

    assignments = generate_takt_grid(zones, wagons, req.start_date, req.takt_time)
    total_periods = calculate_total_periods(len(zones), len(wagons), req.buffer_size)
    end_date = add_working_days(req.start_date, total_periods * req.takt_time)
    stacking = detect_trade_stacking(assignments)

    logger.info(f"Computed grid: {len(zones)} zones × {len(wagons)} trades = {len(assignments)} assignments")

    return {
        "data": {
            "total_periods": total_periods,
            "start_date": req.start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "num_zones": len(zones),
            "num_trades": len(wagons),
            "assignments": [
                {
                    "zone_id": a.zone_id,
                    "wagon_id": a.wagon_id,
                    "period_number": a.period_number,
                    "planned_start": a.planned_start.isoformat(),
                    "planned_end": a.planned_end.isoformat(),
                }
                for a in assignments
            ],
            "trade_stacking_warnings": stacking,
        },
        "error": None,
    }


@app.post("/takt/compute/validate")
def validate_grid(req: ValidateRequest):
    """Validate a takt grid for trade stacking and conflicts."""
    zones = [ZoneInput(id=z.id, name=z.name, sequence=z.sequence) for z in req.zones]
    wagons = [WagonCalcInput(
        id=w.id, trade_id=w.trade_id, sequence=w.sequence,
        duration_days=w.duration_days, buffer_after=w.buffer_after,
    ) for w in req.wagons]

    assignments = generate_takt_grid(zones, wagons, req.start_date, req.takt_time)
    stacking = detect_trade_stacking(assignments)

    return {
        "data": {
            "valid": len(stacking) == 0,
            "trade_stacking": stacking,
            "total_conflicts": len(stacking),
        },
        "error": None,
    }


@app.post("/takt/compute/flowline")
def compute_flowline(req: FlowlineRequest):
    """Compute flowline visualization data from zones and wagons."""
    zones = [ZoneInput(id=z.id, name=z.name, sequence=z.sequence) for z in req.zones]
    wagons = [WagonCalcInput(
        id=w.id, trade_id=w.trade_id, sequence=w.sequence,
        duration_days=w.duration_days, buffer_after=w.buffer_after,
    ) for w in req.wagons]

    assignments = generate_takt_grid(zones, wagons, req.start_date, req.takt_time)
    flowline = compute_flowline_data(zones, wagons, assignments, req.takt_time)

    today = date.today()
    days_from_start = (today - req.start_date).days
    flowline["today_x"] = max(0, days_from_start)

    return {"data": flowline, "error": None}


# ── Simulation endpoints (imported from simulation module) ──

try:
    from ..simulation.core.simulator import (
        simulate_what_if,
        simulate_monte_carlo,
        compare_scenarios,
    )

    class WhatIfChange(BaseModel):
        change_type: str  # add_crew, change_takt_time, move_trade, add_buffer, delay_zone, remove_trade, split_zone
        params: dict

    class WhatIfRequest(BaseModel):
        zones: list[ZoneInputModel]
        wagons: list[WagonInputModel]
        takt_time: int = Field(ge=1, le=30)
        start_date: date
        changes: list[WhatIfChange] = Field(min_length=1)

    class MonteCarloRequest(BaseModel):
        zones: list[ZoneInputModel]
        wagons: list[WagonInputModel]
        takt_time: int = Field(ge=1, le=30)
        start_date: date
        iterations: int = Field(default=1000, ge=100, le=10000)
        variance_pct: float = Field(default=20.0, ge=5, le=50)
        delay_probability: float = Field(default=0.1, ge=0, le=0.5)
        target_date: Optional[date] = None

    class CompareRequest(BaseModel):
        zones: list[ZoneInputModel]
        wagons: list[WagonInputModel]
        takt_time: int = Field(ge=1, le=30)
        start_date: date
        scenarios: list[dict] = Field(min_length=2)

    @app.post("/simulate/what-if")
    def run_what_if(req: WhatIfRequest):
        """Run a what-if simulation scenario."""
        zones_data = [{"id": z.id, "name": z.name, "sequence": z.sequence} for z in req.zones]
        wagons_data = [{"id": w.id, "trade_id": w.trade_id, "sequence": w.sequence, "duration_days": w.duration_days, "buffer_after": w.buffer_after} for w in req.wagons]
        changes_data = [{"change_type": c.change_type, "params": c.params} for c in req.changes]

        result = simulate_what_if(zones_data, wagons_data, req.takt_time, req.start_date, changes_data)
        return {"data": result, "error": None}

    @app.post("/simulate/monte-carlo")
    def run_monte_carlo(req: MonteCarloRequest):
        """Run Monte Carlo simulation."""
        zones_data = [{"id": z.id, "name": z.name, "sequence": z.sequence} for z in req.zones]
        wagons_data = [{"id": w.id, "trade_id": w.trade_id, "sequence": w.sequence, "duration_days": w.duration_days, "buffer_after": w.buffer_after} for w in req.wagons]

        result = simulate_monte_carlo(
            zones_data, wagons_data, req.takt_time, req.start_date,
            req.iterations, req.variance_pct, req.delay_probability,
            req.target_date,
        )
        return {"data": result, "error": None}

    @app.post("/simulate/compare")
    def run_compare(req: CompareRequest):
        """Compare multiple what-if scenarios."""
        zones_data = [{"id": z.id, "name": z.name, "sequence": z.sequence} for z in req.zones]
        wagons_data = [{"id": w.id, "trade_id": w.trade_id, "sequence": w.sequence, "duration_days": w.duration_days, "buffer_after": w.buffer_after} for w in req.wagons]

        result = compare_scenarios(zones_data, wagons_data, req.takt_time, req.start_date, req.scenarios)
        return {"data": result, "error": None}

    logger.info("Simulation endpoints loaded successfully")

except ImportError as e:
    logger.warning(f"Simulation module not available: {e}. Simulation endpoints disabled.")


if __name__ == "__main__":
    import os
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
