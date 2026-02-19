"""API routes for the AI Planner service.

All endpoints follow the TaktFlow envelope convention:
    Success: { "data": <payload>, "error": null }
    Failure: { "data": null, "error": "<message>" }
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..core.plan_generator import PlanGenerator
from ..models.schemas import (
    DelayPrediction,
    GeneratedPlan,
    HealthScore,
    OptimizePlanRequest,
    PlanRefinementRequest,
    ProjectInput,
    TradeSequenceItem,
    ZoneSuggestion,
)

logger = logging.getLogger("ai-planner.routes")

router = APIRouter(prefix="/ai", tags=["AI Planner"])

# Singleton generator instance
_generator = PlanGenerator()


# ── Request helpers ─────────────────────────────────────────────────────────


class GeneratePlanRequest(BaseModel):
    """Combined request: project parameters + optional free-text description."""

    project_input: ProjectInput
    description: Optional[str] = Field(
        None,
        max_length=5000,
        description="Optional free-text project description for AI-enhanced generation",
    )


class SuggestSequenceRequest(BaseModel):
    """Request for trade sequence suggestion given project + zones."""

    project_input: ProjectInput
    zones: list[ZoneSuggestion]


class PredictDelaysRequest(BaseModel):
    """Request body wrapping plan data for delay prediction."""

    plan_data: dict


class ProjectHealthQuery(BaseModel):
    """Body for project health (used when progress data is posted)."""

    plan_data: dict = Field(default_factory=dict)
    progress_data: dict = Field(default_factory=dict)


# ── Response envelope ───────────────────────────────────────────────────────


def _ok(data: Any) -> dict:
    """Wrap successful response."""
    return {"data": data, "error": None}


def _err(message: str, status: int = 500) -> dict:
    """Wrap error response (also raises HTTPException)."""
    raise HTTPException(status_code=status, detail={"data": None, "error": message})


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/generate-plan", response_model=None)
async def generate_plan(req: GeneratePlanRequest) -> dict:
    """Generate an AI-enhanced takt plan from project parameters.

    If a Gemini API key is configured the plan is refined by AI (Layer 2).
    Otherwise a fully functional template-based plan is returned (Layer 1).
    """
    try:
        description = req.description or req.project_input.description or ""
        plan: GeneratedPlan = await _generator.generate_from_description(
            description=description,
            project_input=req.project_input,
        )
        return _ok(plan.model_dump())
    except Exception as exc:
        logger.exception("generate-plan failed")
        _err(f"Plan generation failed: {exc}")


@router.post("/optimize-plan", response_model=None)
async def optimize_plan(req: OptimizePlanRequest) -> dict:
    """Optimize an existing plan for duration, cost, or risk.

    Accepts the full current plan and returns an optimized version
    with updated takt times, buffers, crew sizes, and alternatives.
    """
    if req.optimization_goal not in ("duration", "cost", "risk"):
        _err(
            f"Invalid optimization_goal '{req.optimization_goal}'. Must be: duration, cost, risk",
            status=422,
        )
    try:
        plan: GeneratedPlan = await _generator.optimize_plan(req)
        return _ok(plan.model_dump())
    except Exception as exc:
        logger.exception("optimize-plan failed")
        _err(f"Plan optimization failed: {exc}")


@router.post("/suggest-zones", response_model=None)
async def suggest_zones(req: ProjectInput) -> dict:
    """Suggest takt zone breakdown for a project.

    Returns zone definitions with balanced work content factors.
    """
    try:
        zones: list[ZoneSuggestion] = await _generator.suggest_zones(req)
        return _ok([z.model_dump() for z in zones])
    except Exception as exc:
        logger.exception("suggest-zones failed")
        _err(f"Zone suggestion failed: {exc}")


@router.post("/suggest-sequence", response_model=None)
async def suggest_sequence(req: SuggestSequenceRequest) -> dict:
    """Suggest optimal trade sequence for given project and zones.

    Returns ordered list of trades with durations, crew sizes, and
    predecessor relationships.
    """
    try:
        trades: list[TradeSequenceItem] = await _generator.suggest_sequence(
            req.project_input, req.zones
        )
        return _ok([t.model_dump() for t in trades])
    except Exception as exc:
        logger.exception("suggest-sequence failed")
        _err(f"Sequence suggestion failed: {exc}")


@router.post("/predict/delays", response_model=None)
async def predict_delays(req: PredictDelaysRequest) -> dict:
    """Predict potential delays in a takt plan.

    Returns trade-zone combinations with elevated delay probability,
    risk factors, and actionable recommendations.
    """
    try:
        predictions: list[DelayPrediction] = await _generator.predict_delays(
            req.plan_data
        )
        return _ok([p.model_dump() for p in predictions])
    except Exception as exc:
        logger.exception("predict-delays failed")
        _err(f"Delay prediction failed: {exc}")


@router.get("/predict/project-health/{project_id}", response_model=None)
async def get_project_health(project_id: str) -> dict:
    """Get project health score.

    When called without body data, returns a baseline health score.
    For full health analysis, use the POST variant with plan and progress data.
    """
    try:
        health: HealthScore = await _generator.calculate_health(
            project_id=project_id,
            plan_data={},
            progress_data={},
        )
        return _ok(health.model_dump())
    except Exception as exc:
        logger.exception("project-health failed")
        _err(f"Health calculation failed: {exc}")


@router.post("/predict/project-health/{project_id}", response_model=None)
async def post_project_health(project_id: str, req: ProjectHealthQuery) -> dict:
    """Compute project health score from plan and progress data.

    Provides schedule, resource, and constraint health sub-scores
    along with prioritized recommendations.
    """
    try:
        health: HealthScore = await _generator.calculate_health(
            project_id=project_id,
            plan_data=req.plan_data,
            progress_data=req.progress_data,
        )
        return _ok(health.model_dump())
    except Exception as exc:
        logger.exception("project-health POST failed")
        _err(f"Health calculation failed: {exc}")


@router.post("/refine-plan", response_model=None)
async def refine_plan(req: PlanRefinementRequest) -> dict:
    """Refine an existing plan using free-text description.

    Takes a base plan and a natural-language description of desired
    changes, then returns a modified plan. Requires Gemini API for
    full refinement; falls back to template regeneration otherwise.
    """
    try:
        # Build a ProjectInput from the base plan for fallback
        from ..core.plan_generator import PlanGenerator as _PG

        pi = _PG()._extract_project_input_from_plan(req.base_plan)
        plan: GeneratedPlan = await _generator.refine_plan(
            base_plan=req.base_plan,
            description=req.description,
            project_input=pi,
        )
        return _ok(plan.model_dump())
    except Exception as exc:
        logger.exception("refine-plan failed")
        _err(f"Plan refinement failed: {exc}")
