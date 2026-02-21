"""Tests for the BOQ formatter."""

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
)
from src.modules.bim.infrastructure.boq_formatter import BOQFormatter


def _make_element(
    ifc_class: str = "IfcWall",
    material: str = "Concrete",
    storey: str = "Level 01",
    has_classification: bool = True,
    has_quantities: bool = True,
) -> Element:
    classification = None
    if has_classification:
        classification = Classification(
            uniclass_code="EF_25_10",
            uniclass_description="Concrete wall systems",
            omniclass_code="23-17 11 13",
            omniclass_description="Cast-in-Place Concrete Walls",
            confidence=ClassificationConfidence.HIGH,
            match_method="entity+material",
        )
    quantities = []
    if has_quantities:
        quantities = [
            Quantity("NetVolume", 10.0, "m3", QuantityType.VOLUME, QuantitySource.BASE_QUANTITIES),
        ]

    return Element(
        global_id="test-id-001",
        ifc_class=ifc_class,
        element_type=ElementType.from_ifc_class(ifc_class),
        name="Test Wall",
        description=None,
        storey=storey,
        material=material,
        quantities=quantities,
        classification=classification,
    )


class TestBOQFormatter:
    """Tests for BOQ output formatting."""

    def test_format_basic(self) -> None:
        formatter = BOQFormatter()
        elements = [_make_element()]
        wbs_flat = [{"system": "Superstructure", "classification_code": "EF_25_10",
                     "storey": "Level 01", "quantity": 10.0, "unit": "m3", "element_count": 1}]

        result = formatter.format(
            project_id="test-project",
            project_info={"name": "Test", "description": None, "phase": None},
            elements=elements,
            wbs_tree=[],
            wbs_flat=wbs_flat,
            source_file="test.ifc",
        )

        assert result["project_id"] == "test-project"
        assert result["source_file"] == "test.ifc"
        assert result["elements_processed"] == 1
        assert len(result["wbs"]) == 1
        assert "processed_at" in result

    def test_format_auto_generates_project_id(self) -> None:
        formatter = BOQFormatter()
        result = formatter.format(
            project_id=None,
            project_info={"name": None, "description": None, "phase": None},
            elements=[],
            wbs_tree=[],
            wbs_flat=[],
            source_file="test.ifc",
        )
        assert result["project_id"] is not None
        assert len(result["project_id"]) > 0

    def test_summary_statistics(self) -> None:
        formatter = BOQFormatter()
        elements = [
            _make_element(),
            _make_element(has_classification=False, has_quantities=False),
        ]

        result = formatter.format(
            project_id="test",
            project_info={"name": None, "description": None, "phase": None},
            elements=elements,
            wbs_tree=[],
            wbs_flat=[],
            source_file="test.ifc",
        )

        summary = result["summary"]
        assert summary["total_elements"] == 2
        assert summary["classified_elements"] == 1
        assert summary["classification_rate"] == 50.0
        assert summary["elements_with_quantities"] == 1
        assert summary["quantity_coverage"] == 50.0

    def test_statistics_detail(self) -> None:
        formatter = BOQFormatter()
        elements = [_make_element()]

        result = formatter.format(
            project_id="test",
            project_info={"name": None, "description": None, "phase": None},
            elements=elements,
            wbs_tree=[],
            wbs_flat=[],
            source_file="test.ifc",
        )

        stats = result["statistics"]
        assert "quantity_sources" in stats
        assert "classification_confidence" in stats
        assert stats["unique_materials"] == 1
        assert stats["unique_storeys"] == 1

    def test_elements_serialized(self) -> None:
        formatter = BOQFormatter()
        elements = [_make_element()]

        result = formatter.format(
            project_id="test",
            project_info={"name": None, "description": None, "phase": None},
            elements=elements,
            wbs_tree=[],
            wbs_flat=[],
            source_file="test.ifc",
        )

        assert len(result["elements"]) == 1
        elem = result["elements"][0]
        assert elem["global_id"] == "test-id-001"
        assert elem["ifc_class"] == "IfcWall"
        assert len(elem["quantities"]) == 1

    def test_empty_elements(self) -> None:
        formatter = BOQFormatter()
        result = formatter.format(
            project_id="test",
            project_info={"name": None, "description": None, "phase": None},
            elements=[],
            wbs_tree=[],
            wbs_flat=[],
            source_file="test.ifc",
        )

        assert result["elements_processed"] == 0
        assert result["summary"]["total_elements"] == 0
        assert result["summary"]["classification_rate"] == 0.0
