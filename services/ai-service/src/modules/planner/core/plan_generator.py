"""Core AI plan generation engine with Gemini integration and Layer 1 fallback.

Layer 1 (no API key): Template-based algorithmic plan generation using
construction domain knowledge. Works fully offline.

Layer 2 (Gemini API): AI-enhanced plan generation, optimization, delay
prediction, and health scoring via Google Gemini.
"""

from __future__ import annotations

import json
import logging
import math
import os
import uuid
from datetime import date, timedelta
from typing import Any

from ..models.schemas import (
    DelayPrediction,
    GeneratedPlan,
    HealthScore,
    OptimizePlanRequest,
    PlanAlternative,
    ProjectInput,
    TradeSequenceItem,
    ZoneSuggestion,
)

logger = logging.getLogger("ai-planner.generator")

# ── Domain Knowledge Templates ──────────────────────────────────────────────

# Standard trade sequences by project type. Each entry:
#   (trade_name, code, color, duration_days_per_zone, crew_size, predecessors)
TRADE_TEMPLATES: dict[str, list[tuple[str, str, str, int, int, list[str]]]] = {
    "hotel": [
        ("Structure / Frame", "STR", "#6366f1", 5, 8, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 4, 6, ["STR"]),
        ("Drywall Framing", "DWF", "#10b981", 3, 5, ["MEP1"]),
        ("Drywall Boarding", "DWB", "#14b8a6", 3, 4, ["DWF"]),
        ("MEP Fix", "MEP2", "#3b82f6", 3, 5, ["DWB"]),
        ("Tiling", "TILE", "#8b5cf6", 4, 4, ["MEP2"]),
        ("Joinery & Doors", "JOIN", "#ec4899", 3, 4, ["TILE"]),
        ("Painting", "PAINT", "#f97316", 3, 4, ["JOIN"]),
        ("MEP Trim", "MEP3", "#06b6d4", 2, 4, ["PAINT"]),
        ("Flooring", "FLR", "#84cc16", 2, 3, ["MEP3"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 3, 6, ["FLR"]),
    ],
    "hospital": [
        ("Structure / Frame", "STR", "#6366f1", 5, 10, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 5, 8, ["STR"]),
        ("Medical Gas Rough-in", "MGAS", "#dc2626", 3, 4, ["STR"]),
        ("Drywall Framing", "DWF", "#10b981", 3, 6, ["MEP1", "MGAS"]),
        ("Drywall Boarding", "DWB", "#14b8a6", 3, 5, ["DWF"]),
        ("MEP Fix", "MEP2", "#3b82f6", 4, 6, ["DWB"]),
        ("Medical Gas Fix", "MGAS2", "#b91c1c", 2, 3, ["DWB"]),
        ("Tiling & Epoxy", "TILE", "#8b5cf6", 4, 5, ["MEP2", "MGAS2"]),
        ("Joinery & Doors", "JOIN", "#ec4899", 3, 4, ["TILE"]),
        ("Painting", "PAINT", "#f97316", 3, 4, ["JOIN"]),
        ("MEP Trim", "MEP3", "#06b6d4", 3, 5, ["PAINT"]),
        ("Flooring", "FLR", "#84cc16", 3, 4, ["MEP3"]),
        ("Final Fix & Commissioning", "COMM", "#ef4444", 4, 8, ["FLR"]),
    ],
    "office": [
        ("Structure / Frame", "STR", "#6366f1", 4, 8, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 4, 6, ["STR"]),
        ("Raised Floor Frame", "RFF", "#a3e635", 2, 4, ["MEP1"]),
        ("Drywall / Partitions", "DW", "#10b981", 3, 5, ["RFF"]),
        ("MEP Fix", "MEP2", "#3b82f6", 3, 5, ["DW"]),
        ("Ceiling Grid", "CEIL", "#8b5cf6", 2, 4, ["MEP2"]),
        ("Painting", "PAINT", "#f97316", 2, 4, ["CEIL"]),
        ("Flooring / Carpet", "FLR", "#84cc16", 2, 3, ["PAINT"]),
        ("MEP Trim & Lights", "MEP3", "#06b6d4", 2, 4, ["FLR"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 2, 5, ["MEP3"]),
    ],
    "residential": [
        ("Structure / Frame", "STR", "#6366f1", 5, 8, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 3, 5, ["STR"]),
        ("Drywall Framing", "DWF", "#10b981", 3, 5, ["MEP1"]),
        ("Drywall Boarding", "DWB", "#14b8a6", 3, 4, ["DWF"]),
        ("MEP Fix", "MEP2", "#3b82f6", 3, 5, ["DWB"]),
        ("Tiling (Wet Areas)", "TILE", "#8b5cf6", 3, 4, ["MEP2"]),
        ("Joinery & Doors", "JOIN", "#ec4899", 3, 4, ["TILE"]),
        ("Painting", "PAINT", "#f97316", 3, 4, ["JOIN"]),
        ("Flooring", "FLR", "#84cc16", 2, 3, ["PAINT"]),
        ("MEP Trim", "MEP3", "#06b6d4", 2, 4, ["FLR"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 2, 5, ["MEP3"]),
    ],
    "mixed_use": [
        ("Structure / Frame", "STR", "#6366f1", 5, 10, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 4, 7, ["STR"]),
        ("Drywall Framing", "DWF", "#10b981", 3, 5, ["MEP1"]),
        ("Drywall Boarding", "DWB", "#14b8a6", 3, 5, ["DWF"]),
        ("MEP Fix", "MEP2", "#3b82f6", 3, 6, ["DWB"]),
        ("Tiling", "TILE", "#8b5cf6", 3, 4, ["MEP2"]),
        ("Joinery & Doors", "JOIN", "#ec4899", 3, 4, ["TILE"]),
        ("Painting", "PAINT", "#f97316", 3, 4, ["JOIN"]),
        ("Flooring", "FLR", "#84cc16", 2, 3, ["PAINT"]),
        ("MEP Trim", "MEP3", "#06b6d4", 2, 4, ["FLR"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 3, 6, ["MEP3"]),
    ],
    "industrial": [
        ("Structure / Steel", "STR", "#6366f1", 5, 10, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 4, 6, ["STR"]),
        ("Cladding / Envelope", "CLAD", "#a3e635", 4, 6, ["STR"]),
        ("Heavy MEP Install", "HMEP", "#3b82f6", 5, 8, ["MEP1"]),
        ("Fire Protection", "FIRE", "#dc2626", 3, 4, ["HMEP"]),
        ("Flooring / Slab Finish", "FLR", "#84cc16", 3, 5, ["FIRE"]),
        ("Painting / Coating", "PAINT", "#f97316", 2, 4, ["FLR"]),
        ("MEP Trim & Commission", "MEP3", "#06b6d4", 3, 5, ["PAINT"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 3, 6, ["MEP3"]),
    ],
    "educational": [
        ("Structure / Frame", "STR", "#6366f1", 4, 8, []),
        ("MEP Rough-in", "MEP1", "#f59e0b", 4, 6, ["STR"]),
        ("Drywall / Partitions", "DW", "#10b981", 3, 5, ["MEP1"]),
        ("MEP Fix", "MEP2", "#3b82f6", 3, 5, ["DW"]),
        ("Ceiling & Acoustics", "CEIL", "#8b5cf6", 3, 4, ["MEP2"]),
        ("Painting", "PAINT", "#f97316", 2, 4, ["CEIL"]),
        ("Flooring", "FLR", "#84cc16", 2, 3, ["PAINT"]),
        ("Joinery & Fixtures", "JOIN", "#ec4899", 2, 4, ["FLR"]),
        ("MEP Trim", "MEP3", "#06b6d4", 2, 4, ["JOIN"]),
        ("Final Fix & Snag", "SNAG", "#ef4444", 2, 5, ["MEP3"]),
    ],
}

# Default fallback for unknown project types
DEFAULT_TRADES = TRADE_TEMPLATES["residential"]

# Typical risk factors by constraint category
RISK_FACTORS_BY_CATEGORY: dict[str, list[str]] = {
    "design": [
        "Incomplete drawings",
        "Pending RFI responses",
        "Design changes in progress",
    ],
    "material": [
        "Long lead-time materials",
        "Supply chain disruption risk",
        "Storage space constraints",
    ],
    "equipment": [
        "Crane availability conflict",
        "Equipment mobilization delay",
        "Shared equipment scheduling",
    ],
    "labor": [
        "Skilled labor shortage",
        "Crew availability gaps",
        "Shift restrictions",
    ],
    "space": [
        "Trade stacking in zone",
        "Limited access/egress",
        "Staging area conflict",
    ],
    "predecessor": [
        "Upstream trade delay",
        "Inspection hold pending",
        "Handover not complete",
    ],
    "permit": [
        "Regulatory approval pending",
        "Inspection scheduling delay",
        "Permit conditions unmet",
    ],
    "information": [
        "Missing shop drawings",
        "Pending client decision",
        "Specification clarification needed",
    ],
}

# ── Gemini Prompt Templates ─────────────────────────────────────────────────

PLAN_GENERATION_SYSTEM_PROMPT = """You are TaktFlow AI, an expert construction planning assistant specializing in Takt Time Construction and Location-Based Management Systems (LBMS).

Domain knowledge you must apply:
- Takt time is typically 3-5 business days per zone
- Zones should have roughly equal work content for smooth flow
- Buffers between trades are recommended at 10-20% of takt time
- Trade stacking (multiple trades in one zone simultaneously) must be avoided
- The takt train flows trades sequentially through zones like an assembly line
- Flowlines should be parallel and not cross (crossing = conflict)

When generating plans, always:
1. Size zones for balanced work content
2. Order trades by construction logic (structure -> rough-in -> finish)
3. Include appropriate buffers based on project complexity
4. Generate 3 alternatives: aggressive (minimal buffer), balanced, safe (maximum buffer)
5. Assess risk honestly based on project complexity and constraints

Respond ONLY with valid JSON matching the requested schema. No markdown, no explanation outside JSON."""

PLAN_GENERATION_USER_TEMPLATE = """Generate a takt construction plan for the following project:

Project Type: {project_type}
Floors: {floor_count}
Total Area: {total_area_sqm} sqm
Zones per floor: {zone_count}
{description_section}
{trades_section}
{constraints_section}
{target_section}

Return a JSON object with this exact structure:
{{
  "zones": [
    {{"zone_id": "string", "name": "string", "zone_type": "string", "area_sqm": number, "work_content_factor": number}}
  ],
  "trades": [
    {{"trade_name": "string", "code": "string (max 10 chars)", "color": "hex string", "sequence_order": integer, "estimated_duration_days": integer, "crew_size": integer, "predecessors": ["code1", "code2"]}}
  ],
  "takt_time_days": integer (3-5 typical),
  "buffer_days": integer,
  "risk_score": float (0.0-1.0),
  "alternatives": [
    {{"name": "aggressive|balanced|safe", "takt_time_days": integer, "total_duration_days": integer, "risk_score": float, "trade_stacking_risk": float, "description": "string"}}
  ]
}}"""

OPTIMIZATION_USER_TEMPLATE = """Optimize the following takt construction plan for: {goal}

Current plan:
{plan_json}

Optimization goal: {goal}

Rules:
- For "duration": minimize total duration while keeping risk below 0.6
- For "cost": reduce crew sizes and consolidate trades where safe
- For "risk": increase buffers, add contingency, reduce trade stacking probability

Return the optimized plan in the same JSON structure as the input, with updated values."""

DELAY_PREDICTION_TEMPLATE = """Analyze this takt construction plan and predict potential delays:

{plan_json}

For each trade-zone combination that has elevated delay risk (probability > 0.3), return:
{{
  "predictions": [
    {{
      "trade_id": "string",
      "zone_id": "string",
      "probability": float (0.0-1.0),
      "predicted_delay_days": integer,
      "risk_factors": ["factor1", "factor2"],
      "recommendation": "string"
    }}
  ]
}}

Consider: trade complexity, predecessor chains, zone accessibility, crew scheduling, and typical construction risks."""

REFINEMENT_TEMPLATE = """Refine this takt construction plan based on the user's description:

Current plan:
{plan_json}

User description:
{description}

Adjust the plan according to the user's description. You may:
- Reorder trades
- Adjust takt times
- Modify zone definitions
- Add/remove trades
- Change buffer sizes

Return the refined plan as JSON with the same structure as the original plan, including zones, trades, takt_time_days, buffer_days, risk_score, and alternatives."""


# ── Helper Functions ────────────────────────────────────────────────────────


def _add_working_days(start: date, days: int) -> date:
    """Add N working days (Mon-Fri) to a date."""
    current = start
    added = 0
    while added < days:
        current += timedelta(days=1)
        if current.weekday() < 5:  # Mon=0 .. Fri=4
            added += 1
    return current


def _calculate_total_periods(num_zones: int, num_trades: int, buffer_periods: int = 0) -> int:
    """Total takt periods = zones + trades - 1 + buffer_periods."""
    return num_zones + num_trades - 1 + buffer_periods


def _get_trade_template(project_type: str) -> list[tuple[str, str, str, int, int, list[str]]]:
    """Return the trade template for a project type, falling back to default."""
    return TRADE_TEMPLATES.get(project_type.lower(), DEFAULT_TRADES)


def _compute_zone_area(total_area: float, floor_count: int, zone_count: int) -> float:
    """Area per zone assuming uniform distribution."""
    return round(total_area / (floor_count * zone_count), 1)


# ── AI Client Wrapper ───────────────────────────────────────────────────────


class _GeminiClient:
    """Thin wrapper around google.generativeai for structured plan generation."""

    def __init__(self) -> None:
        self._model = None
        self._available = False
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if api_key:
            try:
                import google.generativeai as genai

                genai.configure(api_key=api_key)
                self._model = genai.GenerativeModel(
                    model_name=os.environ.get("AI_MODEL", "gemini-2.0-flash"),
                    generation_config={
                        "temperature": float(os.environ.get("AI_TEMPERATURE", "0.3")),
                        "max_output_tokens": int(os.environ.get("AI_MAX_TOKENS", "4096")),
                        "response_mime_type": "application/json",
                    },
                )
                self._available = True
                logger.info("Gemini AI client initialized (Layer 2 active)")
            except Exception as exc:
                logger.warning("Failed to initialize Gemini client: %s — falling back to Layer 1", exc)
        else:
            logger.info("GEMINI_API_KEY not set — running in Layer 1 (template) mode")

    @property
    def available(self) -> bool:
        return self._available

    async def generate(self, system_prompt: str, user_prompt: str) -> dict | None:
        """Send a prompt to Gemini and parse the JSON response.

        Returns parsed dict on success, None on failure (caller should
        fall back to Layer 1 templates).
        """
        if not self._available or self._model is None:
            return None
        try:
            response = await self._model.generate_content_async(
                [
                    {"role": "user", "parts": [{"text": system_prompt + "\n\n" + user_prompt}]},
                ]
            )
            text = response.text.strip()
            # Strip markdown fences if the model wraps the JSON
            if text.startswith("```"):
                text = text.split("\n", 1)[1]
                if text.endswith("```"):
                    text = text.rsplit("```", 1)[0]
                text = text.strip()
            return json.loads(text)
        except Exception as exc:
            logger.error("Gemini generation failed: %s — falling back to Layer 1", exc)
            return None


# ── Module-level Gemini Client (singleton) ──────────────────────────────────

_gemini = _GeminiClient()


# ── PlanGenerator ───────────────────────────────────────────────────────────


class PlanGenerator:
    """AI-enhanced takt plan generator with Layer 1 algorithmic fallback.

    All public methods return domain models from ``schemas.py``.
    When Gemini is unavailable the methods produce plans using
    deterministic construction templates — the service never fails
    due to missing AI credentials.
    """

    # ── Generate Plan from Description ──────────────────────────────────

    async def generate_from_description(
        self, description: str, project_input: ProjectInput
    ) -> GeneratedPlan:
        """Generate a full takt plan, optionally enhanced by Gemini."""

        # Try Layer 2 (AI) first
        ai_result = await self._try_ai_generate(description, project_input)
        if ai_result is not None:
            return ai_result

        # Layer 1 fallback: template-based generation
        return self._generate_template_plan(project_input)

    # ── Optimize Plan ───────────────────────────────────────────────────

    async def optimize_plan(self, request: OptimizePlanRequest) -> GeneratedPlan:
        """Optimize an existing plan for duration, cost, or risk."""

        ai_result = await self._try_ai_optimize(request)
        if ai_result is not None:
            return ai_result

        # Layer 1 fallback: deterministic optimization
        return self._optimize_template(request)

    # ── Suggest Zones ───────────────────────────────────────────────────

    async def suggest_zones(self, project_input: ProjectInput) -> list[ZoneSuggestion]:
        """Suggest takt zone breakdown for a project."""

        ai_result = await self._try_ai_zones(project_input)
        if ai_result is not None:
            return ai_result

        return self._generate_template_zones(project_input)

    # ── Suggest Sequence ────────────────────────────────────────────────

    async def suggest_sequence(
        self, project_input: ProjectInput, zones: list[ZoneSuggestion]
    ) -> list[TradeSequenceItem]:
        """Suggest optimal trade sequence for given zones."""

        ai_result = await self._try_ai_sequence(project_input, zones)
        if ai_result is not None:
            return ai_result

        return self._generate_template_trades(project_input)

    # ── Predict Delays ──────────────────────────────────────────────────

    async def predict_delays(self, plan_data: dict) -> list[DelayPrediction]:
        """Predict potential delays in a plan."""

        ai_result = await self._try_ai_delays(plan_data)
        if ai_result is not None:
            return ai_result

        return self._predict_delays_template(plan_data)

    # ── Calculate Health ────────────────────────────────────────────────

    async def calculate_health(
        self, project_id: str, plan_data: dict, progress_data: dict
    ) -> HealthScore:
        """Compute holistic project health score."""

        # Health score is always computed algorithmically (fast, deterministic)
        # AI could be layered on top for narrative but the score itself is math.
        return self._calculate_health_algorithmic(project_id, plan_data, progress_data)

    # ── Refine Plan ─────────────────────────────────────────────────────

    async def refine_plan(
        self, base_plan: dict, description: str, project_input: ProjectInput
    ) -> GeneratedPlan:
        """Refine an existing plan using free-text description via AI."""

        ai_result = await self._try_ai_refine(base_plan, description)
        if ai_result is not None:
            return ai_result

        # Without AI, regenerate from template incorporating any explicit trades
        return self._generate_template_plan(project_input)

    # ════════════════════════════════════════════════════════════════════
    #  Layer 2 — Gemini AI Methods
    # ════════════════════════════════════════════════════════════════════

    async def _try_ai_generate(
        self, description: str, project_input: ProjectInput
    ) -> GeneratedPlan | None:
        desc_section = f"Description: {description}" if description else ""
        trades_section = (
            f"Requested trades: {', '.join(project_input.trades)}"
            if project_input.trades
            else ""
        )
        constraints_section = (
            f"Known constraints: {', '.join(project_input.constraints)}"
            if project_input.constraints
            else ""
        )
        target_section = (
            f"Target duration: {project_input.target_duration_days} days"
            if project_input.target_duration_days
            else ""
        )

        user_prompt = PLAN_GENERATION_USER_TEMPLATE.format(
            project_type=project_input.project_type,
            floor_count=project_input.floor_count,
            total_area_sqm=project_input.total_area_sqm,
            zone_count=project_input.zone_count,
            description_section=desc_section,
            trades_section=trades_section,
            constraints_section=constraints_section,
            target_section=target_section,
        )

        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, user_prompt)
        if data is None:
            return None

        try:
            return self._parse_ai_plan(data, project_input)
        except Exception as exc:
            logger.error("Failed to parse AI plan response: %s", exc)
            return None

    async def _try_ai_optimize(self, request: OptimizePlanRequest) -> GeneratedPlan | None:
        user_prompt = OPTIMIZATION_USER_TEMPLATE.format(
            goal=request.optimization_goal,
            plan_json=json.dumps(request.current_plan, indent=2, default=str),
        )
        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, user_prompt)
        if data is None:
            return None
        try:
            # We need a ProjectInput to fill in plan metadata; extract from current plan
            pi = self._extract_project_input_from_plan(request.current_plan)
            return self._parse_ai_plan(data, pi)
        except Exception as exc:
            logger.error("Failed to parse AI optimization response: %s", exc)
            return None

    async def _try_ai_zones(self, project_input: ProjectInput) -> list[ZoneSuggestion] | None:
        prompt = (
            f"Suggest takt zones for a {project_input.project_type} project with "
            f"{project_input.floor_count} floors, {project_input.total_area_sqm} sqm total, "
            f"target {project_input.zone_count} zones per floor.\n\n"
            f"Return JSON: {{\"zones\": [{{\"zone_id\": str, \"name\": str, \"zone_type\": str, "
            f"\"area_sqm\": float, \"work_content_factor\": float}}]}}"
        )
        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, prompt)
        if data is None:
            return None
        try:
            return [ZoneSuggestion(**z) for z in data.get("zones", [])]
        except Exception as exc:
            logger.error("Failed to parse AI zone suggestions: %s", exc)
            return None

    async def _try_ai_sequence(
        self, project_input: ProjectInput, zones: list[ZoneSuggestion]
    ) -> list[TradeSequenceItem] | None:
        zones_summary = ", ".join(f"{z.name} ({z.zone_type})" for z in zones)
        prompt = (
            f"Suggest the optimal trade sequence for a {project_input.project_type} project "
            f"with zones: {zones_summary}.\n\n"
            f"Return JSON: {{\"trades\": [{{\"trade_name\": str, \"code\": str, \"color\": hex, "
            f"\"sequence_order\": int, \"estimated_duration_days\": int, \"crew_size\": int, "
            f"\"predecessors\": [str]}}]}}"
        )
        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, prompt)
        if data is None:
            return None
        try:
            return [TradeSequenceItem(**t) for t in data.get("trades", [])]
        except Exception as exc:
            logger.error("Failed to parse AI trade sequence: %s", exc)
            return None

    async def _try_ai_delays(self, plan_data: dict) -> list[DelayPrediction] | None:
        user_prompt = DELAY_PREDICTION_TEMPLATE.format(
            plan_json=json.dumps(plan_data, indent=2, default=str)
        )
        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, user_prompt)
        if data is None:
            return None
        try:
            return [DelayPrediction(**p) for p in data.get("predictions", [])]
        except Exception as exc:
            logger.error("Failed to parse AI delay predictions: %s", exc)
            return None

    async def _try_ai_refine(self, base_plan: dict, description: str) -> GeneratedPlan | None:
        user_prompt = REFINEMENT_TEMPLATE.format(
            plan_json=json.dumps(base_plan, indent=2, default=str),
            description=description,
        )
        data = await _gemini.generate(PLAN_GENERATION_SYSTEM_PROMPT, user_prompt)
        if data is None:
            return None
        try:
            pi = self._extract_project_input_from_plan(base_plan)
            return self._parse_ai_plan(data, pi)
        except Exception as exc:
            logger.error("Failed to parse AI refinement response: %s", exc)
            return None

    # ════════════════════════════════════════════════════════════════════
    #  Layer 1 — Template / Algorithmic Fallback Methods
    # ════════════════════════════════════════════════════════════════════

    def _generate_template_plan(self, pi: ProjectInput) -> GeneratedPlan:
        """Fully algorithmic plan generation using domain templates."""

        project_id = str(uuid.uuid4())
        zones = self._generate_template_zones(pi)
        trades = self._generate_template_trades(pi)

        # Determine takt time based on project complexity
        takt_time = self._calculate_takt_time(pi)
        buffer_days = max(1, round(takt_time * 0.15))  # ~15% buffer

        total_zones = len(zones)
        total_trades = len(trades)
        buffer_periods = buffer_days * (total_trades - 1) if total_trades > 1 else 0
        total_periods = _calculate_total_periods(total_zones, total_trades, buffer_periods)

        start_date = date.today() + timedelta(days=7)  # Start next week
        total_working_days = total_periods * takt_time
        end_date = _add_working_days(start_date, total_working_days)

        # Risk assessment
        risk_score = self._assess_risk(pi, takt_time, buffer_days, total_trades)

        # Generate alternatives
        alternatives = self._generate_alternatives(
            pi, zones, trades, takt_time, buffer_days, total_periods
        )

        return GeneratedPlan(
            project_id=project_id,
            zones=zones,
            trades=trades,
            takt_time_days=takt_time,
            total_periods=total_periods,
            buffer_days=buffer_days,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            risk_score=risk_score,
            alternatives=alternatives,
        )

    def _generate_template_zones(self, pi: ProjectInput) -> list[ZoneSuggestion]:
        """Generate zone suggestions from project parameters."""

        zones: list[ZoneSuggestion] = []
        zone_area = _compute_zone_area(pi.total_area_sqm, pi.floor_count, pi.zone_count)

        for floor in range(1, pi.floor_count + 1):
            for z in range(1, pi.zone_count + 1):
                zone_id = f"F{floor:02d}-Z{z:02d}"

                # Determine zone type
                if floor == 1:
                    zone_type = "lobby" if z == 1 else "podium"
                elif floor == pi.floor_count:
                    zone_type = "roof" if z == pi.zone_count else "typical_floor"
                else:
                    zone_type = "typical_floor"

                # Work content factor varies slightly for non-typical zones
                wcf = 1.0
                if zone_type == "lobby":
                    wcf = 1.3  # Lobbies have more finishes
                elif zone_type == "roof":
                    wcf = 0.8  # Roof zones are simpler
                elif zone_type == "podium":
                    wcf = 1.1
                elif zone_type == "mechanical":
                    wcf = 1.5

                zones.append(
                    ZoneSuggestion(
                        zone_id=zone_id,
                        name=f"Floor {floor} - Zone {chr(64 + z)}",
                        zone_type=zone_type,
                        area_sqm=zone_area,
                        work_content_factor=wcf,
                    )
                )

        return zones

    def _generate_template_trades(self, pi: ProjectInput) -> list[TradeSequenceItem]:
        """Generate trade sequence from project type template."""

        template = _get_trade_template(pi.project_type)
        trades: list[TradeSequenceItem] = []

        # If the user provided explicit trades, filter/match against template
        if pi.trades:
            requested = {t.lower().strip() for t in pi.trades}
            for i, (name, code, color, dur, crew, preds) in enumerate(template, 1):
                # Include trade if it roughly matches a requested trade
                if any(
                    req in name.lower() or name.lower() in req or code.lower() in req
                    for req in requested
                ):
                    trades.append(
                        TradeSequenceItem(
                            trade_name=name,
                            code=code,
                            color=color,
                            sequence_order=len(trades) + 1,
                            estimated_duration_days=dur,
                            crew_size=crew,
                            predecessors=preds,
                        )
                    )
            # If matching yielded too few, use the full template
            if len(trades) < 3:
                trades = []

        if not trades:
            for i, (name, code, color, dur, crew, preds) in enumerate(template, 1):
                trades.append(
                    TradeSequenceItem(
                        trade_name=name,
                        code=code,
                        color=color,
                        sequence_order=i,
                        estimated_duration_days=dur,
                        crew_size=crew,
                        predecessors=preds,
                    )
                )

        return trades

    def _calculate_takt_time(self, pi: ProjectInput) -> int:
        """Calculate recommended takt time based on project parameters.

        Heuristic:
        - Smaller zones (< 200 sqm) -> 3 days
        - Medium zones (200-500 sqm) -> 4 days
        - Larger zones (> 500 sqm) -> 5 days
        - Hospital/industrial complexity adds 1 day
        """
        zone_area = _compute_zone_area(pi.total_area_sqm, pi.floor_count, pi.zone_count)

        if zone_area < 200:
            base = 3
        elif zone_area < 500:
            base = 4
        else:
            base = 5

        # Complexity adjustment
        if pi.project_type in ("hospital", "industrial"):
            base = min(base + 1, 5)

        # If a target duration is set, try to fit
        if pi.target_duration_days:
            template = _get_trade_template(pi.project_type)
            num_trades = len(template)
            total_zones = pi.floor_count * pi.zone_count
            # Rough estimate: total_days ~ total_periods * takt
            # total_periods = zones + trades - 1
            periods = total_zones + num_trades - 1
            needed_takt = max(1, pi.target_duration_days // periods)
            # Clamp to 2-5 range and pick the closer to base
            needed_takt = max(2, min(needed_takt, 5))
            base = needed_takt

        return base

    def _assess_risk(
        self, pi: ProjectInput, takt_time: int, buffer_days: int, num_trades: int
    ) -> float:
        """Compute a risk score 0..1 based on project parameters."""
        score = 0.0

        # High floor count increases complexity
        if pi.floor_count > 30:
            score += 0.15
        elif pi.floor_count > 15:
            score += 0.08

        # Many trades increase coordination risk
        if num_trades > 10:
            score += 0.12
        elif num_trades > 7:
            score += 0.06

        # Short takt time is aggressive
        if takt_time <= 2:
            score += 0.2
        elif takt_time == 3:
            score += 0.1

        # Small buffers increase risk
        buffer_ratio = buffer_days / takt_time if takt_time > 0 else 0
        if buffer_ratio < 0.1:
            score += 0.15
        elif buffer_ratio < 0.15:
            score += 0.05

        # Complex project types
        if pi.project_type in ("hospital",):
            score += 0.1
        elif pi.project_type in ("industrial", "mixed_use"):
            score += 0.05

        # Constraints add risk
        if pi.constraints:
            score += min(len(pi.constraints) * 0.04, 0.2)

        return round(min(score, 1.0), 2)

    def _generate_alternatives(
        self,
        pi: ProjectInput,
        zones: list[ZoneSuggestion],
        trades: list[TradeSequenceItem],
        base_takt: int,
        base_buffer: int,
        base_periods: int,
    ) -> list[PlanAlternative]:
        """Generate 3 plan alternatives: aggressive, balanced, safe."""

        total_zones = len(zones)
        total_trades = len(trades)

        alternatives: list[PlanAlternative] = []

        configs = [
            ("aggressive", max(2, base_takt - 1), max(0, base_buffer - 1)),
            ("balanced", base_takt, base_buffer),
            ("safe", min(5, base_takt + 1), base_buffer + 1),
        ]

        for name, takt, buf in configs:
            buf_periods = buf * (total_trades - 1) if total_trades > 1 else 0
            periods = _calculate_total_periods(total_zones, total_trades, buf_periods)
            duration = periods * takt
            risk = self._assess_risk(pi, takt, buf, total_trades)

            # Trade stacking risk correlates with short takt and small buffers
            stacking_risk = max(0.0, min(1.0, 0.5 - (takt * 0.08) - (buf * 0.12)))

            desc_map = {
                "aggressive": (
                    f"Minimum buffers, {takt}-day takt. Fastest completion but highest risk. "
                    f"Requires excellent coordination and reliable supply chain."
                ),
                "balanced": (
                    f"Standard {takt}-day takt with {buf}-day buffers. "
                    f"Balances schedule performance with manageable risk."
                ),
                "safe": (
                    f"Conservative {takt}-day takt with {buf}-day buffers. "
                    f"Maximum protection against delays and trade stacking."
                ),
            }

            alternatives.append(
                PlanAlternative(
                    name=name,
                    takt_time_days=takt,
                    total_duration_days=duration,
                    risk_score=round(risk, 2),
                    trade_stacking_risk=round(stacking_risk, 2),
                    description=desc_map[name],
                )
            )

        return alternatives

    def _optimize_template(self, request: OptimizePlanRequest) -> GeneratedPlan:
        """Deterministic plan optimization (Layer 1)."""

        pi = self._extract_project_input_from_plan(request.current_plan)
        plan = self._generate_template_plan(pi)

        # Apply optimization adjustments
        if request.optimization_goal == "duration":
            # Reduce takt time by 1 (minimum 2) and minimize buffers
            plan.takt_time_days = max(2, plan.takt_time_days - 1)
            plan.buffer_days = max(0, plan.buffer_days - 1)
        elif request.optimization_goal == "cost":
            # Reduce crew sizes by ~20%
            for trade in plan.trades:
                trade.crew_size = max(2, round(trade.crew_size * 0.8))
            # Slightly increase takt to compensate for smaller crews
            plan.takt_time_days = min(5, plan.takt_time_days + 1)
        elif request.optimization_goal == "risk":
            # Increase buffers and takt time
            plan.buffer_days = plan.buffer_days + 1
            plan.takt_time_days = min(5, plan.takt_time_days + 1)
            plan.risk_score = max(0.0, plan.risk_score - 0.15)

        # Recalculate totals
        total_trades = len(plan.trades)
        total_zones = len(plan.zones)
        buf_periods = plan.buffer_days * (total_trades - 1) if total_trades > 1 else 0
        plan.total_periods = _calculate_total_periods(total_zones, total_trades, buf_periods)

        start = date.fromisoformat(plan.start_date)
        plan.end_date = _add_working_days(
            start, plan.total_periods * plan.takt_time_days
        ).isoformat()

        # Regenerate alternatives with new base
        plan.alternatives = self._generate_alternatives(
            pi, plan.zones, plan.trades, plan.takt_time_days, plan.buffer_days, plan.total_periods
        )

        return plan

    def _predict_delays_template(self, plan_data: dict) -> list[DelayPrediction]:
        """Algorithmic delay prediction based on plan structure (Layer 1).

        Heuristics:
        - Trades later in the sequence have higher cumulative risk
        - Zones with high work content factor are more delay-prone
        - Long predecessor chains amplify risk
        """

        predictions: list[DelayPrediction] = []
        trades = plan_data.get("trades", plan_data.get("wagons", []))
        zones = plan_data.get("zones", [])

        if not trades or not zones:
            return predictions

        total_trades = len(trades)

        for zone in zones:
            zone_id = zone.get("zone_id", zone.get("id", "unknown"))
            wcf = zone.get("work_content_factor", 1.0)

            for trade in trades:
                trade_id = trade.get("code", trade.get("trade_id", "unknown"))
                seq = trade.get("sequence_order", trade.get("sequence", 1))
                preds = trade.get("predecessors", [])

                # Base probability increases with sequence position
                base_prob = 0.05 + (seq / total_trades) * 0.25

                # Predecessor chain length adds risk
                pred_risk = len(preds) * 0.05

                # High work content factor adds risk
                wcf_risk = max(0, (wcf - 1.0)) * 0.15

                probability = round(min(base_prob + pred_risk + wcf_risk, 0.95), 2)

                # Only report elevated risks
                if probability < 0.3:
                    continue

                delay_days = max(1, round(probability * 5))

                # Pick risk factors
                factors: list[str] = []
                if seq > total_trades * 0.7:
                    factors.append("Late-sequence trade — cumulative upstream risk")
                if len(preds) >= 2:
                    factors.append(f"Multiple predecessors ({len(preds)}) increase coordination risk")
                if wcf > 1.2:
                    factors.append(f"High work content zone (factor {wcf})")
                if not factors:
                    factors.append("General construction variability")

                # Recommendation
                if probability > 0.6:
                    rec = (
                        f"High delay risk for {trade_id} in {zone_id}. "
                        f"Consider adding a 1-day buffer before this trade and pre-staging materials."
                    )
                else:
                    rec = (
                        f"Moderate delay risk for {trade_id} in {zone_id}. "
                        f"Monitor predecessor completion closely and ensure crew availability."
                    )

                predictions.append(
                    DelayPrediction(
                        trade_id=trade_id,
                        zone_id=zone_id,
                        probability=probability,
                        predicted_delay_days=delay_days,
                        risk_factors=factors,
                        recommendation=rec,
                    )
                )

        # Sort by probability descending, limit to top 20
        predictions.sort(key=lambda p: p.probability, reverse=True)
        return predictions[:20]

    def _calculate_health_algorithmic(
        self, project_id: str, plan_data: dict, progress_data: dict
    ) -> HealthScore:
        """Compute project health from plan structure and progress metrics.

        Score components (each 0-100):
        - schedule_health: based on PPC and variance
        - resource_health: based on crew utilization
        - constraint_health: based on open vs resolved constraints
        """

        # ── Schedule Health ─────────────────────────────────────────────
        ppc = progress_data.get("ppc", 100.0)  # Percent Plan Complete
        variance_days = abs(progress_data.get("variance_days", 0))
        delayed_count = progress_data.get("delayed_assignments", 0)
        total_assignments = progress_data.get("total_assignments", 1)

        schedule_score = ppc  # Start with PPC
        # Penalize for variance
        schedule_score -= min(variance_days * 3, 30)
        # Penalize for delayed assignments
        if total_assignments > 0:
            delay_ratio = delayed_count / total_assignments
            schedule_score -= delay_ratio * 40
        schedule_score = max(0.0, min(100.0, schedule_score))

        # ── Resource Health ─────────────────────────────────────────────
        crew_utilization = progress_data.get("crew_utilization", 0.8)
        overtime_ratio = progress_data.get("overtime_ratio", 0.0)
        resource_score = crew_utilization * 100
        resource_score -= overtime_ratio * 30  # High overtime is unhealthy
        resource_score = max(0.0, min(100.0, resource_score))

        # ── Constraint Health ───────────────────────────────────────────
        total_constraints = progress_data.get("total_constraints", 0)
        resolved_constraints = progress_data.get("resolved_constraints", 0)
        if total_constraints > 0:
            resolution_rate = resolved_constraints / total_constraints
            constraint_score = resolution_rate * 100
        else:
            constraint_score = 100.0  # No constraints = healthy
        constraint_score = max(0.0, min(100.0, constraint_score))

        # ── Overall ─────────────────────────────────────────────────────
        overall = round(
            schedule_score * 0.50 + resource_score * 0.25 + constraint_score * 0.25, 1
        )

        # ── Recommendations ─────────────────────────────────────────────
        recommendations: list[str] = []
        if schedule_score < 70:
            recommendations.append(
                "Schedule health is below target. Review delayed assignments and consider "
                "adding buffers or adjusting takt time."
            )
        if schedule_score < 50:
            recommendations.append(
                "Critical schedule risk. Convene trade coordinators to address root causes "
                "of variance. Consider resequencing trades."
            )
        if resource_score < 70:
            recommendations.append(
                "Resource utilization is suboptimal. Review crew assignments and reduce "
                "overtime where possible."
            )
        if constraint_score < 70:
            recommendations.append(
                f"{total_constraints - resolved_constraints} unresolved constraints. "
                f"Prioritize constraint removal in next lookahead session."
            )
        if overall >= 80 and not recommendations:
            recommendations.append(
                "Project is on track. Maintain current pace and continue weekly constraint screening."
            )

        return HealthScore(
            project_id=project_id,
            overall_score=overall,
            schedule_health=round(schedule_score, 1),
            resource_health=round(resource_score, 1),
            constraint_health=round(constraint_score, 1),
            recommendations=recommendations,
        )

    # ════════════════════════════════════════════════════════════════════
    #  Parsing & Utility
    # ════════════════════════════════════════════════════════════════════

    def _parse_ai_plan(self, data: dict, pi: ProjectInput) -> GeneratedPlan:
        """Parse a Gemini JSON response into a GeneratedPlan model."""

        zones = [ZoneSuggestion(**z) for z in data.get("zones", [])]
        trades = [TradeSequenceItem(**t) for t in data.get("trades", [])]

        takt_time = int(data.get("takt_time_days", 4))
        buffer_days = int(data.get("buffer_days", 1))
        risk_score = float(data.get("risk_score", 0.3))

        total_zones = len(zones) if zones else pi.floor_count * pi.zone_count
        total_trades = len(trades) if trades else len(_get_trade_template(pi.project_type))
        buf_periods = buffer_days * (total_trades - 1) if total_trades > 1 else 0
        total_periods = _calculate_total_periods(total_zones, total_trades, buf_periods)

        start_date = date.today() + timedelta(days=7)
        end_date = _add_working_days(start_date, total_periods * takt_time)

        alternatives = [
            PlanAlternative(**a) for a in data.get("alternatives", [])
        ]
        # Ensure we always have alternatives
        if not alternatives:
            alternatives = self._generate_alternatives(
                pi, zones, trades, takt_time, buffer_days, total_periods
            )

        return GeneratedPlan(
            project_id=str(uuid.uuid4()),
            zones=zones if zones else self._generate_template_zones(pi),
            trades=trades if trades else self._generate_template_trades(pi),
            takt_time_days=takt_time,
            total_periods=total_periods,
            buffer_days=buffer_days,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            risk_score=round(min(max(risk_score, 0.0), 1.0), 2),
            alternatives=alternatives[:3],
        )

    def _extract_project_input_from_plan(self, plan: dict) -> ProjectInput:
        """Best-effort extraction of ProjectInput from an existing plan dict."""

        zones = plan.get("zones", [])
        trades = plan.get("trades", plan.get("wagons", []))
        num_zones = len(zones)
        num_trades = len(trades)

        # Guess floor count and zones per floor
        floor_count = plan.get("floor_count", max(1, num_zones // max(1, plan.get("zone_count", 4))))
        zone_count = plan.get("zone_count", max(1, num_zones // max(1, floor_count)))
        total_area = plan.get("total_area_sqm", num_zones * 300.0)  # ~300 sqm default
        project_type = plan.get("project_type", "residential")

        return ProjectInput(
            project_type=project_type,
            floor_count=max(1, floor_count),
            total_area_sqm=max(100.0, total_area),
            zone_count=max(1, zone_count),
            trades=[t.get("trade_name", t.get("code", "")) for t in trades] if trades else None,
        )
