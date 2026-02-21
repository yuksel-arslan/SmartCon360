"""Tests for BIM QTO domain models."""

from __future__ import annotations

import pytest

from src.modules.bim.domain.models import (
    Classification,
    ClassificationConfidence,
    Element,
    ElementType,
    Quantity,
    QuantitySource,
    QuantityType,
    WBSNode,
    normalize_unit,
)


class TestQuantity:
    """Tests for the Quantity value object."""

    def test_create_quantity(self) -> None:
        q = Quantity(
            name="NetVolume",
            value=12.5,
            unit="m3",
            quantity_type=QuantityType.VOLUME,
            source=QuantitySource.BASE_QUANTITIES,
        )
        assert q.name == "NetVolume"
        assert q.value == 12.5
        assert q.unit == "m3"
        assert q.quantity_type == QuantityType.VOLUME
        assert q.source == QuantitySource.BASE_QUANTITIES

    def test_quantity_to_dict(self) -> None:
        q = Quantity(
            name="Length",
            value=5.123456,
            unit="m",
            quantity_type=QuantityType.LENGTH,
            source=QuantitySource.GEOMETRY_FALLBACK,
        )
        d = q.to_dict()
        assert d["name"] == "Length"
        assert d["value"] == 5.1235  # rounded to 4 decimals
        assert d["unit"] == "m"
        assert d["quantity_type"] == "length"
        assert d["source"] == "geometry_fallback"

    def test_quantity_is_frozen(self) -> None:
        q = Quantity(
            name="Area",
            value=10.0,
            unit="m2",
            quantity_type=QuantityType.AREA,
            source=QuantitySource.QTO_PROPERTY_SET,
        )
        with pytest.raises(AttributeError):
            q.value = 20.0  # type: ignore[misc]


class TestClassification:
    """Tests for the Classification value object."""

    def test_create_classification(self) -> None:
        c = Classification(
            uniclass_code="EF_25_10",
            uniclass_description="Concrete wall systems",
            omniclass_code="23-17 11 13",
            omniclass_description="Cast-in-Place Concrete Walls",
            confidence=ClassificationConfidence.HIGH,
            match_method="entity+material",
        )
        assert c.uniclass_code == "EF_25_10"
        assert c.confidence == ClassificationConfidence.HIGH

    def test_classification_to_dict(self) -> None:
        c = Classification(
            uniclass_code="EF_25_10",
            uniclass_description="Concrete wall systems",
            omniclass_code="23-17 11 13",
            omniclass_description="Cast-in-Place Concrete Walls",
            confidence=ClassificationConfidence.MEDIUM,
            match_method="entity",
        )
        d = c.to_dict()
        assert d["confidence"] == "medium"
        assert d["match_method"] == "entity"


class TestElementType:
    """Tests for ElementType enum."""

    def test_from_ifc_class_known(self) -> None:
        assert ElementType.from_ifc_class("IfcWall") == ElementType.WALL
        assert ElementType.from_ifc_class("IfcSlab") == ElementType.SLAB
        assert ElementType.from_ifc_class("IfcBeam") == ElementType.BEAM

    def test_from_ifc_class_unknown(self) -> None:
        assert ElementType.from_ifc_class("IfcSomethingNew") == ElementType.UNKNOWN


class TestElement:
    """Tests for the Element entity."""

    def _make_element(self, quantities: list[Quantity] | None = None) -> Element:
        return Element(
            global_id="abc123",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            name="Wall-001",
            description="Test wall",
            storey="Level 01",
            material="Concrete",
            quantities=quantities or [],
        )

    def test_primary_quantity_empty(self) -> None:
        elem = self._make_element()
        assert elem.primary_quantity is None

    def test_primary_quantity_prefers_base(self) -> None:
        base = Quantity("NetVolume", 10.0, "m3", QuantityType.VOLUME, QuantitySource.BASE_QUANTITIES)
        qto = Quantity("NetVolume", 9.5, "m3", QuantityType.VOLUME, QuantitySource.QTO_PROPERTY_SET)
        geo = Quantity("GrossVolume", 11.0, "m3", QuantityType.VOLUME, QuantitySource.GEOMETRY_FALLBACK)

        elem = self._make_element(quantities=[geo, qto, base])
        pq = elem.primary_quantity
        assert pq is not None
        assert pq.source == QuantitySource.BASE_QUANTITIES
        assert pq.value == 10.0

    def test_element_to_dict(self) -> None:
        elem = self._make_element(quantities=[
            Quantity("NetVolume", 10.0, "m3", QuantityType.VOLUME, QuantitySource.BASE_QUANTITIES),
        ])
        d = elem.to_dict()
        assert d["global_id"] == "abc123"
        assert d["ifc_class"] == "IfcWall"
        assert len(d["quantities"]) == 1
        assert d["classification"] is None


class TestWBSNode:
    """Tests for the WBSNode aggregate."""

    def test_wbs_node_to_dict_leaf(self) -> None:
        node = WBSNode(
            level=3,
            code="S01.01.01",
            label="Level 01",
            parent_code="S01.01",
            quantity=120.5,
            unit="m3",
            element_count=15,
        )
        d = node.to_dict()
        assert d["level"] == 3
        assert d["quantity"] == 120.5
        assert "children" not in d

    def test_wbs_node_to_dict_with_children(self) -> None:
        child = WBSNode(
            level=3, code="S01.01.01", label="Level 01",
            parent_code="S01.01", quantity=100.0, unit="m3", element_count=10,
        )
        parent = WBSNode(
            level=2, code="S01.01", label="EF_25_10",
            parent_code="S01", quantity=100.0, unit="m3",
            element_count=10, children=[child],
        )
        d = parent.to_dict()
        assert "children" in d
        assert len(d["children"]) == 1
        assert d["children"][0]["code"] == "S01.01.01"


class TestNormalizeUnit:
    """Tests for the unit normalization function."""

    def test_millimetre_to_metre(self) -> None:
        val, unit = normalize_unit(1000.0, "MILLIMETRE")
        assert unit == "m"
        assert abs(val - 1.0) < 1e-6

    def test_square_foot_to_square_metre(self) -> None:
        val, unit = normalize_unit(1.0, "SQUARE_FOOT")
        assert unit == "m2"
        assert abs(val - 0.092903) < 1e-4

    def test_cubic_metre_unchanged(self) -> None:
        val, unit = normalize_unit(5.0, "CUBIC_METRE")
        assert unit == "m3"
        assert val == 5.0

    def test_kilogram_unchanged(self) -> None:
        val, unit = normalize_unit(100.0, "KG")
        assert unit == "kg"
        assert val == 100.0

    def test_tonne_to_kg(self) -> None:
        val, unit = normalize_unit(1.0, "TONNE")
        assert unit == "kg"
        assert val == 1000.0

    def test_unknown_unit_passthrough(self) -> None:
        val, unit = normalize_unit(42.0, "SomethingCustom")
        assert unit == "SomethingCustom"
        assert val == 42.0

    def test_case_insensitive(self) -> None:
        val, unit = normalize_unit(1000.0, "mm")
        assert unit == "m"
        assert abs(val - 1.0) < 1e-6

    def test_foot_to_metre(self) -> None:
        val, unit = normalize_unit(1.0, "FOOT")
        assert unit == "m"
        assert abs(val - 0.3048) < 1e-4
