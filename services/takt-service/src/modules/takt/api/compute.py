"""Computation API endpoints"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..core.calculator import (
    generate_takt_grid,
    detect_trade_stacking,
    compute_flowline_data,
    calculate_plan_summary,
    calculate_total_periods,
    calculate_end_date,
)
from .plans import plans_store
from datetime import date

router = APIRouter()


class ComputeGridRequest(BaseModel):
    plan_id: str


@router.post("/grid")
async def compute_grid(req: ComputeGridRequest):
    """Compute the full takt grid (all assignments)."""
    plan = plans_store.get(req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    zones = plan["zones"]
    wagons = plan["wagons"]

    assignments = generate_takt_grid(
        zones=zones,
        wagons=wagons,
        start_date=plan["start_date"],
        takt_time=plan["takt_time"],
        buffer_size=plan["buffer_size"],
    )

    # Store assignments in plan
    plan["assignments"] = assignments

    total_periods = calculate_total_periods(len(zones), len(wagons), plan["buffer_size"])
    end_date = calculate_end_date(plan["start_date"], total_periods, plan["takt_time"])

    return {
        "data": {
            "assignments": assignments,
            "total_periods": total_periods,
            "end_date": end_date.isoformat(),
        }
    }


@router.post("/validate")
async def validate_plan(req: ComputeGridRequest):
    """Validate plan for trade stacking and other conflicts."""
    plan = plans_store.get(req.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assignments = plan.get("assignments", [])
    if not assignments:
        # Generate grid first
        assignments = generate_takt_grid(
            zones=plan["zones"],
            wagons=plan["wagons"],
            start_date=plan["start_date"],
            takt_time=plan["takt_time"],
            buffer_size=plan["buffer_size"],
        )

    conflicts = detect_trade_stacking(assignments)

    return {
        "data": {
            "is_valid": len(conflicts) == 0,
            "conflicts": conflicts,
        }
    }


@router.get("/summary/{plan_id}")
async def plan_summary(plan_id: str):
    """Get plan summary statistics."""
    plan = plans_store.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assignments = plan.get("assignments", [])
    summary = calculate_plan_summary(
        assignments=assignments,
        zones=plan["zones"],
        wagons=plan["wagons"],
        start_date=plan["start_date"],
        takt_time=plan["takt_time"],
    )

    return {"data": summary}


@router.get("/flowline/{plan_id}")
async def get_flowline(plan_id: str):
    """Get flowline chart data."""
    plan = plans_store.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    assignments = plan.get("assignments", [])
    if not assignments:
        assignments = generate_takt_grid(
            zones=plan["zones"],
            wagons=plan["wagons"],
            start_date=plan["start_date"],
            takt_time=plan["takt_time"],
            buffer_size=plan["buffer_size"],
        )

    flowline = compute_flowline_data(
        zones=plan["zones"],
        wagons=plan["wagons"],
        assignments=assignments,
        takt_time=plan["takt_time"],
    )

    return {"data": flowline}
