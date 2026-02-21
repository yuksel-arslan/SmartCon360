"""Element domain model.

Central entity of the BIM Intelligence Engine. Each element represents
a single IFC building element with full metadata, quantities,
classifications, linked cost items, activities, risk, and relationships.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .quantity import QuantityRecord, QuantitySource
    from .classification import ClassificationEntry
    from .cost import CostItem
    from .activity import Activity
    from .risk import RiskScore, ComplexityIndex
    from .relationship import Relationship


class ElementType(str, Enum):
    """Supported IFC entity types."""

    WALL = "IfcWall"
    WALL_STANDARD = "IfcWallStandardCase"
    SLAB = "IfcSlab"
    BEAM = "IfcBeam"
    COLUMN = "IfcColumn"
    DOOR = "IfcDoor"
    WINDOW = "IfcWindow"
    STAIR_FLIGHT = "IfcStairFlight"
    STAIR = "IfcStair"
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
        for member in cls:
            if member.value == ifc_class:
                return member
        return cls.UNKNOWN


class ElementSystem(str, Enum):
    """High-level building system classification."""

    SUBSTRUCTURE = "Substructure"
    SUPERSTRUCTURE = "Superstructure"
    FINISHES = "Finishes"
    MEP = "MEP"
    EXTERNAL = "External"
    SPACES = "Spaces"
    UNCLASSIFIED = "Unclassified"


ELEMENT_SYSTEM_MAP: dict[str, ElementSystem] = {
    "IfcFooting": ElementSystem.SUBSTRUCTURE,
    "IfcPile": ElementSystem.SUBSTRUCTURE,
    "IfcWall": ElementSystem.SUPERSTRUCTURE,
    "IfcWallStandardCase": ElementSystem.SUPERSTRUCTURE,
    "IfcSlab": ElementSystem.SUPERSTRUCTURE,
    "IfcBeam": ElementSystem.SUPERSTRUCTURE,
    "IfcColumn": ElementSystem.SUPERSTRUCTURE,
    "IfcStairFlight": ElementSystem.SUPERSTRUCTURE,
    "IfcStair": ElementSystem.SUPERSTRUCTURE,
    "IfcRamp": ElementSystem.SUPERSTRUCTURE,
    "IfcRampFlight": ElementSystem.SUPERSTRUCTURE,
    "IfcRoof": ElementSystem.SUPERSTRUCTURE,
    "IfcCurtainWall": ElementSystem.SUPERSTRUCTURE,
    "IfcPlate": ElementSystem.SUPERSTRUCTURE,
    "IfcMember": ElementSystem.SUPERSTRUCTURE,
    "IfcDoor": ElementSystem.FINISHES,
    "IfcWindow": ElementSystem.FINISHES,
    "IfcCovering": ElementSystem.FINISHES,
    "IfcRailing": ElementSystem.FINISHES,
    "IfcBuildingElementProxy": ElementSystem.SUPERSTRUCTURE,
    "IfcSpace": ElementSystem.SPACES,
    "IfcDistributionElement": ElementSystem.MEP,
    "IfcFlowTerminal": ElementSystem.MEP,
    "IfcFlowSegment": ElementSystem.MEP,
    "IfcFlowFitting": ElementSystem.MEP,
}


@dataclass(slots=True)
class BIMElement:
    """Central entity representing a single IFC building element.

    Contains all extracted data: IFC metadata, spatial info, materials,
    quantities, classifications, cost bindings, activities, risk scores,
    and relationships to other elements.
    """

    global_id: str
    ifc_class: str
    element_type: ElementType
    name: Optional[str] = None
    description: Optional[str] = None
    storey: Optional[str] = None
    space: Optional[str] = None
    system: Optional[str] = None
    material_list: list[str] = field(default_factory=list)
    primary_material: Optional[str] = None
    properties: dict[str, str | float | int | bool] = field(default_factory=dict)

    quantities: list[QuantityRecord] = field(default_factory=list)
    classification: Optional[ClassificationEntry] = None

    linked_cost_items: list[CostItem] = field(default_factory=list)
    linked_activities: list[Activity] = field(default_factory=list)

    risk_score: Optional[RiskScore] = None
    complexity_index: Optional[ComplexityIndex] = None

    relationships: list[Relationship] = field(default_factory=list)

    @property
    def primary_quantity(self) -> Optional[QuantityRecord]:
        from .quantity import QuantitySource
        if not self.quantities:
            return None
        priority = [
            QuantitySource.BASE_QUANTITIES,
            QuantitySource.QTO_PROPERTY_SET,
            QuantitySource.GEOMETRY_FALLBACK,
            QuantitySource.MANUAL,
        ]
        return min(self.quantities, key=lambda q: priority.index(q.source))

    @property
    def resolved_system(self) -> ElementSystem:
        if self.system:
            try:
                return ElementSystem(self.system)
            except ValueError:
                pass
        storey_lower = (self.storey or "").lower()
        if any(kw in storey_lower for kw in ("basement", "foundation", "b1", "b2", "b3", "sub")):
            if self.ifc_class in (
                "IfcWall", "IfcWallStandardCase", "IfcSlab",
                "IfcColumn", "IfcBeam",
            ):
                return ElementSystem.SUBSTRUCTURE
        return ELEMENT_SYSTEM_MAP.get(self.ifc_class, ElementSystem.UNCLASSIFIED)

    def to_dict(self) -> dict:
        return {
            "global_id": self.global_id,
            "ifc_class": self.ifc_class,
            "element_type": self.element_type.value,
            "name": self.name,
            "description": self.description,
            "storey": self.storey,
            "space": self.space,
            "system": self.resolved_system.value,
            "material_list": self.material_list,
            "primary_material": self.primary_material,
            "quantities": [q.to_dict() for q in self.quantities],
            "classification": self.classification.to_dict() if self.classification else None,
            "linked_cost_items": [c.to_dict() for c in self.linked_cost_items],
            "linked_activities": [a.to_dict() for a in self.linked_activities],
            "risk_score": self.risk_score.to_dict() if self.risk_score else None,
            "complexity_index": self.complexity_index.to_dict() if self.complexity_index else None,
            "relationships": [r.to_dict() for r in self.relationships],
        }
