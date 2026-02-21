"""Unit tests for Element Graph Builder service.

Tests are limited to the logic that doesn't require an actual IFC model.
"""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement, ElementType
from app.domain.quantity import QuantityRecord, QuantitySource, QuantityType
from app.domain.classification import ClassificationEntry, ClassificationConfidence
from app.domain.risk import ComplexityIndex


class TestComplexityIndexComputation:
    def test_compute_basic(self) -> None:
        ci = ComplexityIndex.compute(
            relationship_count=3,
            material_count=2,
            quantity_count=4,
        )
        assert 0.0 <= ci.score <= 1.0
        assert ci.relationship_count == 3
        assert ci.material_count == 2

    def test_compute_zero(self) -> None:
        ci = ComplexityIndex.compute(0, 0, 0)
        assert ci.score == 0.0

    def test_compute_max(self) -> None:
        ci = ComplexityIndex.compute(20, 10, 20)
        assert ci.score == 1.0

    def test_to_dict(self) -> None:
        ci = ComplexityIndex.compute(5, 2, 3)
        d = ci.to_dict()
        assert "score" in d
        assert "relationship_count" in d


class TestElementRelationshipIntegration:
    def test_element_relationship_list(self) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
        )
        assert elem.relationships == []
        assert elem.complexity_index is None

    def test_element_serializes_relationships(self) -> None:
        from app.domain.relationship import Relationship, RelationshipType

        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
        )
        elem.relationships.append(Relationship(
            source_id="test-001",
            target_id="test-002",
            relationship_type=RelationshipType.SPATIAL,
            description="Same storey",
        ))

        d = elem.to_dict()
        assert len(d["relationships"]) == 1
        assert d["relationships"][0]["relationship_type"] == "spatial"
