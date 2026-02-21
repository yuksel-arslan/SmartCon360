"""Unit tests for domain models."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement, ElementType, ElementSystem, ELEMENT_SYSTEM_MAP
from app.domain.quantity import (
    QuantityRecord, QuantitySource, QuantityType,
    normalize_unit, UNIT_CONVERSIONS,
)
from app.domain.classification import ClassificationEntry, ClassificationConfidence
from app.domain.cost import CostItem, CostCategory, CurrencyCode
from app.domain.activity import Activity, ActivityStatus
from app.domain.zone import TaktZone, ZoneType
from app.domain.risk import RiskScore, RiskLevel, ComplexityIndex
from app.domain.relationship import Relationship, RelationshipType
from app.domain.project import BIMProject, ProjectMetadata, ProjectStatus


class TestQuantityRecord:
    def test_creation(self) -> None:
        q = QuantityRecord(
            name="NetVolume", value=12.5, unit="m3",
            quantity_type=QuantityType.VOLUME,
            source=QuantitySource.BASE_QUANTITIES,
        )
        assert q.name == "NetVolume"
        assert q.value == 12.5
        assert q.unit == "m3"

    def test_to_dict(self) -> None:
        q = QuantityRecord(
            name="GrossArea", value=45.12345, unit="m2",
            quantity_type=QuantityType.AREA,
            source=QuantitySource.QTO_PROPERTY_SET,
        )
        d = q.to_dict()
        assert d["value"] == 45.1234
        assert d["source"] == "qto_property_set"

    def test_frozen(self) -> None:
        q = QuantityRecord(
            name="Length", value=5.0, unit="m",
            quantity_type=QuantityType.LENGTH,
            source=QuantitySource.GEOMETRY_FALLBACK,
        )
        with pytest.raises(AttributeError):
            q.value = 10.0  # type: ignore[misc]


class TestNormalizeUnit:
    def test_mm_to_m(self) -> None:
        value, unit = normalize_unit(1000.0, "MM")
        assert unit == "m"
        assert abs(value - 1.0) < 1e-6

    def test_sq_ft_to_m2(self) -> None:
        value, unit = normalize_unit(1.0, "SQUARE_FOOT")
        assert unit == "m2"
        assert abs(value - 0.092903) < 1e-6

    def test_cubic_metre_passthrough(self) -> None:
        value, unit = normalize_unit(5.0, "M3")
        assert unit == "m3"
        assert value == 5.0

    def test_unknown_unit_passthrough(self) -> None:
        value, unit = normalize_unit(7.5, "parsec")
        assert unit == "parsec"
        assert value == 7.5

    def test_kg_tonne(self) -> None:
        value, unit = normalize_unit(2.0, "TONNE")
        assert unit == "kg"
        assert abs(value - 2000.0) < 1e-6


class TestClassificationEntry:
    def test_confidence_score_high(self) -> None:
        c = ClassificationEntry(
            uniclass_code="EF_25_10",
            uniclass_description="Walls",
            omniclass_code="23-17 11",
            omniclass_description="Walls",
            confidence=ClassificationConfidence.HIGH,
            match_method="entity+material",
        )
        assert c.confidence_score == 1.0

    def test_confidence_score_medium(self) -> None:
        c = ClassificationEntry(
            uniclass_code="EF_25_10",
            uniclass_description="Walls",
            omniclass_code="23-17 11",
            omniclass_description="Walls",
            confidence=ClassificationConfidence.MEDIUM,
            match_method="entity",
        )
        assert c.confidence_score == 0.6

    def test_confidence_score_low(self) -> None:
        c = ClassificationEntry(
            uniclass_code="UNCLASSIFIED",
            uniclass_description="Unclassified",
            omniclass_code="UNCLASSIFIED",
            omniclass_description="Unclassified",
            confidence=ClassificationConfidence.LOW,
            match_method="unknown",
        )
        assert c.confidence_score == 0.2

    def test_to_dict_includes_score(self) -> None:
        c = ClassificationEntry(
            uniclass_code="EF_25_10",
            uniclass_description="Walls",
            omniclass_code="23-17 11",
            omniclass_description="Walls",
            confidence=ClassificationConfidence.HIGH,
            match_method="entity+material",
        )
        d = c.to_dict()
        assert "confidence_score" in d
        assert d["confidence_score"] == 1.0


class TestBIMElement:
    def test_element_type_from_ifc_class(self) -> None:
        assert ElementType.from_ifc_class("IfcWall") == ElementType.WALL
        assert ElementType.from_ifc_class("IfcSlab") == ElementType.SLAB
        assert ElementType.from_ifc_class("IfcUnknownThing") == ElementType.UNKNOWN

    def test_primary_quantity(self, sample_element: BIMElement) -> None:
        pq = sample_element.primary_quantity
        assert pq is not None
        assert pq.source == QuantitySource.BASE_QUANTITIES

    def test_primary_quantity_empty(self) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
        )
        assert elem.primary_quantity is None

    def test_resolved_system_wall(self) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            storey="Level 1",
        )
        assert elem.resolved_system == ElementSystem.SUPERSTRUCTURE

    def test_resolved_system_basement(self) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            storey="Basement B1",
        )
        assert elem.resolved_system == ElementSystem.SUBSTRUCTURE

    def test_resolved_system_mep(self) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcFlowTerminal",
            element_type=ElementType.FLOW_TERMINAL,
        )
        assert elem.resolved_system == ElementSystem.MEP

    def test_to_dict(self, sample_element: BIMElement) -> None:
        d = sample_element.to_dict()
        assert d["global_id"] == "2O2Fr$t4X7Zf8NOew3FLOH"
        assert d["ifc_class"] == "IfcWall"
        assert len(d["quantities"]) == 2
        assert d["classification"] is not None
        assert d["system"] == "Superstructure"


class TestCostItem:
    def test_total_cost(self) -> None:
        ci = CostItem(
            cost_id="CI-0001",
            description="Concrete walls",
            category=CostCategory.MATERIAL,
            unit="m3",
            unit_rate=150.0,
            quantity=10.0,
        )
        assert ci.total_cost == 1500.0

    def test_total_cost_zero_rate(self) -> None:
        ci = CostItem(
            cost_id="CI-0002",
            description="Pending",
            category=CostCategory.MATERIAL,
            unit="m3",
            unit_rate=0.0,
            quantity=100.0,
        )
        assert ci.total_cost == 0.0


class TestActivity:
    def test_is_active(self) -> None:
        a = Activity(
            activity_id="A-001",
            name="Pour concrete",
            trade="Concrete",
            status=ActivityStatus.IN_PROGRESS,
        )
        assert a.is_active is True

    def test_not_active(self) -> None:
        a = Activity(
            activity_id="A-002",
            name="Install rebar",
            trade="Rebar",
            status=ActivityStatus.NOT_STARTED,
        )
        assert a.is_active is False


class TestTaktZone:
    def test_work_density(self) -> None:
        z = TaktZone(
            zone_id="Z-001",
            name="Zone 1",
            zone_type=ZoneType.STOREY,
            element_count=20,
            total_area=100.0,
        )
        assert z.work_density == 0.2

    def test_work_density_zero_area(self) -> None:
        z = TaktZone(
            zone_id="Z-002",
            name="Zone 2",
            zone_type=ZoneType.STOREY,
            element_count=10,
            total_area=0.0,
        )
        assert z.work_density == 0.0


class TestRiskScore:
    def test_compute_level_low(self) -> None:
        assert RiskScore.compute_level(0.1) == RiskLevel.LOW

    def test_compute_level_medium(self) -> None:
        assert RiskScore.compute_level(0.4) == RiskLevel.MEDIUM

    def test_compute_level_high(self) -> None:
        assert RiskScore.compute_level(0.7) == RiskLevel.HIGH

    def test_compute_level_critical(self) -> None:
        assert RiskScore.compute_level(0.9) == RiskLevel.CRITICAL

    def test_from_factors(self) -> None:
        rs = RiskScore.from_factors({"spatial": 0.8, "structural": 0.6})
        assert rs.score == 0.7
        assert rs.level == RiskLevel.HIGH

    def test_from_empty_factors(self) -> None:
        rs = RiskScore.from_factors({})
        assert rs.score == 0.0
        assert rs.level == RiskLevel.LOW


class TestComplexityIndex:
    def test_compute(self) -> None:
        ci = ComplexityIndex.compute(
            relationship_count=5,
            material_count=2,
            quantity_count=4,
        )
        assert ci.score > 0
        assert ci.score <= 1.0
        assert ci.relationship_count == 5

    def test_compute_zero(self) -> None:
        ci = ComplexityIndex.compute(0, 0, 0)
        assert ci.score == 0.0


class TestRelationship:
    def test_creation(self) -> None:
        r = Relationship(
            source_id="elem-a",
            target_id="elem-b",
            relationship_type=RelationshipType.SPATIAL,
            description="Same storey",
        )
        assert r.source_id == "elem-a"
        assert r.relationship_type == RelationshipType.SPATIAL

    def test_to_dict(self) -> None:
        r = Relationship(
            source_id="elem-a",
            target_id="elem-b",
            relationship_type=RelationshipType.STRUCTURAL,
            weight=0.9,
        )
        d = r.to_dict()
        assert d["weight"] == 0.9


class TestBIMProject:
    def test_lifecycle(self, sample_project: BIMProject) -> None:
        assert sample_project.status == ProjectStatus.PENDING

        sample_project.mark_loading()
        assert sample_project.status == ProjectStatus.LOADING

        sample_project.mark_processing()
        assert sample_project.status == ProjectStatus.PROCESSING

        sample_project.mark_completed(100)
        assert sample_project.status == ProjectStatus.COMPLETED
        assert sample_project.element_count == 100
        assert sample_project.completed_at is not None

    def test_mark_failed(self, sample_project: BIMProject) -> None:
        sample_project.mark_failed("Test error")
        assert sample_project.status == ProjectStatus.FAILED
        assert sample_project.error_message == "Test error"
