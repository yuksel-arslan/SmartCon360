"""Unit tests for Classification Mapper service."""

from __future__ import annotations

import pytest
from pathlib import Path

from app.domain.element import BIMElement, ElementType
from app.domain.classification import ClassificationConfidence
from app.services.classification_mapper import ClassificationMapper


@pytest.fixture
def mapper() -> ClassificationMapper:
    mappings_dir = Path(__file__).parent.parent / "mappings"
    return ClassificationMapper(
        uniclass_file=mappings_dir / "uniclass.json",
        omniclass_file=mappings_dir / "omniclass.json",
    )


class TestClassificationMapper:
    def test_classify_wall_concrete(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-001",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            primary_material="Concrete",
            material_list=["Concrete"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "EF_25_10"
        assert cls.omniclass_code == "23-17 11 13"
        assert cls.confidence == ClassificationConfidence.HIGH
        assert cls.match_method == "entity+material"

    def test_classify_wall_brick(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-002",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            primary_material="Brick",
            material_list=["Brick"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "EF_25_10_06"
        assert cls.confidence == ClassificationConfidence.HIGH

    def test_classify_wall_default(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-003",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "EF_25_10"
        assert cls.confidence == ClassificationConfidence.MEDIUM
        assert cls.match_method == "entity"

    def test_classify_unknown_type(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-004",
            ifc_class="IfcSomethingUnknown",
            element_type=ElementType.UNKNOWN,
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "UNCLASSIFIED"
        assert cls.confidence == ClassificationConfidence.LOW

    def test_classify_door_timber(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-005",
            ifc_class="IfcDoor",
            element_type=ElementType.DOOR,
            primary_material="Timber",
            material_list=["Timber"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "Pr_30_59_29_89"
        assert cls.confidence == ClassificationConfidence.HIGH

    def test_classify_slab_concrete(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-006",
            ifc_class="IfcSlab",
            element_type=ElementType.SLAB,
            primary_material="Concrete",
            material_list=["Concrete"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "EF_25_30_25"
        assert cls.omniclass_code == "23-13 13 11"

    def test_classify_all(self, mapper: ClassificationMapper) -> None:
        elements = [
            BIMElement(
                global_id="test-a",
                ifc_class="IfcWall",
                element_type=ElementType.WALL,
                primary_material="Concrete",
                material_list=["Concrete"],
            ),
            BIMElement(
                global_id="test-b",
                ifc_class="IfcColumn",
                element_type=ElementType.COLUMN,
                primary_material="Steel",
                material_list=["Steel"],
            ),
        ]

        count = mapper.classify_all(elements)

        assert count == 2
        assert elements[0].classification is not None
        assert elements[1].classification is not None

    def test_supported_entity_types(self, mapper: ClassificationMapper) -> None:
        types = mapper.supported_entity_types
        assert "IfcWall" in types
        assert "IfcSlab" in types
        assert "IfcDoor" in types

    def test_material_prefix_match(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-007",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            primary_material="Concrete C30/37",
            material_list=["Concrete C30/37"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code == "EF_25_10"
        assert cls.confidence == ClassificationConfidence.HIGH

    def test_wall_standard_case_fallback(self, mapper: ClassificationMapper) -> None:
        elem = BIMElement(
            global_id="test-008",
            ifc_class="IfcWallStandardCase",
            element_type=ElementType.WALL_STANDARD,
            primary_material="Concrete",
            material_list=["Concrete"],
        )
        cls = mapper.classify(elem)

        assert cls.uniclass_code != "UNCLASSIFIED"
        assert cls.confidence == ClassificationConfidence.HIGH
