"""Pydantic v2 models for the simulation service."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ChangeType(str, Enum):
    """Supported what-if change types."""

    add_crew = "add_crew"
    change_takt_time = "change_takt_time"
    move_trade = "move_trade"
    add_buffer = "add_buffer"
    delay_zone = "delay_zone"
    remove_trade = "remove_trade"
    split_zone = "split_zone"


# ---------------------------------------------------------------------------
# Shared / embedded models
# ---------------------------------------------------------------------------

class SimulationChange(BaseModel):
    """A single what-if change to apply to the base plan."""

    type: ChangeType
    parameters: dict[str, Any] = Field(
        ...,
        description=(
            "Change-specific parameters. Expected keys per type:\n"
            "  add_crew        -> trade_id: str, additional_crew: int\n"
            "  change_takt_time -> new_takt_time: int\n"
            "  move_trade      -> trade_id: str, new_sequence: int\n"
            "  add_buffer      -> after_trade_id: str, buffer_days: int\n"
            "  delay_zone      -> zone_id: str, delay_days: int\n"
            "  remove_trade    -> trade_id: str\n"
            "  split_zone      -> zone_id: str, split_into: list[str]"
        ),
    )


class TradeStacking(BaseModel):
    """Describes a trade-stacking conflict in a zone."""

    zone_id: str
    zone_name: str
    period: int
    trades: list[str]
    start_date: str
    end_date: str


class ResourceImpact(BaseModel):
    """Describes the resource impact of a simulation change."""

    trade_id: str
    trade_name: str
    original_crew: int
    simulated_crew: int
    delta_crew: int


# ---------------------------------------------------------------------------
# Base plan structure (embedded in requests)
# ---------------------------------------------------------------------------

class Wagon(BaseModel):
    """A trade/wagon in the takt train."""

    id: str
    name: str
    sequence: int
    duration_days: int = Field(
        ...,
        description="Planned duration for this trade in one zone (takt time units).",
    )
    crew_size: int = Field(default=1, description="Number of crews assigned.")
    cost_per_day: float = Field(
        default=0.0,
        description="Daily crew cost for cost-impact calculations.",
    )


class Zone(BaseModel):
    """A takt zone in the LBS."""

    id: str
    name: str
    sequence: int


class BasePlan(BaseModel):
    """The base takt plan configuration fed into simulations."""

    zones: list[Zone]
    wagons: list[Wagon]
    takt_time: int = Field(
        ...,
        description="Standard takt period length in working days.",
    )
    start_date: str = Field(
        ...,
        description="ISO-8601 date string (YYYY-MM-DD).",
    )
    working_days: list[int] = Field(
        default=[0, 1, 2, 3, 4],
        description="ISO weekday numbers considered working days (0=Mon .. 6=Sun).",
    )
    buffer_days: int = Field(
        default=0,
        description="Buffer periods (in takt-time units) between consecutive wagons.",
    )


# ---------------------------------------------------------------------------
# What-If
# ---------------------------------------------------------------------------

class WhatIfRequest(BaseModel):
    """Request body for a what-if simulation."""

    plan_id: str
    base_plan: BasePlan
    changes: list[SimulationChange]


class SimulationResult(BaseModel):
    """Result of a single what-if simulation."""

    original_end_date: str
    simulated_end_date: str
    delta_days: int
    trade_stacking_conflicts: list[TradeStacking] = Field(default_factory=list)
    resource_impacts: list[ResourceImpact] = Field(default_factory=list)
    cost_impact: float = Field(
        default=0.0,
        description="Positive = cost increase, negative = savings.",
    )
    risk_score_change: float = Field(
        default=0.0,
        description="Delta risk score (-1.0 to +1.0).  Negative = lower risk.",
    )
    flowline_data: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------

class MonteCarloRequest(BaseModel):
    """Request body for Monte Carlo simulation."""

    plan_id: str
    base_plan: BasePlan
    iterations: int = Field(default=10_000, ge=100, le=100_000)
    duration_variance_pct: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="Coefficient of variation for duration sampling.",
    )
    delay_probability: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="Probability that any trade-zone pair experiences an extra delay.",
    )


class HistogramBin(BaseModel):
    """A single histogram bin for duration distribution."""

    min_days: float
    max_days: float
    count: int
    frequency: float


class MonteCarloResult(BaseModel):
    """Result of a Monte Carlo simulation."""

    p50_end_date: str
    p80_end_date: str
    p95_end_date: str
    mean_duration_days: float
    std_dev_days: float
    on_time_probability: float = Field(
        description="Probability of finishing on or before the deterministic end date.",
    )
    critical_trades: list[str] = Field(
        default_factory=list,
        description="Trade names that most frequently appear on the critical path.",
    )
    histogram: list[HistogramBin] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------

class CompareRequest(BaseModel):
    """Request body for comparing multiple scenarios."""

    plan_id: str
    base_plan: BasePlan
    scenarios: list[list[SimulationChange]]


class CompareResult(BaseModel):
    """Result of comparing multiple simulation scenarios."""

    scenarios: list[SimulationResult]
    recommendation_index: int = Field(
        description="0-based index of the recommended scenario.",
    )
    recommendation_reason: str


# ---------------------------------------------------------------------------
# API envelope
# ---------------------------------------------------------------------------

class APIResponse(BaseModel):
    """Standard API response envelope."""

    data: Any = None
    error: str | None = None
