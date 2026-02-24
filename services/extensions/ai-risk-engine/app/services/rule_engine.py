"""
AI Risk Engine — Rule-Based Engine

Stage 1: Deterministic, transparent, configurable.
Every result shows which rules triggered and why.

Evolution Strategy:
  Stage 1 (MVP): Rule-Based Engine → current
  Stage 2 (>=50 projects): Hybrid rule + regression
  Stage 3 (>=200 projects): Full ML replaces scoring
"""

import uuid
from datetime import datetime
from typing import Optional

from app.models.risk import (
    RiskAssessmentResult,
    RiskCategory,
    RiskFactor,
    RiskLevel,
    RiskRuleConfig,
)


# ── Default Rule Set ──

DEFAULT_RULES: list[RiskRuleConfig] = [
    RiskRuleConfig(
        id="R001",
        name="low_float_warning",
        category=RiskCategory.SCHEDULE,
        condition="low_float",
        weight=0.25,
        riskContribution=0.30,
        explanationTemplate="Activity float ({float_days} days) is below threshold ({threshold} days)",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R002",
        name="resource_overallocation",
        category=RiskCategory.RESOURCE,
        condition="resource_over_90",
        weight=0.20,
        riskContribution=0.25,
        explanationTemplate="Resource utilization at {utilization}% — exceeds 90% threshold",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R003",
        name="predecessor_delay_cascade",
        category=RiskCategory.DEPENDENCY,
        condition="predecessor_delayed",
        weight=0.30,
        riskContribution=0.35,
        explanationTemplate="{delayed_count} predecessor(s) delayed — cascade risk",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R004",
        name="weather_sensitivity",
        category=RiskCategory.WEATHER,
        condition="outdoor_rain_risk",
        weight=0.15,
        riskContribution=0.20,
        explanationTemplate="Outdoor activity — rain probability {rain_prob}%",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R005",
        name="critical_path_behind",
        category=RiskCategory.SCHEDULE,
        condition="critical_path_behind",
        weight=0.30,
        riskContribution=0.40,
        explanationTemplate="Critical path activity — progress {actual}% (expected {expected}%)",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R006",
        name="cost_overrun_warning",
        category=RiskCategory.COST,
        condition="cpi_below_threshold",
        weight=0.20,
        riskContribution=0.25,
        explanationTemplate="CPI at {cpi} — below 0.95 threshold, cost overrun risk",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R007",
        name="schedule_variance_warning",
        category=RiskCategory.SCHEDULE,
        condition="spi_below_threshold",
        weight=0.20,
        riskContribution=0.25,
        explanationTemplate="SPI at {spi} — below 0.95 threshold, schedule slippage risk",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R008",
        name="trade_stacking_risk",
        category=RiskCategory.COMPLEXITY,
        condition="trade_stacking",
        weight=0.25,
        riskContribution=0.30,
        explanationTemplate="{stacked_trades} trades in zone {zone_name} — stacking risk",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R009",
        name="open_constraints_high",
        category=RiskCategory.DEPENDENCY,
        condition="high_open_constraints",
        weight=0.20,
        riskContribution=0.25,
        explanationTemplate="{open_count} open constraints — {critical_count} critical",
        isActive=True,
    ),
    RiskRuleConfig(
        id="R010",
        name="ppc_declining",
        category=RiskCategory.SCHEDULE,
        condition="ppc_declining",
        weight=0.20,
        riskContribution=0.25,
        explanationTemplate="PPC trending down: {current_ppc}% (prev {prev_ppc}%) — reliability declining",
        isActive=True,
    ),
]


class RuleBasedRiskEngine:
    """
    Stage 1: Deterministic, transparent, configurable.
    Every result shows which rules triggered, with what weight, and why.
    """

    def __init__(self, rules: Optional[list[RiskRuleConfig]] = None):
        self.rules = rules or DEFAULT_RULES

    def assess(
        self,
        project_id: str,
        activity_data: list[dict],
        project_context: dict,
    ) -> RiskAssessmentResult:
        """
        Assess risk for a project based on activity data and context.

        Args:
            project_id: The project to assess
            activity_data: List of activity records with metrics
            project_context: Project-level metrics (EVM, PPC, constraints, etc.)
        """
        active_rules = [r for r in self.rules if r.is_active]
        triggered_factors: list[RiskFactor] = []
        total_score = 0.0

        for rule in active_rules:
            result = self._evaluate_rule(rule, activity_data, project_context)
            if result is not None:
                triggered_factors.append(result)
                total_score += rule.weight * rule.risk_contribution

        # Calculate data completeness
        data_completeness = self._calculate_data_completeness(
            activity_data, project_context
        )

        # Confidence = data completeness percentage
        confidence = data_completeness * 100

        # Generate recommendations based on triggered rules
        recommendations = self._generate_recommendations(triggered_factors)

        return RiskAssessmentResult(
            id=str(uuid.uuid4()),
            projectId=project_id,
            timestamp=datetime.utcnow(),
            overallRisk=self._score_to_level(total_score),
            delayProbability=min(total_score, 1.0),
            confidenceScore=confidence,
            factors=triggered_factors,
            recommendations=recommendations,
            engineStage="rule_based_v1",
            dataCompleteness=data_completeness,
            rulesEvaluated=len(active_rules),
            rulesTriggered=len(triggered_factors),
        )

    def _evaluate_rule(
        self,
        rule: RiskRuleConfig,
        activities: list[dict],
        context: dict,
    ) -> Optional[RiskFactor]:
        """Evaluate a single rule against project data."""

        condition = rule.condition

        if condition == "low_float":
            threshold = context.get("float_threshold_days", 3)
            low_float_activities = [
                a
                for a in activities
                if a.get("total_float") is not None
                and a["total_float"] < threshold
            ]
            if low_float_activities:
                avg_float = sum(
                    a["total_float"] for a in low_float_activities
                ) / len(low_float_activities)
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=avg_float,
                    threshold=float(threshold),
                    explanation=rule.explanation_template.format(
                        float_days=round(avg_float, 1),
                        threshold=threshold,
                    ),
                )

        elif condition == "resource_over_90":
            utilization = context.get("resource_utilization")
            if utilization is not None and utilization > 0.90:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=utilization,
                    threshold=0.90,
                    explanation=rule.explanation_template.format(
                        utilization=round(utilization * 100, 1)
                    ),
                )

        elif condition == "predecessor_delayed":
            delayed_count = sum(
                1
                for a in activities
                if any(
                    p.get("is_delayed", False)
                    for p in a.get("predecessors", [])
                )
            )
            if delayed_count > 0:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=float(delayed_count),
                    threshold=0.0,
                    explanation=rule.explanation_template.format(
                        delayed_count=delayed_count
                    ),
                )

        elif condition == "outdoor_rain_risk":
            rain_prob = context.get("weather_rain_probability")
            outdoor_count = sum(
                1 for a in activities if a.get("is_outdoor", False)
            )
            if rain_prob is not None and rain_prob > 0.6 and outdoor_count > 0:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=rain_prob,
                    threshold=0.6,
                    explanation=rule.explanation_template.format(
                        rain_prob=round(rain_prob * 100, 1)
                    ),
                )

        elif condition == "critical_path_behind":
            critical_behind = [
                a
                for a in activities
                if a.get("is_critical", False)
                and a.get("percent_complete") is not None
                and a.get("expected_percent") is not None
                and a["percent_complete"] < a["expected_percent"]
            ]
            if critical_behind:
                worst = min(
                    critical_behind,
                    key=lambda a: a["percent_complete"]
                    - a["expected_percent"],
                )
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=worst["percent_complete"],
                    threshold=worst["expected_percent"],
                    explanation=rule.explanation_template.format(
                        actual=round(worst["percent_complete"], 1),
                        expected=round(worst["expected_percent"], 1),
                    ),
                )

        elif condition == "cpi_below_threshold":
            cpi = context.get("cpi")
            if cpi is not None and cpi < 0.95:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=cpi,
                    threshold=0.95,
                    explanation=rule.explanation_template.format(
                        cpi=round(cpi, 3)
                    ),
                )

        elif condition == "spi_below_threshold":
            spi = context.get("spi")
            if spi is not None and spi < 0.95:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=spi,
                    threshold=0.95,
                    explanation=rule.explanation_template.format(
                        spi=round(spi, 3)
                    ),
                )

        elif condition == "trade_stacking":
            stacking_zones = context.get("stacking_zones", [])
            if stacking_zones:
                worst_zone = max(stacking_zones, key=lambda z: z.get("trade_count", 0))
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=float(worst_zone.get("trade_count", 0)),
                    threshold=1.0,
                    explanation=rule.explanation_template.format(
                        stacked_trades=worst_zone.get("trade_count", 0),
                        zone_name=worst_zone.get("zone_name", "unknown"),
                    ),
                )

        elif condition == "high_open_constraints":
            open_count = context.get("open_constraints", 0)
            critical_count = context.get("critical_constraints", 0)
            threshold = context.get("constraint_threshold", 5)
            if open_count > threshold:
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=float(open_count),
                    threshold=float(threshold),
                    explanation=rule.explanation_template.format(
                        open_count=open_count,
                        critical_count=critical_count,
                    ),
                )

        elif condition == "ppc_declining":
            current_ppc = context.get("current_ppc")
            prev_ppc = context.get("previous_ppc")
            if (
                current_ppc is not None
                and prev_ppc is not None
                and current_ppc < prev_ppc
            ):
                return RiskFactor(
                    ruleId=rule.id,
                    name=rule.name,
                    category=rule.category,
                    weight=rule.weight,
                    currentValue=current_ppc,
                    threshold=prev_ppc,
                    explanation=rule.explanation_template.format(
                        current_ppc=round(current_ppc, 1),
                        prev_ppc=round(prev_ppc, 1),
                    ),
                )

        return None

    def _calculate_data_completeness(
        self,
        activities: list[dict],
        context: dict,
    ) -> float:
        """Calculate how complete the input data is (affects confidence)."""
        required_fields = [
            "total_float",
            "percent_complete",
            "predecessors",
            "is_critical",
        ]
        context_fields = [
            "resource_utilization",
            "cpi",
            "spi",
            "current_ppc",
            "open_constraints",
        ]

        if not activities:
            return 0.0

        # Check activity data completeness
        activity_completeness = 0.0
        for field in required_fields:
            has_field = sum(
                1 for a in activities if a.get(field) is not None
            )
            activity_completeness += has_field / len(activities)
        activity_completeness /= len(required_fields)

        # Check context data completeness
        context_available = sum(
            1 for f in context_fields if context.get(f) is not None
        )
        context_completeness = context_available / len(context_fields)

        # Weighted average (activity data is more important)
        return activity_completeness * 0.6 + context_completeness * 0.4

    def _score_to_level(self, score: float) -> RiskLevel:
        """Convert numeric score to risk level."""
        if score < 0.25:
            return RiskLevel.LOW
        if score < 0.50:
            return RiskLevel.MEDIUM
        if score < 0.75:
            return RiskLevel.HIGH
        return RiskLevel.CRITICAL

    def _generate_recommendations(
        self, factors: list[RiskFactor]
    ) -> list[str]:
        """Generate actionable recommendations based on triggered rules."""
        recommendations: list[str] = []

        category_recs = {
            RiskCategory.SCHEDULE: [
                "Review critical path activities and consider adding buffers",
                "Increase monitoring frequency for low-float activities",
            ],
            RiskCategory.RESOURCE: [
                "Review resource allocation and consider adding backup crews",
                "Evaluate overtime options for overallocated resources",
            ],
            RiskCategory.DEPENDENCY: [
                "Expedite predecessor activities that are behind schedule",
                "Identify alternative sequencing to reduce dependency chains",
            ],
            RiskCategory.WEATHER: [
                "Prepare weather contingency plans for outdoor activities",
                "Consider rescheduling weather-sensitive work to favorable periods",
            ],
            RiskCategory.COST: [
                "Review cost performance and identify areas for savings",
                "Update Estimate at Completion (EAC) projections",
            ],
            RiskCategory.COMPLEXITY: [
                "Review zone assignments to reduce trade stacking",
                "Consider adding buffer periods between trades in congested zones",
            ],
        }

        triggered_categories = set(f.category for f in factors)
        for cat in triggered_categories:
            recs = category_recs.get(cat, [])
            recommendations.extend(recs)

        return recommendations
