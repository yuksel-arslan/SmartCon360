"""Tests for the WBS builder."""

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
)
from src.modules.bim.infrastructure.wbs_builder import WBSBuilder


def _make_element(
    ifc_class: str = "IfcWall",
    storey: str = "Level 01",
    material: str = "Concrete",
    uniclass_code: str = "EF_25_10",
    volume: float = 10.0,
) -> Element:
    elem = Element(
        global_id=f"id-{ifc_class}-{storey}-{volume}",
        ifc_class=ifc_class,
        element_type=ElementType.from_ifc_class(ifc_class),
        name=f"{ifc_class}-test",
        description=None,
        storey=storey,
        material=material,
        quantities=[
            Quantity(
                name="NetVolume",
                value=volume,
                unit="m3",
                quantity_type=QuantityType.VOLUME,
                source=QuantitySource.BASE_QUANTITIES,
            ),
        ],
        classification=Classification(
            uniclass_code=uniclass_code,
            uniclass_description="Test",
            omniclass_code="23-17 11 13",
            omniclass_description="Test",
            confidence=ClassificationConfidence.HIGH,
            match_method="entity+material",
        ),
    )
    return elem


class TestWBSBuilder:
    """Tests for WBS hierarchy building."""

    def test_empty_elements(self) -> None:
        builder = WBSBuilder()
        result = builder.build([])
        assert result == []

    def test_single_element(self) -> None:
        builder = WBSBuilder()
        elements = [_make_element()]
        result = builder.build(elements)

        assert len(result) == 1  # One system: Superstructure
        system = result[0]
        assert system.label == "Superstructure"
        assert system.level == 1
        assert system.element_count == 1
        assert system.quantity == 10.0

    def test_multiple_storeys(self) -> None:
        builder = WBSBuilder()
        elements = [
            _make_element(storey="Level 01", volume=10.0),
            _make_element(storey="Level 02", volume=15.0),
        ]
        result = builder.build(elements)

        assert len(result) == 1
        system = result[0]
        assert system.quantity == 25.0
        assert system.element_count == 2

        # Should have one classification child with two storey children
        cls_node = system.children[0]
        assert len(cls_node.children) == 2

    def test_multiple_systems(self) -> None:
        builder = WBSBuilder()
        elements = [
            _make_element(ifc_class="IfcFooting", uniclass_code="EF_05_10"),
            _make_element(ifc_class="IfcWall", uniclass_code="EF_25_10"),
            _make_element(ifc_class="IfcDoor", uniclass_code="Pr_30_59_24_89"),
        ]
        result = builder.build(elements)

        labels = [n.label for n in result]
        assert "Substructure" in labels
        assert "Superstructure" in labels
        assert "Finishes" in labels

    def test_system_order(self) -> None:
        builder = WBSBuilder()
        elements = [
            _make_element(ifc_class="IfcDoor", uniclass_code="Pr_30_59_24_89"),
            _make_element(ifc_class="IfcFooting", uniclass_code="EF_05_10"),
            _make_element(ifc_class="IfcWall", uniclass_code="EF_25_10"),
        ]
        result = builder.build(elements)

        labels = [n.label for n in result]
        assert labels.index("Substructure") < labels.index("Superstructure")
        assert labels.index("Superstructure") < labels.index("Finishes")

    def test_flat_wbs(self) -> None:
        builder = WBSBuilder()
        elements = [
            _make_element(storey="Level 01", volume=10.0),
            _make_element(storey="Level 01", volume=5.0),
            _make_element(storey="Level 02", volume=20.0),
        ]
        flat = builder.build_flat(elements)

        assert len(flat) == 2  # Two unique (system, cls, storey) combos
        level_01 = next(r for r in flat if r["storey"] == "Level 01")
        assert level_01["quantity"] == 15.0
        assert level_01["unit"] == "m3"
        assert level_01["element_count"] == 2

    def test_basement_classified_as_substructure(self) -> None:
        builder = WBSBuilder()
        elements = [
            _make_element(ifc_class="IfcWall", storey="Basement 1"),
        ]
        flat = builder.build_flat(elements)
        assert flat[0]["system"] == "Substructure"

    def test_no_quantities_counts_elements(self) -> None:
        builder = WBSBuilder()
        elem = Element(
            global_id="no-qty",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            name="NoQty",
            description=None,
            storey="Level 01",
            material="Concrete",
            quantities=[],
            classification=Classification(
                uniclass_code="EF_25_10",
                uniclass_description="Test",
                omniclass_code="23-17 11 13",
                omniclass_description="Test",
                confidence=ClassificationConfidence.HIGH,
                match_method="entity+material",
            ),
        )
        flat = builder.build_flat([elem])
        assert flat[0]["quantity"] == 1.0
        assert flat[0]["unit"] == "ea"
