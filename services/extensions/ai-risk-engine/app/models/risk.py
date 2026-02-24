"""
AI Risk Engine — Data Models

Pydantic models for risk assessment, rules, and outcomes.
Stage 1: Rule-based, transparent, configurable.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskCategory(str, Enum):
    SCHEDULE = "schedule"
    RESOURCE = "resource"
    WEATHER = "weather"
    DEPENDENCY = "dependency"
    COMPLEXITY = "complexity"
    COST = "cost"
    QUALITY = "quality"
    SAFETY = "safety"


# ── Rule Model ──


class RiskRuleConfig(BaseModel):
    """Configurable risk rule definition."""

    id: str = Field(..., description="Rule code, e.g. R001")
    name: str = Field(..., description="Human-readable rule name")
    category: RiskCategory
    condition: str = Field(
        ..., description="Rule condition key (evaluated by engine)"
    )
    weight: float = Field(
        ..., ge=0.0, le=1.0, description="Rule weight in scoring"
    )
    risk_contribution: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        alias="riskContribution",
        description="Risk score contribution when triggered",
    )
    explanation_template: str = Field(
        ...,
        alias="explanationTemplate",
        description="Human-readable explanation template",
    )
    is_active: bool = Field(True, alias="isActive")

    model_config = {"populate_by_name": True}


# ── Risk Factor (triggered rule result) ──


class RiskFactor(BaseModel):
    """Result of a single triggered rule."""

    rule_id: str = Field(..., alias="ruleId")
    name: str
    category: RiskCategory
    weight: float
    current_value: float = Field(..., alias="currentValue")
    threshold: float
    explanation: str

    model_config = {"populate_by_name": True}


# ── Risk Assessment ──


class RiskAssessmentResult(BaseModel):
    """Complete risk assessment output."""

    id: str
    project_id: str = Field(..., alias="projectId")
    timestamp: datetime
    overall_risk: RiskLevel = Field(..., alias="overallRisk")
    delay_probability: float = Field(
        ..., ge=0.0, le=1.0, alias="delayProbability"
    )
    confidence_score: float = Field(
        ..., ge=0.0, le=100.0, alias="confidenceScore"
    )
    factors: list[RiskFactor]
    recommendations: list[str]

    # Transparency fields
    engine_stage: str = Field("rule_based_v1", alias="engineStage")
    data_completeness: float = Field(1.0, alias="dataCompleteness")
    rules_evaluated: int = Field(0, alias="rulesEvaluated")
    rules_triggered: int = Field(0, alias="rulesTriggered")

    source: str = "ai"
    requires_approval: bool = Field(True, alias="requiresApproval")
    approved_by: Optional[str] = Field(None, alias="approvedBy")

    model_config = {"populate_by_name": True}


# ── Impact Analysis ──


class DelayImpact(BaseModel):
    """Impact of a delay on downstream activities."""

    activity_id: str = Field(..., alias="activityId")
    activity_name: str = Field(..., alias="activityName")
    original_finish: Optional[datetime] = Field(None, alias="originalFinish")
    projected_finish: Optional[datetime] = Field(None, alias="projectedFinish")
    delay_days: int = Field(..., alias="delayDays")
    is_critical: bool = Field(False, alias="isCritical")


class RiskImpactResult(BaseModel):
    """Domino effect analysis for a specific delay."""

    source_activity_id: str = Field(..., alias="sourceActivityId")
    delay_days: int = Field(..., alias="delayDays")
    affected_activities: list[DelayImpact] = Field(
        ..., alias="affectedActivities"
    )
    total_project_delay: int = Field(0, alias="totalProjectDelay")
    affected_critical_path: bool = Field(False, alias="affectedCriticalPath")
    cost_impact_estimate: Optional[float] = Field(
        None, alias="costImpactEstimate"
    )

    model_config = {"populate_by_name": True}


# ── Assessment Outcome (for ML training data) ──


class AssessmentOutcomeInput(BaseModel):
    """Record actual outcome of a risk assessment for ML training."""

    actual_delayed: bool = Field(..., alias="actualDelayed")
    actual_delay_days: Optional[int] = Field(None, alias="actualDelayDays")
    notes: Optional[str] = None

    model_config = {"populate_by_name": True}


class AssessmentOutcomeResult(BaseModel):
    """Stored outcome record."""

    id: str
    assessment_id: str = Field(..., alias="assessmentId")
    project_id: str = Field(..., alias="projectId")
    predicted_risk: RiskLevel = Field(..., alias="predictedRisk")
    predicted_delay_probability: float = Field(
        ..., alias="predictedDelayProbability"
    )
    actual_delayed: bool = Field(..., alias="actualDelayed")
    actual_delay_days: Optional[int] = Field(None, alias="actualDelayDays")
    outcome_date: datetime = Field(..., alias="outcomeDate")
    notes: Optional[str] = None

    model_config = {"populate_by_name": True}


# ── API Request/Response ──


class AssessProjectRequest(BaseModel):
    """Request body for project risk assessment."""

    activity_ids: Optional[list[str]] = Field(
        None,
        alias="activityIds",
        description="Specific activities to assess. If None, assess all.",
    )

    model_config = {"populate_by_name": True}


class RuleUpdateRequest(BaseModel):
    """Request to update a rule's configuration."""

    weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    risk_contribution: Optional[float] = Field(
        None, ge=0.0, le=1.0, alias="riskContribution"
    )
    is_active: Optional[bool] = Field(None, alias="isActive")

    model_config = {"populate_by_name": True}


class RiskExplanation(BaseModel):
    """Explainable AI output for a risk assessment."""

    summary: str
    factors: list[RiskFactor]
    confidence: float
    engine_version: str = Field(..., alias="engineVersion")
    data_window: str = Field(..., alias="dataWindow")
    limitations: list[str]
    alternative_interpretations: list[str] = Field(
        ..., alias="alternativeInterpretations"
    )

    model_config = {"populate_by_name": True}
