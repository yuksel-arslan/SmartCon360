"""
AI Risk Engine — API Routes

Endpoints for risk assessment, impact analysis, rule management,
and outcome feedback (for ML training data collection).

All outputs are recommendations — no direct plan changes.
"""

from fastapi import APIRouter, HTTPException, Query

from app.models.risk import (
    AssessmentOutcomeInput,
    AssessmentOutcomeResult,
    AssessProjectRequest,
    RiskAssessmentResult,
    RiskExplanation,
    RiskImpactResult,
    RiskRuleConfig,
    RuleUpdateRequest,
)
from app.services.data_fetcher import (
    fetch_project_activities,
    fetch_project_context,
)
from app.services.rule_engine import DEFAULT_RULES, RuleBasedRiskEngine

router = APIRouter(prefix="/risk-engine", tags=["AI Risk Engine"])

# In-memory storage for assessments (will move to DB in production)
_assessments: dict[str, RiskAssessmentResult] = {}
_outcomes: dict[str, AssessmentOutcomeResult] = {}

# Engine instance (rules can be customized per project)
_project_engines: dict[str, RuleBasedRiskEngine] = {}


def _get_engine(project_id: str | None = None) -> RuleBasedRiskEngine:
    """Get engine instance, with project-specific rules if available."""
    if project_id and project_id in _project_engines:
        return _project_engines[project_id]
    return RuleBasedRiskEngine()


# ── Risk Assessment ──


@router.post(
    "/assess/{project_id}",
    response_model=RiskAssessmentResult,
    summary="Assess project risk",
    description=(
        "Project-wide risk assessment using rule-based engine. "
        "Stage 1: deterministic, transparent. "
        "AI recommendation — does not modify plan directly."
    ),
)
async def assess_project_risk(
    project_id: str,
    request: AssessProjectRequest | None = None,
    user_id: str | None = Query(None, alias="userId"),
) -> RiskAssessmentResult:
    # Fetch project data from core-service
    activities = await fetch_project_activities(project_id, user_id)
    context = await fetch_project_context(project_id, user_id)

    # Filter to specific activities if requested
    if request and request.activity_ids:
        activities = [
            a for a in activities if a.get("id") in request.activity_ids
        ]

    engine = _get_engine(project_id)
    result = engine.assess(project_id, activities, context)

    # Store for later reference / feedback
    _assessments[result.id] = result

    return result


# ── Impact Analysis ──


@router.post(
    "/impact/{activity_id}",
    response_model=RiskImpactResult,
    summary="Analyze delay impact",
    description=(
        "Domino effect analysis for a specific activity delay. "
        "Uses CPM traversal — deterministic."
    ),
)
async def analyze_delay_impact(
    activity_id: str,
    delay_days: int = Query(..., ge=1, le=365),
    project_id: str = Query(..., alias="projectId"),
    user_id: str | None = Query(None, alias="userId"),
) -> RiskImpactResult:
    # Basic impact analysis (will be enhanced with CPM graph traversal)
    activities = await fetch_project_activities(project_id, user_id)

    # Find the source activity
    source = next((a for a in activities if a.get("id") == activity_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Simple cascade analysis: find activities that depend on this one
    # In production, this uses full CPM forward/backward pass
    affected = []
    for a in activities:
        for pred in a.get("predecessors", []):
            if pred.get("id") == activity_id or a.get("trade_id") == source.get("trade_id"):
                from app.models.risk import DelayImpact

                affected.append(
                    DelayImpact(
                        activityId=a["id"],
                        activityName=f"{a.get('trade_name', '')} @ {a.get('location_name', '')}",
                        delayDays=delay_days,
                        isCritical=a.get("is_critical", False),
                    )
                )
                break

    return RiskImpactResult(
        sourceActivityId=activity_id,
        delayDays=delay_days,
        affectedActivities=affected,
        totalProjectDelay=delay_days if source.get("is_critical") else 0,
        affectedCriticalPath=source.get("is_critical", False),
    )


# ── Explainability ──


@router.get(
    "/explain/{assessment_id}",
    response_model=RiskExplanation,
    summary="Get risk explanation",
    description="Explainable output: which rules triggered, weights, reasoning.",
)
async def get_risk_explanation(assessment_id: str) -> RiskExplanation:
    assessment = _assessments.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    # Build human-readable summary
    risk_level = assessment.overall_risk.value
    factor_count = len(assessment.factors)
    summary = (
        f"Risk level: {risk_level.upper()} — "
        f"{factor_count} risk factor(s) identified with "
        f"{assessment.confidence_score:.0f}% confidence."
    )

    limitations = []
    if assessment.data_completeness < 0.5:
        limitations.append(
            "Data completeness below 50% — assessment may be unreliable"
        )
    if assessment.data_completeness < 1.0:
        limitations.append(
            f"Some data fields are missing ({assessment.data_completeness:.0%} complete)"
        )
    limitations.append("Rule-based engine (Stage 1) — no ML model available yet")

    return RiskExplanation(
        summary=summary,
        factors=assessment.factors,
        confidence=assessment.confidence_score,
        engineVersion=assessment.engine_stage,
        dataWindow="Current project snapshot",
        limitations=limitations,
        alternativeInterpretations=[
            "Risk factors may interact — combined effect could be higher or lower",
            "External factors (market conditions, regulatory changes) not included",
        ],
    )


# ── Rule Management ──


@router.get(
    "/rules/{project_id}",
    response_model=list[RiskRuleConfig],
    summary="Get active rules",
    description="List active risk rules for a project. Users can customize.",
)
async def get_active_rules(project_id: str) -> list[RiskRuleConfig]:
    engine = _get_engine(project_id)
    return engine.rules


@router.put(
    "/rules/{project_id}/{rule_id}",
    response_model=RiskRuleConfig,
    summary="Update rule config",
    description="Customize rule weights/thresholds per project.",
)
async def update_rule_config(
    project_id: str,
    rule_id: str,
    update: RuleUpdateRequest,
) -> RiskRuleConfig:
    # Get or create project-specific engine
    if project_id not in _project_engines:
        _project_engines[project_id] = RuleBasedRiskEngine(
            rules=[r.model_copy() for r in DEFAULT_RULES]
        )

    engine = _project_engines[project_id]
    rule = next((r for r in engine.rules if r.id == rule_id), None)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

    if update.weight is not None:
        rule.weight = update.weight
    if update.risk_contribution is not None:
        rule.risk_contribution = update.risk_contribution
    if update.is_active is not None:
        rule.is_active = update.is_active

    return rule


# ── Feedback / Outcome Collection (for ML transition) ──


@router.post(
    "/feedback/{assessment_id}",
    response_model=AssessmentOutcomeResult,
    summary="Record assessment outcome",
    description=(
        "Record actual outcome of a risk assessment. "
        "This data is collected for Stage 2 ML training."
    ),
)
async def record_assessment_outcome(
    assessment_id: str,
    outcome: AssessmentOutcomeInput,
) -> AssessmentOutcomeResult:
    assessment = _assessments.get(assessment_id)
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    import uuid
    from datetime import datetime

    result = AssessmentOutcomeResult(
        id=str(uuid.uuid4()),
        assessmentId=assessment_id,
        projectId=assessment.project_id,
        predictedRisk=assessment.overall_risk,
        predictedDelayProbability=assessment.delay_probability,
        actualDelayed=outcome.actual_delayed,
        actualDelayDays=outcome.actual_delay_days,
        outcomeDate=datetime.utcnow(),
        notes=outcome.notes,
    )

    _outcomes[result.id] = result
    return result


# ── Health / Info ──


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "ai-risk-engine",
        "engine_stage": "rule_based_v1",
        "default_rules_count": len(DEFAULT_RULES),
    }
