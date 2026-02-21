"""Risk domain model.

Represents risk scores and complexity indices computed for BIM elements.
Designed for future AI risk scoring integration.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(str, Enum):
    """Risk classification level."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class RiskScore:
    """Risk score for a BIM element.

    Score range: 0.0 (no risk) to 1.0 (critical risk).
    Factors include spatial complexity, trade density, structural role.
    """

    score: float
    level: RiskLevel
    factors: dict[str, float] = field(default_factory=dict)

    @staticmethod
    def compute_level(score: float) -> RiskLevel:
        if score >= 0.8:
            return RiskLevel.CRITICAL
        if score >= 0.6:
            return RiskLevel.HIGH
        if score >= 0.3:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    @classmethod
    def from_factors(cls, factors: dict[str, float]) -> RiskScore:
        if not factors:
            return cls(score=0.0, level=RiskLevel.LOW, factors={})
        avg_score = sum(factors.values()) / len(factors)
        clamped = max(0.0, min(1.0, avg_score))
        return cls(
            score=round(clamped, 4),
            level=cls.compute_level(clamped),
            factors=factors,
        )

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "level": self.level.value,
            "factors": {k: round(v, 4) for k, v in self.factors.items()},
        }


@dataclass(frozen=True, slots=True)
class ComplexityIndex:
    """Complexity index for a BIM element.

    Measures geometric and relational complexity.
    Score range: 0.0 (simple) to 1.0 (highly complex).
    """

    score: float
    relationship_count: int = 0
    material_count: int = 0
    quantity_count: int = 0

    @classmethod
    def compute(
        cls,
        relationship_count: int,
        material_count: int,
        quantity_count: int,
    ) -> ComplexityIndex:
        rel_factor = min(relationship_count / 10.0, 1.0)
        mat_factor = min(material_count / 5.0, 1.0)
        qty_factor = min(quantity_count / 8.0, 1.0)
        score = (rel_factor * 0.4 + mat_factor * 0.3 + qty_factor * 0.3)
        return cls(
            score=round(score, 4),
            relationship_count=relationship_count,
            material_count=material_count,
            quantity_count=quantity_count,
        )

    def to_dict(self) -> dict:
        return {
            "score": self.score,
            "relationship_count": self.relationship_count,
            "material_count": self.material_count,
            "quantity_count": self.quantity_count,
        }
