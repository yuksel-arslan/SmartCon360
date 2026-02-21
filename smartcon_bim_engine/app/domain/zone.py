"""Zone domain model.

Represents takt-ready zones generated from IFC spatial structure.
Compatible with SmartCon360 TaktFlow module.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ZoneType(str, Enum):
    """Type of takt zone."""

    STOREY = "storey"
    SPACE = "space"
    CLUSTER = "cluster"
    CUSTOM = "custom"


@dataclass(slots=True)
class TaktZone:
    """A takt-ready zone for construction planning.

    Generated from IFC spatial structure (storeys, spaces).
    Compatible with SmartCon360 TaktFlow takt planning module.
    """

    zone_id: str
    name: str
    zone_type: ZoneType
    storey: Optional[str] = None
    parent_zone_id: Optional[str] = None
    element_ids: list[str] = field(default_factory=list)
    space_names: list[str] = field(default_factory=list)
    total_volume: float = 0.0
    total_area: float = 0.0
    element_count: int = 0
    sequence_order: int = 0
    trade_sequence: list[str] = field(default_factory=list)
    estimated_takt_days: float = 0.0

    @property
    def work_density(self) -> float:
        if self.total_area <= 0:
            return 0.0
        return self.element_count / self.total_area

    def to_dict(self) -> dict:
        return {
            "zone_id": self.zone_id,
            "name": self.name,
            "zone_type": self.zone_type.value,
            "storey": self.storey,
            "parent_zone_id": self.parent_zone_id,
            "element_count": self.element_count,
            "space_names": self.space_names,
            "total_volume": round(self.total_volume, 4),
            "total_area": round(self.total_area, 4),
            "work_density": round(self.work_density, 4),
            "sequence_order": self.sequence_order,
            "trade_sequence": self.trade_sequence,
            "estimated_takt_days": round(self.estimated_takt_days, 2),
        }
