"""Classification domain model.

Represents Uniclass / OmniClass mapping results for IFC elements
with confidence scoring.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class ClassificationConfidence(str, Enum):
    """Confidence level of a classification mapping."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass(frozen=True, slots=True)
class ClassificationEntry:
    """Uniclass / OmniClass mapping for an element."""

    uniclass_code: str
    uniclass_description: str
    omniclass_code: str
    omniclass_description: str
    confidence: ClassificationConfidence
    match_method: str

    @property
    def confidence_score(self) -> float:
        scores = {
            ClassificationConfidence.HIGH: 1.0,
            ClassificationConfidence.MEDIUM: 0.6,
            ClassificationConfidence.LOW: 0.2,
        }
        return scores[self.confidence]

    def to_dict(self) -> dict:
        return {
            "uniclass_code": self.uniclass_code,
            "uniclass_description": self.uniclass_description,
            "omniclass_code": self.omniclass_code,
            "omniclass_description": self.omniclass_description,
            "confidence": self.confidence.value,
            "confidence_score": self.confidence_score,
            "match_method": self.match_method,
        }
