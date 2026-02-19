"""FastAPI routes for the simulation service.

All endpoints return the standard TaktFlow envelope: ``{data, error}``.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException

from ..core.simulator import TaktSimulator
from ..models.schemas import (
    APIResponse,
    CompareRequest,
    CompareResult,
    MonteCarloRequest,
    MonteCarloResult,
    SimulationResult,
    WhatIfRequest,
)

logger = logging.getLogger("simulation-service.routes")

router = APIRouter(prefix="/simulate", tags=["simulation"])

# Single shared simulator instance (stateless, so safe to reuse)
_simulator = TaktSimulator()


# ---------------------------------------------------------------------------
# What-If
# ---------------------------------------------------------------------------

@router.post(
    "/what-if",
    response_model=APIResponse,
    summary="Run a what-if scenario simulation",
    description=(
        "Apply one or more hypothetical changes to a base takt plan and "
        "return the impact analysis including schedule delta, stacking "
        "conflicts, cost impact, risk score, and flowline data."
    ),
)
async def simulate_what_if(request: WhatIfRequest) -> APIResponse:
    try:
        start = time.perf_counter()
        result: SimulationResult = _simulator.simulate_what_if(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "what-if simulation completed in %.1f ms  plan_id=%s  delta=%+d days",
            elapsed_ms,
            request.plan_id,
            result.delta_days,
        )
        return APIResponse(data=result.model_dump())
    except ValueError as exc:
        logger.warning("what-if validation error: %s", exc)
        return APIResponse(error=str(exc))
    except Exception as exc:
        logger.exception("what-if simulation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------

@router.post(
    "/monte-carlo",
    response_model=APIResponse,
    summary="Run Monte Carlo risk analysis",
    description=(
        "Execute a Monte Carlo simulation with stochastic duration "
        "variations to produce probabilistic schedule outcomes "
        "(P50, P80, P95), on-time probability, and critical trade "
        "identification."
    ),
)
async def simulate_monte_carlo(request: MonteCarloRequest) -> APIResponse:
    try:
        start = time.perf_counter()
        result: MonteCarloResult = _simulator.simulate_monte_carlo(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "monte-carlo simulation completed in %.1f ms  plan_id=%s  "
            "iterations=%d  p50=%s  p80=%s  p95=%s",
            elapsed_ms,
            request.plan_id,
            request.iterations,
            result.p50_end_date,
            result.p80_end_date,
            result.p95_end_date,
        )
        return APIResponse(data=result.model_dump())
    except ValueError as exc:
        logger.warning("monte-carlo validation error: %s", exc)
        return APIResponse(error=str(exc))
    except Exception as exc:
        logger.exception("monte-carlo simulation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Compare
# ---------------------------------------------------------------------------

@router.post(
    "/compare",
    response_model=APIResponse,
    summary="Compare multiple simulation scenarios",
    description=(
        "Run multiple what-if scenarios against the same base plan and "
        "return a side-by-side comparison with a recommendation for the "
        "best scenario based on risk-adjusted duration and cost."
    ),
)
async def simulate_compare(request: CompareRequest) -> APIResponse:
    try:
        start = time.perf_counter()
        result: CompareResult = _simulator.compare_scenarios(request)
        elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info(
            "compare simulation completed in %.1f ms  plan_id=%s  "
            "scenarios=%d  recommended=%d",
            elapsed_ms,
            request.plan_id,
            len(request.scenarios),
            result.recommendation_index,
        )
        return APIResponse(data=result.model_dump())
    except ValueError as exc:
        logger.warning("compare validation error: %s", exc)
        return APIResponse(error=str(exc))
    except Exception as exc:
        logger.exception("compare simulation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# History (placeholder — will be DB-backed later)
# ---------------------------------------------------------------------------

@router.get(
    "/history/{project_id}",
    response_model=APIResponse,
    summary="Retrieve past simulation results",
    description=(
        "Retrieve previously saved simulation results for a project. "
        "Currently returns an empty list; will be backed by a database "
        "in a future release."
    ),
)
async def get_simulation_history(project_id: str) -> APIResponse:
    logger.info("history requested for project_id=%s (stub)", project_id)
    return APIResponse(data=[])
