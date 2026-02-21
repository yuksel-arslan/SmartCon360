"""Domain models for the IFC QTO engine.

Pure business objects with no framework dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


# ── Enums ──────────────────────────────────────────────────────────────────


class QuantitySource(str, Enum):
    """Origin of a quantity value, ordered by extraction priority."""

    BASE_QUANTITIES = "base_quantities"
    QTO_PROPERTY_SET = "qto_property_set"
    GEOMETRY_FALLBACK = "geometry_fallback"
    MANUAL = "manual"


class QuantityType(str, Enum):
    """Physical dimension of a quantity."""

    LENGTH = "length"
    AREA = "area"
    VOLUME = "volume"
    COUNT = "count"
    WEIGHT = "weight"


class ElementType(str, Enum):
    """Supported IFC entity types."""

    WALL = "IfcWall"
    WALL_STANDARD = "IfcWallStandardCase"
    SLAB = "IfcSlab"
    BEAM = "IfcBeam"
    COLUMN = "IfcColumn"
    DOOR = "IfcDoor"
    WINDOW = "IfcWindow"
    STAIR = "IfcStairFlight"
    STAIR_CONTAINER = "IfcStair"
    RAILING = "IfcRailing"
    ROOF = "IfcRoof"
    CURTAIN_WALL = "IfcCurtainWall"
    PLATE = "IfcPlate"
    MEMBER = "IfcMember"
    FOOTING = "IfcFooting"
    PILE = "IfcPile"
    COVERING = "IfcCovering"
    RAMP = "IfcRamp"
    RAMP_FLIGHT = "IfcRampFlight"
    BUILDING_ELEMENT_PROXY = "IfcBuildingElementProxy"
    SPACE = "IfcSpace"
    DISTRIBUTION_ELEMENT = "IfcDistributionElement"
    FLOW_TERMINAL = "IfcFlowTerminal"
    FLOW_SEGMENT = "IfcFlowSegment"
    FLOW_FITTING = "IfcFlowFitting"
    UNKNOWN = "Unknown"

    @classmethod
    def from_ifc_class(cls, ifc_class: str) -> ElementType:
        """Resolve an IFC class name to an ElementType enum member."""
        for member in cls:
            if member.value == ifc_class:
                return member
        return cls.UNKNOWN


class ClassificationConfidence(str, Enum):
    """Confidence level of a classification mapping."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ── Value Objects ──────────────────────────────────────────────────────────


@dataclass(frozen=True, slots=True)
class Quantity:
    """A single measured quantity extracted from an IFC element."""

    name: str
    value: float
    unit: str
    quantity_type: QuantityType
    source: QuantitySource

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "value": round(self.value, 4),
            "unit": self.unit,
            "quantity_type": self.quantity_type.value,
            "source": self.source.value,
        }


@dataclass(frozen=True, slots=True)
class Classification:
    """Uniclass / OmniClass mapping for an element."""

    uniclass_code: str
    uniclass_description: str
    omniclass_code: str
    omniclass_description: str
    confidence: ClassificationConfidence
    match_method: str  # "entity+material", "entity", "unknown"

    def to_dict(self) -> dict:
        return {
            "uniclass_code": self.uniclass_code,
            "uniclass_description": self.uniclass_description,
            "omniclass_code": self.omniclass_code,
            "omniclass_description": self.omniclass_description,
            "confidence": self.confidence.value,
            "match_method": self.match_method,
        }


# ── Entities ───────────────────────────────────────────────────────────────


@dataclass(slots=True)
class Element:
    """A single IFC building element with extracted data."""

    global_id: str
    ifc_class: str
    element_type: ElementType
    name: Optional[str]
    description: Optional[str]
    storey: Optional[str]
    material: Optional[str]
    quantities: list[Quantity] = field(default_factory=list)
    classification: Optional[Classification] = None
    properties: dict[str, str | float | int | bool] = field(default_factory=dict)

    @property
    def primary_quantity(self) -> Optional[Quantity]:
        """Return the highest-priority quantity (first in list, sorted by source)."""
        if not self.quantities:
            return None
        priority = [
            QuantitySource.BASE_QUANTITIES,
            QuantitySource.QTO_PROPERTY_SET,
            QuantitySource.GEOMETRY_FALLBACK,
            QuantitySource.MANUAL,
        ]
        return min(self.quantities, key=lambda q: priority.index(q.source))

    def to_dict(self) -> dict:
        return {
            "global_id": self.global_id,
            "ifc_class": self.ifc_class,
            "element_type": self.element_type.value,
            "name": self.name,
            "description": self.description,
            "storey": self.storey,
            "material": self.material,
            "quantities": [q.to_dict() for q in self.quantities],
            "classification": self.classification.to_dict() if self.classification else None,
        }


# ── WBS Aggregate ──────────────────────────────────────────────────────────


@dataclass(slots=True)
class WBSNode:
    """Work Breakdown Structure node aggregating quantities.

    Hierarchy: System → Classification → Storey → Entity
    """

    level: int
    code: str
    label: str
    parent_code: Optional[str]
    quantity: float = 0.0
    unit: str = ""
    element_count: int = 0
    children: list[WBSNode] = field(default_factory=list)

    def to_dict(self) -> dict:
        result: dict = {
            "level": self.level,
            "code": self.code,
            "label": self.label,
            "quantity": round(self.quantity, 4),
            "unit": self.unit,
            "element_count": self.element_count,
        }
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result


# ── Unit Normalization ─────────────────────────────────────────────────────

UNIT_CONVERSIONS: dict[str, tuple[str, float]] = {
    # Length → m
    "MILLIMETRE": ("m", 0.001),
    "CENTIMETRE": ("m", 0.01),
    "METRE": ("m", 1.0),
    "METER": ("m", 1.0),
    "FOOT": ("m", 0.3048),
    "INCH": ("m", 0.0254),
    "MM": ("m", 0.001),
    "CM": ("m", 0.01),
    "M": ("m", 1.0),
    "FT": ("m", 0.3048),
    "IN": ("m", 0.0254),
    # Area → m²
    "SQUARE_METRE": ("m2", 1.0),
    "SQUARE_METER": ("m2", 1.0),
    "SQUARE_FOOT": ("m2", 0.092903),
    "SQUARE_MILLIMETRE": ("m2", 1e-6),
    "SQUARE_CENTIMETRE": ("m2", 1e-4),
    "M2": ("m2", 1.0),
    "SQ_M": ("m2", 1.0),
    "SQ_FT": ("m2", 0.092903),
    # Volume → m³
    "CUBIC_METRE": ("m3", 1.0),
    "CUBIC_METER": ("m3", 1.0),
    "CUBIC_FOOT": ("m3", 0.0283168),
    "CUBIC_MILLIMETRE": ("m3", 1e-9),
    "CUBIC_CENTIMETRE": ("m3", 1e-6),
    "M3": ("m3", 1.0),
    "CU_M": ("m3", 1.0),
    "CU_FT": ("m3", 0.0283168),
    # Weight → kg
    "KILOGRAM": ("kg", 1.0),
    "KG": ("kg", 1.0),
    "GRAM": ("kg", 0.001),
    "TONNE": ("kg", 1000.0),
    "TON": ("kg", 907.185),  # US short ton
    "POUND": ("kg", 0.453592),
    "LB": ("kg", 0.453592),
    "LBS": ("kg", 0.453592),
}


def normalize_unit(value: float, raw_unit: str) -> tuple[float, str]:
    """Normalize a value+unit pair to SI units.

    Returns:
        Tuple of (normalized_value, canonical_unit).
        If the unit is unknown, returns the value unchanged with the raw unit.
    """
    key = raw_unit.strip().upper().replace(" ", "_")
    if key in UNIT_CONVERSIONS:
        canonical_unit, factor = UNIT_CONVERSIONS[key]
        return value * factor, canonical_unit
    return value, raw_unit
