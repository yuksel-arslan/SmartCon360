"""Domain models for the BIM Intelligence Engine."""

from .project import BIMProject, ProjectMetadata, ProjectStatus
from .element import (
    BIMElement,
    ElementType,
    ElementSystem,
)
from .quantity import (
    QuantityRecord,
    QuantitySource,
    QuantityType,
    UNIT_CONVERSIONS,
    normalize_unit,
)
from .classification import (
    ClassificationEntry,
    ClassificationConfidence,
)
from .cost import CostItem, CostCategory, CurrencyCode
from .activity import Activity, ActivityStatus
from .zone import TaktZone, ZoneType
from .risk import RiskScore, RiskLevel, ComplexityIndex
from .relationship import Relationship, RelationshipType

__all__ = [
    "BIMProject",
    "ProjectMetadata",
    "ProjectStatus",
    "BIMElement",
    "ElementType",
    "ElementSystem",
    "QuantityRecord",
    "QuantitySource",
    "QuantityType",
    "UNIT_CONVERSIONS",
    "normalize_unit",
    "ClassificationEntry",
    "ClassificationConfidence",
    "CostItem",
    "CostCategory",
    "CurrencyCode",
    "Activity",
    "ActivityStatus",
    "TaktZone",
    "ZoneType",
    "RiskScore",
    "RiskLevel",
    "ComplexityIndex",
    "Relationship",
    "RelationshipType",
]
