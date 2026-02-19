"""Pydantic v2 schemas for the AI Planner service."""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────────────────


class ProjectInput(BaseModel):
    """Input describing a construction project for AI plan generation."""

    project_type: str = Field(
        ...,
        description="Type of project: hotel, hospital, office, residential, mixed_use, industrial, educational",
        examples=["hotel", "hospital", "office"],
    )
    floor_count: int = Field(..., ge=1, le=200, description="Number of floors")
    total_area_sqm: float = Field(..., gt=0, description="Total area in square meters")
    zone_count: int = Field(
        ..., ge=1, le=100, description="Number of takt zones per floor"
    )
    description: Optional[str] = Field(
        None,
        max_length=5000,
        description="Free-text project description for AI refinement",
    )
    trades: Optional[list[str]] = Field(
        None,
        description="Explicit list of trades, e.g. ['Drywall', 'MEP Rough-in', 'Painting']",
    )
    constraints: Optional[list[str]] = Field(
        None,
        description="Known constraints, e.g. ['Limited crane access', 'Night work restrictions']",
    )
    target_duration_days: Optional[int] = Field(
        None,
        gt=0,
        description="Desired project duration in calendar days",
    )


# ── Generated Plan Components ───────────────────────────────────────────────


class ZoneSuggestion(BaseModel):
    """AI-suggested takt zone definition."""

    zone_id: str = Field(..., description="Unique zone identifier")
    name: str = Field(..., description="Human-readable zone name")
    zone_type: str = Field(
        ...,
        description="Zone category: typical_floor, basement, roof, podium, lobby, mechanical",
    )
    area_sqm: float = Field(..., gt=0, description="Zone area in square meters")
    work_content_factor: float = Field(
        ...,
        ge=0.1,
        le=3.0,
        description="Relative work content vs average (1.0 = average). Used to balance zones.",
    )


class TradeSequenceItem(BaseModel):
    """A single trade in the recommended execution sequence."""

    trade_name: str = Field(..., description="Display name of the trade")
    code: str = Field(..., max_length=10, description="Short code, e.g. DW, MEP, PAINT")
    color: str = Field(..., description="Hex color for flowline visualization")
    sequence_order: int = Field(..., ge=1, description="Position in the takt train")
    estimated_duration_days: int = Field(
        ..., ge=1, le=30, description="Estimated days per zone"
    )
    crew_size: int = Field(..., ge=1, description="Recommended crew size")
    predecessors: list[str] = Field(
        default_factory=list,
        description="List of trade codes that must complete before this trade",
    )


class PlanAlternative(BaseModel):
    """One of up to 3 alternative plan configurations."""

    name: str = Field(
        ...,
        description="Strategy name: aggressive, balanced, or safe",
    )
    takt_time_days: int = Field(..., ge=1, le=30, description="Takt time in days")
    total_duration_days: int = Field(..., ge=1, description="Total project duration")
    risk_score: float = Field(
        ..., ge=0.0, le=1.0, description="Risk score: 0 = low, 1 = extreme"
    )
    trade_stacking_risk: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Probability of trade stacking conflicts",
    )
    description: str = Field(..., description="Brief explanation of this alternative")


class GeneratedPlan(BaseModel):
    """Complete AI-generated takt plan."""

    project_id: str = Field(..., description="Associated project ID")
    zones: list[ZoneSuggestion] = Field(..., description="Zone definitions")
    trades: list[TradeSequenceItem] = Field(
        ..., description="Ordered trade sequence (takt train)"
    )
    takt_time_days: int = Field(..., ge=1, le=30, description="Recommended takt time")
    total_periods: int = Field(..., ge=1, description="Total takt periods")
    buffer_days: int = Field(..., ge=0, description="Buffer between trades in days")
    start_date: str = Field(..., description="ISO date string for plan start")
    end_date: str = Field(..., description="ISO date string for plan end")
    risk_score: float = Field(
        ..., ge=0.0, le=1.0, description="Overall risk score: 0 = low, 1 = extreme"
    )
    alternatives: list[PlanAlternative] = Field(
        default_factory=list,
        max_length=3,
        description="Up to 3 alternative plan strategies",
    )


# ── Optimization & Prediction Request Models ────────────────────────────────


class OptimizePlanRequest(BaseModel):
    """Request to optimize an existing plan."""

    plan_id: str = Field(..., description="ID of the plan to optimize")
    current_plan: dict = Field(
        ..., description="Full current plan data as returned by takt-engine"
    )
    optimization_goal: str = Field(
        ...,
        description="Optimization target: duration, cost, or risk",
        examples=["duration", "cost", "risk"],
    )


class PlanRefinementRequest(BaseModel):
    """Refine an existing plan using free-text description."""

    base_plan: dict = Field(
        ..., description="Current plan data to refine"
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Free-text description of desired changes or project context",
    )


# ── Prediction Response Models ──────────────────────────────────────────────


class DelayPrediction(BaseModel):
    """Predicted delay for a specific trade-zone combination."""

    trade_id: str = Field(..., description="Trade identifier")
    zone_id: str = Field(..., description="Zone identifier")
    probability: float = Field(
        ..., ge=0.0, le=1.0, description="Probability of delay occurring"
    )
    predicted_delay_days: int = Field(
        ..., ge=0, description="Expected delay in days if it occurs"
    )
    risk_factors: list[str] = Field(
        default_factory=list,
        description="Contributing risk factors",
    )
    recommendation: str = Field(
        ..., description="Actionable recommendation to mitigate delay"
    )


class HealthScore(BaseModel):
    """Holistic project health assessment."""

    project_id: str = Field(..., description="Project identifier")
    overall_score: float = Field(
        ..., ge=0.0, le=100.0, description="Overall health: 0-100"
    )
    schedule_health: float = Field(
        ..., ge=0.0, le=100.0, description="Schedule adherence: 0-100"
    )
    resource_health: float = Field(
        ..., ge=0.0, le=100.0, description="Resource utilization health: 0-100"
    )
    constraint_health: float = Field(
        ..., ge=0.0, le=100.0, description="Constraint resolution health: 0-100"
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Prioritized improvement recommendations",
    )
