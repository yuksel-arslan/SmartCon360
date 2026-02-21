"""Tests for the ClassificationMapper."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from src.modules.bim.domain.models import (
    ClassificationConfidence,
    Element,
    ElementType,
)
from src.modules.bim.infrastructure.classification_mapper import ClassificationMapper


@pytest.fixture
def mapping_file(tmp_path: Path) -> Path:
    """Create a temporary classification mapping file."""
    mapping = {
        "mappings": {
            "IfcWall": {
                "material:Concrete": {
                    "uniclass": "EF_25_10",
                    "omniclass": "23-17 11 13",
                },
                "material:Brick": {
                    "uniclass": "EF_25_30",
                    "omniclass": "23-17 11 17",
                },
                "default": {
                    "uniclass": "EF_25_10",
                    "omniclass": "23-17 11 13",
                },
            },
            "IfcSlab": {
                "material:Concrete": {
                    "uniclass": "EF_20_10",
                    "omniclass": "23-13 11 11",
                },
                "default": {
                    "uniclass": "EF_20_10",
                    "omniclass": "23-13 11 11",
                },
            },
        },
        "descriptions": {
            "uniclass": {
                "EF_25_10": "Concrete wall systems",
                "EF_25_30": "Masonry wall systems",
                "EF_20_10": "Concrete floor and slab systems",
                "UNCLASSIFIED": "Unclassified element",
            },
            "omniclass": {
                "23-17 11 13": "Cast-in-Place Concrete Walls",
                "23-17 11 17": "Unit Masonry Walls",
                "23-13 11 11": "Cast-in-Place Concrete Floor Decks",
                "UNCLASSIFIED": "Unclassified element",
            },
        },
    }
    file_path = tmp_path / "test_mapping.json"
    file_path.write_text(json.dumps(mapping), encoding="utf-8")
    return file_path


def _make_element(
    ifc_class: str = "IfcWall",
    material: str | None = None,
) -> Element:
    return Element(
        global_id="test-id",
        ifc_class=ifc_class,
        element_type=ElementType.from_ifc_class(ifc_class),
        name="Test Element",
        description=None,
        storey="Level 01",
        material=material,
    )


class TestClassificationMapper:
    """Tests for classification mapping logic."""

    def test_entity_and_material_match(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", "Concrete")
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_25_10"
        assert result.omniclass_code == "23-17 11 13"
        assert result.confidence == ClassificationConfidence.HIGH
        assert result.match_method == "entity+material"

    def test_entity_and_material_prefix_match(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", "Concrete C30/37")
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_25_10"
        assert result.confidence == ClassificationConfidence.HIGH
        assert result.match_method == "entity+material"

    def test_entity_default_match(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", "UnknownMaterial")
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_25_10"
        assert result.confidence == ClassificationConfidence.MEDIUM
        assert result.match_method == "entity"

    def test_entity_without_material(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", None)
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_25_10"
        assert result.confidence == ClassificationConfidence.MEDIUM
        assert result.match_method == "entity"

    def test_unknown_entity(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcSomethingNew", "Steel")
        result = mapper.classify(elem)

        assert result.uniclass_code == "UNCLASSIFIED"
        assert result.omniclass_code == "UNCLASSIFIED"
        assert result.confidence == ClassificationConfidence.LOW
        assert result.match_method == "unknown"

    def test_brick_material_match(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", "Brick")
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_25_30"
        assert result.omniclass_code == "23-17 11 17"
        assert result.confidence == ClassificationConfidence.HIGH

    def test_slab_entity(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcSlab", "Concrete")
        result = mapper.classify(elem)

        assert result.uniclass_code == "EF_20_10"
        assert result.confidence == ClassificationConfidence.HIGH

    def test_descriptions_populated(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        elem = _make_element("IfcWall", "Concrete")
        result = mapper.classify(elem)

        assert result.uniclass_description == "Concrete wall systems"
        assert result.omniclass_description == "Cast-in-Place Concrete Walls"

    def test_missing_mapping_file(self, tmp_path: Path) -> None:
        """Mapper should work with empty mapping when file is missing."""
        mapper = ClassificationMapper(tmp_path / "nonexistent.json")
        elem = _make_element("IfcWall", "Concrete")
        result = mapper.classify(elem)

        assert result.confidence == ClassificationConfidence.LOW

    def test_supported_entity_types(self, mapping_file: Path) -> None:
        mapper = ClassificationMapper(mapping_file)
        types = mapper.supported_entity_types
        assert "IfcWall" in types
        assert "IfcSlab" in types
