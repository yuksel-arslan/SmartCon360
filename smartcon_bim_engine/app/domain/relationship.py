"""Relationship domain model.

Represents typed relationships between BIM elements forming
the Element Graph: spatial, structural, system, and workflow links.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class RelationshipType(str, Enum):
    """Type of relationship between two BIM elements."""

    SPATIAL = "spatial"
    STRUCTURAL = "structural"
    SYSTEM = "system"
    WORKFLOW = "workflow"


@dataclass(frozen=True, slots=True)
class Relationship:
    """A directed relationship between two BIM elements.

    Forms edges in the Element Graph.
    source_id → target_id with a typed relationship.
    """

    source_id: str
    target_id: str
    relationship_type: RelationshipType
    description: Optional[str] = None
    weight: float = 1.0

    def to_dict(self) -> dict:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "relationship_type": self.relationship_type.value,
            "description": self.description,
            "weight": round(self.weight, 4),
        }
