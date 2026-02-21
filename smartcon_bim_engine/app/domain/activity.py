"""Activity domain model.

Represents construction activities that can be linked to BIM elements
for takt planning and schedule integration with TaktFlow.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ActivityStatus(str, Enum):
    """Status of a construction activity."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"


@dataclass(slots=True)
class Activity:
    """A construction activity linked to BIM elements.

    Designed for integration with TaktFlow takt planning.
    """

    activity_id: str
    name: str
    trade: str
    status: ActivityStatus = ActivityStatus.NOT_STARTED
    duration_days: float = 0.0
    zone_id: Optional[str] = None
    storey: Optional[str] = None
    wbs_code: Optional[str] = None
    predecessor_ids: list[str] = field(default_factory=list)
    element_ids: list[str] = field(default_factory=list)
    crew_size: int = 0
    productivity_rate: float = 0.0
    productivity_unit: str = ""

    @property
    def is_active(self) -> bool:
        return self.status == ActivityStatus.IN_PROGRESS

    def to_dict(self) -> dict:
        return {
            "activity_id": self.activity_id,
            "name": self.name,
            "trade": self.trade,
            "status": self.status.value,
            "duration_days": self.duration_days,
            "zone_id": self.zone_id,
            "storey": self.storey,
            "wbs_code": self.wbs_code,
            "predecessor_ids": self.predecessor_ids,
            "element_ids": self.element_ids,
            "crew_size": self.crew_size,
            "productivity_rate": self.productivity_rate,
            "productivity_unit": self.productivity_unit,
        }
