"""Cost Binder service.

Prepares cost item stubs linked to BIM elements based on
classification codes and quantity data.

This service generates CostItem structures that are compatible
with SmartCon360 CostPilot module for EVM integration.

Note: Actual cost rates are not computed in v1 (no external API calls).
The binder produces structural cost items with quantities bound
from QTO data, ready for rate assignment.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Optional

from ..domain.element import BIMElement
from ..domain.cost import CostItem, CostCategory, CurrencyCode
from ..domain.quantity import QuantityType

logger = logging.getLogger("bim_engine.cost_binder")

SYSTEM_TO_CATEGORY: dict[str, CostCategory] = {
    "Substructure": CostCategory.MATERIAL,
    "Superstructure": CostCategory.MATERIAL,
    "Finishes": CostCategory.MATERIAL,
    "MEP": CostCategory.SUBCONTRACTOR,
    "External": CostCategory.MATERIAL,
    "Spaces": CostCategory.OVERHEAD,
    "Unclassified": CostCategory.OVERHEAD,
}


class CostBinder:
    """Generates cost item stubs from classified BIM elements.

    Groups elements by (system, classification_code, storey) and
    creates one CostItem per group with aggregated quantities.
    """

    def __init__(self, currency: CurrencyCode = CurrencyCode.USD) -> None:
        self._currency = currency

    def generate_cost_items(
        self,
        elements: list[BIMElement],
    ) -> list[CostItem]:
        """Generate cost item stubs grouped by classification and location.

        Each CostItem aggregates quantities for elements sharing the same
        system, classification, and storey.
        """
        grouped: dict[tuple[str, str, str], list[BIMElement]] = defaultdict(list)

        for elem in elements:
            system = elem.resolved_system.value
            cls_code = (
                elem.classification.uniclass_code
                if elem.classification
                else "UNCLASSIFIED"
            )
            storey = elem.storey or "Unknown Storey"
            grouped[(system, cls_code, storey)].append(elem)

        cost_items: list[CostItem] = []
        item_index = 1

        for (system, cls_code, storey), group_elems in sorted(grouped.items()):
            quantity, unit = self._aggregate_primary_quantity(group_elems)

            cls_desc = ""
            if group_elems and group_elems[0].classification:
                cls_desc = group_elems[0].classification.uniclass_description

            description = f"{system} - {cls_desc or cls_code} @ {storey}"
            category = SYSTEM_TO_CATEGORY.get(system, CostCategory.MATERIAL)

            cost_item = CostItem(
                cost_id=f"CI-{item_index:04d}",
                description=description,
                category=category,
                unit=unit,
                unit_rate=0.0,
                quantity=quantity,
                currency=self._currency,
                classification_code=cls_code,
                wbs_code=None,
                element_ids=[e.global_id for e in group_elems],
            )

            cost_items.append(cost_item)
            item_index += 1

        self._link_cost_items_to_elements(cost_items, elements)

        logger.info(
            "Generated %d cost items from %d elements",
            len(cost_items), len(elements),
        )
        return cost_items

    def _aggregate_primary_quantity(
        self, elements: list[BIMElement]
    ) -> tuple[float, str]:
        """Aggregate primary quantities across elements."""
        if not elements:
            return 0.0, "ea"

        type_totals: dict[QuantityType, tuple[float, str]] = {}

        for elem in elements:
            pq = elem.primary_quantity
            if pq is None:
                continue
            if pq.quantity_type not in type_totals:
                type_totals[pq.quantity_type] = (0.0, pq.unit)
            current_total, unit = type_totals[pq.quantity_type]
            type_totals[pq.quantity_type] = (current_total + pq.value, unit)

        if not type_totals:
            return float(len(elements)), "ea"

        for preferred in [QuantityType.VOLUME, QuantityType.AREA, QuantityType.LENGTH]:
            if preferred in type_totals:
                total, unit = type_totals[preferred]
                return total, unit

        qt = next(iter(type_totals))
        total, unit = type_totals[qt]
        return total, unit

    def _link_cost_items_to_elements(
        self,
        cost_items: list[CostItem],
        elements: list[BIMElement],
    ) -> None:
        """Link generated cost items back to their source elements."""
        element_map = {e.global_id: e for e in elements}

        for ci in cost_items:
            for eid in ci.element_ids:
                elem = element_map.get(eid)
                if elem is not None:
                    elem.linked_cost_items.append(ci)
