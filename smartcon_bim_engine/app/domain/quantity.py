"""Quantity domain model.

Represents measured quantities extracted from IFC elements with source
tracking and unit normalization.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


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


@dataclass(frozen=True, slots=True)
class QuantityRecord:
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


UNIT_CONVERSIONS: dict[str, tuple[str, float]] = {
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
    "SQUARE_METRE": ("m2", 1.0),
    "SQUARE_METER": ("m2", 1.0),
    "SQUARE_FOOT": ("m2", 0.092903),
    "SQUARE_MILLIMETRE": ("m2", 1e-6),
    "SQUARE_CENTIMETRE": ("m2", 1e-4),
    "M2": ("m2", 1.0),
    "SQ_M": ("m2", 1.0),
    "SQ_FT": ("m2", 0.092903),
    "CUBIC_METRE": ("m3", 1.0),
    "CUBIC_METER": ("m3", 1.0),
    "CUBIC_FOOT": ("m3", 0.0283168),
    "CUBIC_MILLIMETRE": ("m3", 1e-9),
    "CUBIC_CENTIMETRE": ("m3", 1e-6),
    "M3": ("m3", 1.0),
    "CU_M": ("m3", 1.0),
    "CU_FT": ("m3", 0.0283168),
    "KILOGRAM": ("kg", 1.0),
    "KG": ("kg", 1.0),
    "GRAM": ("kg", 0.001),
    "TONNE": ("kg", 1000.0),
    "TON": ("kg", 907.185),
    "POUND": ("kg", 0.453592),
    "LB": ("kg", 0.453592),
    "LBS": ("kg", 0.453592),
}

DEFAULT_UNITS: dict[QuantityType, str] = {
    QuantityType.LENGTH: "m",
    QuantityType.AREA: "m2",
    QuantityType.VOLUME: "m3",
    QuantityType.WEIGHT: "kg",
    QuantityType.COUNT: "ea",
}


def normalize_unit(value: float, raw_unit: str) -> tuple[float, str]:
    """Normalize a value+unit pair to SI units.

    Returns (normalized_value, canonical_unit).
    If the unit is unknown, returns unchanged.
    """
    key = raw_unit.strip().upper().replace(" ", "_")
    if key in UNIT_CONVERSIONS:
        canonical_unit, factor = UNIT_CONVERSIONS[key]
        return value * factor, canonical_unit
    return value, raw_unit
