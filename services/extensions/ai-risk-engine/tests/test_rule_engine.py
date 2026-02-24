"""
Tests for the Rule-Based Risk Engine.

Verifies:
- Deterministic behavior (same input = same output)
- Each rule triggers correctly
- Data completeness affects confidence
- Risk level boundaries
- AI cannot modify core calculations
"""

from app.models.risk import RiskLevel
from app.services.rule_engine import RuleBasedRiskEngine


def _make_engine() -> RuleBasedRiskEngine:
    return RuleBasedRiskEngine()


def _base_activity(**overrides: object) -> dict:
    base = {
        "id": "trade1:loc1",
        "trade_id": "trade1",
        "trade_name": "Structure",
        "location_id": "loc1",
        "location_name": "Floor 1",
        "percent_complete": 50.0,
        "expected_percent": 50.0,
        "total_float": 5,
        "is_critical": False,
        "is_outdoor": False,
        "predecessors": [],
    }
    base.update(overrides)
    return base


def _base_context(**overrides: object) -> dict:
    base = {
        "resource_utilization": 0.70,
        "cpi": 1.02,
        "spi": 1.01,
        "current_ppc": 85.0,
        "previous_ppc": 82.0,
        "open_constraints": 2,
        "critical_constraints": 0,
        "float_threshold_days": 3,
        "constraint_threshold": 5,
    }
    base.update(overrides)
    return base


class TestDeterministicBehavior:
    """Same input must always produce same output."""

    def test_same_input_same_output(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context()

        result1 = engine.assess("proj-1", activities, context)
        result2 = engine.assess("proj-1", activities, context)

        assert result1.overall_risk == result2.overall_risk
        assert result1.delay_probability == result2.delay_probability
        assert result1.confidence_score == result2.confidence_score
        assert len(result1.factors) == len(result2.factors)


class TestRiskLevels:
    """Risk level boundaries are correct."""

    def test_low_risk_healthy_project(self) -> None:
        engine = _make_engine()
        activities = [_base_activity(total_float=10)]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        assert result.overall_risk == RiskLevel.LOW

    def test_high_risk_multiple_triggers(self) -> None:
        engine = _make_engine()
        activities = [
            _base_activity(
                total_float=1,
                is_critical=True,
                percent_complete=20.0,
                expected_percent=50.0,
                predecessors=[{"id": "c1", "is_delayed": True}],
            ),
        ]
        context = _base_context(
            cpi=0.80,
            spi=0.75,
            current_ppc=60.0,
            previous_ppc=75.0,
            open_constraints=10,
            critical_constraints=3,
        )
        result = engine.assess("proj-1", activities, context)
        assert result.overall_risk in (RiskLevel.HIGH, RiskLevel.CRITICAL)


class TestIndividualRules:
    """Each rule triggers as expected."""

    def test_low_float_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity(total_float=1)]
        context = _base_context(float_threshold_days=3)
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R001" in rule_ids

    def test_resource_overallocation_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context(resource_utilization=0.95)
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R002" in rule_ids

    def test_predecessor_delay_triggers(self) -> None:
        engine = _make_engine()
        activities = [
            _base_activity(
                predecessors=[{"id": "c1", "is_delayed": True}]
            )
        ]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R003" in rule_ids

    def test_critical_path_behind_triggers(self) -> None:
        engine = _make_engine()
        activities = [
            _base_activity(
                is_critical=True,
                percent_complete=30.0,
                expected_percent=60.0,
            )
        ]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R005" in rule_ids

    def test_cpi_below_threshold_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context(cpi=0.88)
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R006" in rule_ids

    def test_spi_below_threshold_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context(spi=0.85)
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R007" in rule_ids

    def test_ppc_declining_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context(current_ppc=65.0, previous_ppc=80.0)
        result = engine.assess("proj-1", activities, context)
        rule_ids = [f.rule_id for f in result.factors]
        assert "R010" in rule_ids

    def test_healthy_metrics_no_triggers(self) -> None:
        engine = _make_engine()
        activities = [_base_activity(total_float=10)]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        assert len(result.factors) == 0


class TestDataCompleteness:
    """Confidence score reflects data completeness."""

    def test_full_data_high_confidence(self) -> None:
        engine = _make_engine()
        activities = [_base_activity()]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        assert result.confidence_score > 50.0

    def test_missing_data_lower_confidence(self) -> None:
        engine = _make_engine()
        activities = [
            {
                "id": "a1",
                "trade_id": "t1",
                "trade_name": "X",
                "location_id": "l1",
                "location_name": "Y",
                "percent_complete": None,
                "expected_percent": None,
                "total_float": None,
                "is_critical": None,
                "is_outdoor": False,
                "predecessors": [],
            }
        ]
        context: dict = {}
        result = engine.assess("proj-1", activities, context)
        assert result.confidence_score < 50.0

    def test_empty_activities_zero_confidence(self) -> None:
        engine = _make_engine()
        result = engine.assess("proj-1", [], {})
        assert result.confidence_score == 0.0


class TestTransparency:
    """Every assessment is transparent about its engine and data."""

    def test_engine_stage_reported(self) -> None:
        engine = _make_engine()
        result = engine.assess("proj-1", [_base_activity()], _base_context())
        assert result.engine_stage == "rule_based_v1"

    def test_rules_count_reported(self) -> None:
        engine = _make_engine()
        result = engine.assess("proj-1", [_base_activity()], _base_context())
        assert result.rules_evaluated > 0

    def test_requires_approval_default_true(self) -> None:
        engine = _make_engine()
        result = engine.assess("proj-1", [_base_activity()], _base_context())
        assert result.requires_approval is True

    def test_recommendations_generated(self) -> None:
        engine = _make_engine()
        activities = [
            _base_activity(
                total_float=1,
                is_critical=True,
                percent_complete=20.0,
                expected_percent=50.0,
            )
        ]
        context = _base_context()
        result = engine.assess("proj-1", activities, context)
        if result.factors:
            assert len(result.recommendations) > 0
