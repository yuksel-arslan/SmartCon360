"""Takt Plans API endpoints"""
from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    CreatePlanRequest, TaktPlanResponse, TaktPlanStatus
)
from ..core.calculator import calculate_total_periods, calculate_end_date
from ..core.policy_client import get_takt_policies
import uuid
from datetime import date

router = APIRouter()

# In-memory store for demo (will be replaced with DB)
plans_store: dict[str, dict] = {}


@router.post("", response_model=TaktPlanResponse, status_code=201)
async def create_plan(req: CreatePlanRequest):
    """Create a new takt plan."""
    plan_id = str(uuid.uuid4())
    num_zones = len(req.zone_ids)
    num_trades = len(req.wagons)
    total_periods = calculate_total_periods(num_zones, num_trades, req.buffer_size)
    end_date = calculate_end_date(req.start_date, total_periods, req.takt_time)

    # Build zones
    zones = []
    for i, zone_id in enumerate(req.zone_ids):
        zones.append({
            "id": str(uuid.uuid4()),
            "plan_id": plan_id,
            "location_id": zone_id,
            "name": f"Zone {chr(65 + i)}",
            "code": f"Z{chr(65 + i)}",
            "sequence": i + 1,
            "work_content_score": None,
            "area_sqm": None,
        })

    # Build wagons
    wagons = []
    for w in req.wagons:
        wagons.append({
            "id": str(uuid.uuid4()),
            "plan_id": plan_id,
            "trade_id": w.trade_id,
            "sequence": w.sequence,
            "duration_days": w.duration_days,
            "crew_size": w.crew_size,
            "buffer_after": w.buffer_after,
        })

    plan = {
        "id": plan_id,
        "project_id": req.project_id,
        "name": req.name,
        "version": 1,
        "status": TaktPlanStatus.DRAFT,
        "takt_time": req.takt_time,
        "num_zones": num_zones,
        "num_trades": num_trades,
        "total_periods": total_periods,
        "start_date": req.start_date,
        "end_date": end_date,
        "buffer_type": req.buffer_type,
        "buffer_size": req.buffer_size,
        "generated_by": "manual",
        "zones": zones,
        "wagons": wagons,
        "assignments": [],
    }

    plans_store[plan_id] = plan
    return plan


@router.get("/{plan_id}", response_model=TaktPlanResponse)
async def get_plan(plan_id: str):
    """Get a takt plan with full data."""
    plan = plans_store.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("/{plan_id}/activate")
async def activate_plan(plan_id: str):
    """Set plan as active."""
    plan = plans_store.get(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    plan["status"] = TaktPlanStatus.ACTIVE
    return {"data": {"id": plan_id, "status": "active"}}


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: str):
    """Delete a takt plan."""
    if plan_id not in plans_store:
        raise HTTPException(status_code=404, detail="Plan not found")
    del plans_store[plan_id]


@router.get("/policies/{project_id}")
async def get_plan_policies(project_id: str):
    """Get contract-driven TaktFlow policies for a project.

    Returns progress tracking unit and design concurrency settings
    based on the project's contract profile.
    """
    policies = await get_takt_policies(project_id)
    return {"data": policies.to_dict()}
