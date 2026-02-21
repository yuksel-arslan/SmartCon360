"""Cost domain model.

Represents cost items that can be linked to BIM elements for
cost intelligence and EVM integration with CostPilot.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class CurrencyCode(str, Enum):
    """Supported currency codes."""

    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    TRY = "TRY"
    AED = "AED"
    SAR = "SAR"
    QAR = "QAR"


class CostCategory(str, Enum):
    """High-level cost category for classification."""

    LABOR = "labor"
    MATERIAL = "material"
    EQUIPMENT = "equipment"
    SUBCONTRACTOR = "subcontractor"
    OVERHEAD = "overhead"
    CONTINGENCY = "contingency"


@dataclass(slots=True)
class CostItem:
    """A cost line item linked to one or more BIM elements.

    Supports both unit-rate and lump-sum pricing.
    Designed to integrate with CostPilot EVM tracking.
    """

    cost_id: str
    description: str
    category: CostCategory
    unit: str
    unit_rate: float
    quantity: float = 0.0
    currency: CurrencyCode = CurrencyCode.USD
    classification_code: Optional[str] = None
    wbs_code: Optional[str] = None
    element_ids: list[str] = field(default_factory=list)

    @property
    def total_cost(self) -> float:
        return round(self.unit_rate * self.quantity, 2)

    def to_dict(self) -> dict:
        return {
            "cost_id": self.cost_id,
            "description": self.description,
            "category": self.category.value,
            "unit": self.unit,
            "unit_rate": self.unit_rate,
            "quantity": round(self.quantity, 4),
            "total_cost": self.total_cost,
            "currency": self.currency.value,
            "classification_code": self.classification_code,
            "wbs_code": self.wbs_code,
            "element_ids": self.element_ids,
        }
