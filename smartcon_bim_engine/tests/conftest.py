"""Shared test fixtures for the BIM Intelligence Engine."""

from __future__ import annotations

import pytest

from app.domain.element import BIMElement, ElementType
from app.domain.quantity import QuantityRecord, QuantitySource, QuantityType
from app.domain.classification import ClassificationEntry, ClassificationConfidence
from app.domain.cost import CostItem, CostCategory, CurrencyCode
from app.domain.activity import Activity, ActivityStatus
from app.domain.zone import TaktZone, ZoneType
from app.domain.risk import RiskScore, RiskLevel, ComplexityIndex
from app.domain.relationship import Relationship, RelationshipType
from app.domain.project import BIMProject, ProjectMetadata


@pytest.fixture
def sample_quantity_volume() -> QuantityRecord:
    return QuantityRecord(
        name="NetVolume",
        value=12.5,
        unit="m3",
        quantity_type=QuantityType.VOLUME,
        source=QuantitySource.BASE_QUANTITIES,
    )


@pytest.fixture
def sample_quantity_area() -> QuantityRecord:
    return QuantityRecord(
        name="GrossSideArea",
        value=45.0,
        unit="m2",
        quantity_type=QuantityType.AREA,
        source=QuantitySource.QTO_PROPERTY_SET,
    )


@pytest.fixture
def sample_classification() -> ClassificationEntry:
    return ClassificationEntry(
        uniclass_code="EF_25_10",
        uniclass_description="Walls and barriers",
        omniclass_code="23-17 11 13",
        omniclass_description="Concrete walls",
        confidence=ClassificationConfidence.HIGH,
        match_method="entity+material",
    )


@pytest.fixture
def sample_element(
    sample_quantity_volume: QuantityRecord,
    sample_quantity_area: QuantityRecord,
    sample_classification: ClassificationEntry,
) -> BIMElement:
    return BIMElement(
        global_id="2O2Fr$t4X7Zf8NOew3FLOH",
        ifc_class="IfcWall",
        element_type=ElementType.WALL,
        name="Basic Wall:Concrete 200mm:1234",
        description=None,
        storey="Level 1",
        space=None,
        system=None,
        material_list=["Concrete"],
        primary_material="Concrete",
        quantities=[sample_quantity_volume, sample_quantity_area],
        classification=sample_classification,
    )


@pytest.fixture
def sample_elements() -> list[BIMElement]:
    """Generate a set of diverse test elements across storeys and types."""
    elements = []

    for i in range(5):
        elements.append(BIMElement(
            global_id=f"WALL-L1-{i:03d}",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            name=f"Wall L1-{i}",
            storey="Level 1",
            space="Room A" if i < 3 else "Room B",
            material_list=["Concrete"],
            primary_material="Concrete",
            quantities=[QuantityRecord(
                name="NetVolume", value=10.0 + i, unit="m3",
                quantity_type=QuantityType.VOLUME,
                source=QuantitySource.BASE_QUANTITIES,
            )],
            classification=ClassificationEntry(
                uniclass_code="EF_25_10",
                uniclass_description="Walls and barriers",
                omniclass_code="23-17 11 13",
                omniclass_description="Concrete walls",
                confidence=ClassificationConfidence.HIGH,
                match_method="entity+material",
            ),
        ))

    for i in range(3):
        elements.append(BIMElement(
            global_id=f"WALL-L2-{i:03d}",
            ifc_class="IfcWall",
            element_type=ElementType.WALL,
            name=f"Wall L2-{i}",
            storey="Level 2",
            material_list=["Brick"],
            primary_material="Brick",
            quantities=[QuantityRecord(
                name="NetVolume", value=8.0 + i, unit="m3",
                quantity_type=QuantityType.VOLUME,
                source=QuantitySource.BASE_QUANTITIES,
            )],
            classification=ClassificationEntry(
                uniclass_code="EF_25_10_06",
                uniclass_description="Brick/block walls",
                omniclass_code="23-17 11 11 11",
                omniclass_description="Brick walls",
                confidence=ClassificationConfidence.HIGH,
                match_method="entity+material",
            ),
        ))

    for i in range(3):
        elements.append(BIMElement(
            global_id=f"SLAB-L1-{i:03d}",
            ifc_class="IfcSlab",
            element_type=ElementType.SLAB,
            name=f"Slab L1-{i}",
            storey="Level 1",
            material_list=["Concrete"],
            primary_material="Concrete",
            quantities=[QuantityRecord(
                name="NetVolume", value=20.0 + i * 5, unit="m3",
                quantity_type=QuantityType.VOLUME,
                source=QuantitySource.BASE_QUANTITIES,
            )],
            classification=ClassificationEntry(
                uniclass_code="EF_25_30_25",
                uniclass_description="Concrete floor slabs",
                omniclass_code="23-13 13 11",
                omniclass_description="Concrete floor slabs",
                confidence=ClassificationConfidence.HIGH,
                match_method="entity+material",
            ),
        ))

    for i in range(2):
        elements.append(BIMElement(
            global_id=f"DOOR-L1-{i:03d}",
            ifc_class="IfcDoor",
            element_type=ElementType.DOOR,
            name=f"Door L1-{i}",
            storey="Level 1",
            space="Room A",
            material_list=["Timber"],
            primary_material="Timber",
            quantities=[QuantityRecord(
                name="Area", value=2.1, unit="m2",
                quantity_type=QuantityType.AREA,
                source=QuantitySource.GEOMETRY_FALLBACK,
            )],
            classification=ClassificationEntry(
                uniclass_code="Pr_30_59_29_89",
                uniclass_description="Timber doors",
                omniclass_code="23-17 15 11 11",
                omniclass_description="Timber doors",
                confidence=ClassificationConfidence.HIGH,
                match_method="entity+material",
            ),
        ))

    elements.append(BIMElement(
        global_id="FTNG-B1-001",
        ifc_class="IfcFooting",
        element_type=ElementType.FOOTING,
        name="Footing B1",
        storey="Basement",
        material_list=["Concrete"],
        primary_material="Concrete",
        quantities=[QuantityRecord(
            name="NetVolume", value=15.0, unit="m3",
            quantity_type=QuantityType.VOLUME,
            source=QuantitySource.BASE_QUANTITIES,
        )],
        classification=ClassificationEntry(
            uniclass_code="EF_20_10_30",
            uniclass_description="Pad foundations",
            omniclass_code="23-11 11 11",
            omniclass_description="Pad foundations",
            confidence=ClassificationConfidence.MEDIUM,
            match_method="entity",
        ),
    ))

    return elements


@pytest.fixture
def sample_project() -> BIMProject:
    return BIMProject(
        project_id="test-project-001",
        source_file="test_model.ifc",
        metadata=ProjectMetadata(
            name="Test Building",
            description="A test building model",
            schema_version="IFC4",
        ),
    )
