"""TaktFlow AI — Takt Engine Service (Port 8001)"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
import uuid
import logging

from .core.calculator import (
    ZoneInput, WagonInput as WagonCalcInput,
    generate_takt_grid, detect_trade_stacking,
    compute_flowline_data, calculate_total_periods, add_working_days,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("takt-engine")

app = FastAPI(title="TaktFlow AI — Takt Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store (Phase 1 — will be replaced with PostgreSQL) ──
plans_db: dict[str, dict] = {}


# ── Models ──
class WagonInput(BaseModel):
    trade_id: str
    sequence: int = Field(ge=1)
    duration_days: int = Field(ge=1, le=30)
    crew_size: Optional[int] = None
    buffer_after: int = Field(default=0, ge=0)


class CreatePlanRequest(BaseModel):
    project_id: str
    name: str = Field(max_length=255)
    takt_time: int = Field(ge=1, le=30)
    start_date: date
    buffer_type: str = "time"
    buffer_size: int = Field(default=0, ge=0)
    zone_ids: list[str] = Field(min_length=1)
    zone_names: list[str] = []
    wagons: list[WagonInput] = Field(min_length=1)


class UpdateAssignmentRequest(BaseModel):
    status: Optional[str] = None
    progress_pct: Optional[float] = Field(default=None, ge=0, le=100)
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None


# ── Endpoints ──

@app.get("/health")
def health():
    return {"status": "ok", "service": "takt-engine"}


@app.post("/takt/plans")
def create_plan(req: CreatePlanRequest):
    """Create a new takt plan and compute all assignments."""
    plan_id = str(uuid.uuid4())
    
    # Build zones
    zones = []
    for i, zone_id in enumerate(req.zone_ids):
        name = req.zone_names[i] if i < len(req.zone_names) else f"Zone {chr(65 + i)}"
        zones.append(ZoneInput(id=zone_id, name=name, sequence=i + 1))
    
    # Build wagons
    wagons = []
    for w in req.wagons:
        wagon_id = str(uuid.uuid4())
        wagons.append(WagonCalcInput(
            id=wagon_id,
            trade_id=w.trade_id,
            sequence=w.sequence,
            duration_days=w.duration_days,
            buffer_after=w.buffer_after,
        ))
    
    # Compute grid
    assignments = generate_takt_grid(
        zones=zones,
        wagons=wagons,
        start_date=req.start_date,
        takt_time=req.takt_time,
    )
    
    # Calculate end date
    total_periods = calculate_total_periods(len(zones), len(wagons), req.buffer_size)
    end_date = add_working_days(req.start_date, total_periods * req.takt_time)
    
    # Check for trade stacking
    stacking = detect_trade_stacking(assignments)
    
    # Build response
    plan = {
        "id": plan_id,
        "project_id": req.project_id,
        "name": req.name,
        "version": 1,
        "status": "draft",
        "takt_time": req.takt_time,
        "num_zones": len(zones),
        "num_trades": len(wagons),
        "total_periods": total_periods,
        "start_date": req.start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "buffer_type": req.buffer_type,
        "buffer_size": req.buffer_size,
        "generated_by": "manual",
        "zones": [
            {"id": z.id, "plan_id": plan_id, "name": z.name, "code": f"Z{chr(64 + z.sequence)}", "sequence": z.sequence}
            for z in zones
        ],
        "wagons": [
            {"id": w.id, "plan_id": plan_id, "trade_id": w.trade_id, "sequence": w.sequence, "duration_days": w.duration_days, "buffer_after": w.buffer_after}
            for w in wagons
        ],
        "assignments": [
            {
                "id": str(uuid.uuid4()),
                "plan_id": plan_id,
                "zone_id": a.zone_id,
                "wagon_id": a.wagon_id,
                "period_number": a.period_number,
                "planned_start": a.planned_start.isoformat(),
                "planned_end": a.planned_end.isoformat(),
                "status": "planned",
                "progress_pct": 0,
            }
            for a in assignments
        ],
        "trade_stacking_warnings": stacking,
    }
    
    # Store in memory
    plans_db[plan_id] = plan
    
    logger.info(f"Created plan {plan_id}: {len(zones)} zones × {len(wagons)} trades = {len(assignments)} assignments")
    
    return {"data": plan, "error": None}


@app.get("/takt/plans/{plan_id}")
def get_plan(plan_id: str):
    """Get a takt plan with all zones, wagons, and assignments."""
    plan = plans_db.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"data": plan, "error": None}


@app.delete("/takt/plans/{plan_id}")
def delete_plan(plan_id: str):
    """Delete a takt plan."""
    if plan_id not in plans_db:
        raise HTTPException(status_code=404, detail="Plan not found")
    del plans_db[plan_id]
    return {"message": "Deleted"}


@app.post("/takt/plans/{plan_id}/activate")
def activate_plan(plan_id: str):
    """Set plan status to active."""
    plan = plans_db.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan["status"] = "active"
    return {"data": plan, "error": None}


@app.post("/takt/compute/validate")
def validate_plan(plan_id: str):
    """Validate a plan for trade stacking and other conflicts."""
    plan = plans_db.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Rebuild calculator objects
    zones = [ZoneInput(id=z["id"], name=z["name"], sequence=z["sequence"]) for z in plan["zones"]]
    wagons = [WagonCalcInput(id=w["id"], trade_id=w["trade_id"], sequence=w["sequence"], duration_days=w["duration_days"], buffer_after=w.get("buffer_after", 0)) for w in plan["wagons"]]
    
    assignments = generate_takt_grid(zones, wagons, date.fromisoformat(plan["start_date"]), plan["takt_time"])
    stacking = detect_trade_stacking(assignments)
    
    return {
        "data": {
            "valid": len(stacking) == 0,
            "trade_stacking": stacking,
            "total_conflicts": len(stacking),
        },
        "error": None,
    }


@app.get("/takt/compute/summary/{plan_id}")
def plan_summary(plan_id: str):
    """Get plan statistics summary."""
    plan = plans_db.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    assignments = plan["assignments"]
    completed = sum(1 for a in assignments if a["status"] == "completed")
    in_progress = sum(1 for a in assignments if a["status"] == "in_progress")
    delayed = sum(1 for a in assignments if a["status"] == "delayed")
    planned = sum(1 for a in assignments if a["status"] == "planned")
    total = len(assignments)
    
    return {
        "data": {
            "total_periods": plan["total_periods"],
            "total_days": plan["total_periods"] * plan["takt_time"],
            "start_date": plan["start_date"],
            "end_date": plan["end_date"],
            "num_zones": plan["num_zones"],
            "num_trades": plan["num_trades"],
            "completed_assignments": completed,
            "in_progress_assignments": in_progress,
            "planned_assignments": planned,
            "delayed_assignments": delayed,
            "overall_progress_pct": round((completed / total * 100) if total > 0 else 0, 1),
        },
        "error": None,
    }


@app.get("/flowline/{plan_id}")
def get_flowline(plan_id: str):
    """Get flowline chart data for visualization."""
    plan = plans_db.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    zones = [ZoneInput(id=z["id"], name=z["name"], sequence=z["sequence"]) for z in plan["zones"]]
    wagons = [WagonCalcInput(id=w["id"], trade_id=w["trade_id"], sequence=w["sequence"], duration_days=w["duration_days"], buffer_after=w.get("buffer_after", 0)) for w in plan["wagons"]]
    
    assignments_calc = generate_takt_grid(zones, wagons, date.fromisoformat(plan["start_date"]), plan["takt_time"])
    
    flowline = compute_flowline_data(zones, wagons, assignments_calc, plan["takt_time"])
    
    # Calculate today's x position
    today = date.today()
    days_from_start = (today - date.fromisoformat(plan["start_date"])).days
    flowline["today_x"] = max(0, days_from_start)
    
    return {"data": flowline, "error": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
