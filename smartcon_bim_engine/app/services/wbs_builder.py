"""WBS (Work Breakdown Structure) Builder service.

Aggregates classified, quantified elements into a hierarchical WBS:
  Level 1: System (Substructure, Superstructure, Finishes, MEP, External)
  Level 2: Classification code
  Level 3: Storey
  Level 4: Entity (individual elements)

Quantities are aggregated by (system, classification, storey).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from ..domain.element import BIMElement, ElementSystem
from ..domain.quantity import QuantityRecord, QuantityType

logger = logging.getLogger("bim_engine.wbs_builder")

SYSTEM_ORDER: list[str] = [
    "Substructure",
    "Superstructure",
    "Finishes",
    "MEP",
    "External",
    "Spaces",
    "Unclassified",
]


@dataclass(slots=True)
class WBSNode:
    """Work Breakdown Structure node aggregating quantities.

    Hierarchy: System -> Classification -> Storey -> Entity
    """

    level: int
    code: str
    label: str
    parent_code: Optional[str] = None
    quantity: float = 0.0
    unit: str = ""
    element_count: int = 0
    children: list[WBSNode] = field(default_factory=list)

    def to_dict(self) -> dict:
        result: dict = {
            "level": self.level,
            "code": self.code,
            "label": self.label,
            "quantity": round(self.quantity, 4),
            "unit": self.unit,
            "element_count": self.element_count,
        }
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result


class WBSBuilder:
    """Builds a hierarchical WBS from classified, quantified elements."""

    def build(self, elements: list[BIMElement]) -> list[WBSNode]:
        """Build the WBS hierarchy from a list of elements.

        Returns list of Level-1 (System) WBSNode objects.
        """
        if not elements:
            logger.warning("No elements provided for WBS building")
            return []

        grouped: dict[str, dict[str, dict[str, list[BIMElement]]]] = defaultdict(
            lambda: defaultdict(lambda: defaultdict(list))
        )

        for elem in elements:
            system = elem.resolved_system.value
            classification_code = (
                elem.classification.uniclass_code
                if elem.classification
                else "UNCLASSIFIED"
            )
            storey = elem.storey or "Unknown Storey"
            grouped[system][classification_code][storey].append(elem)

        root_nodes: list[WBSNode] = []
        system_index = 1

        for system_name in SYSTEM_ORDER:
            if system_name not in grouped:
                continue

            system_node = WBSNode(
                level=1,
                code=f"S{system_index:02d}",
                label=system_name,
                parent_code=None,
            )

            classification_groups = grouped[system_name]
            cls_index = 1

            for cls_code in sorted(classification_groups.keys()):
                storey_groups = classification_groups[cls_code]

                cls_node = WBSNode(
                    level=2,
                    code=f"{system_node.code}.{cls_index:02d}",
                    label=cls_code,
                    parent_code=system_node.code,
                )

                storey_index = 1
                for storey_name in sorted(storey_groups.keys()):
                    storey_elements = storey_groups[storey_name]

                    storey_node = WBSNode(
                        level=3,
                        code=f"{cls_node.code}.{storey_index:02d}",
                        label=storey_name,
                        parent_code=cls_node.code,
                        element_count=len(storey_elements),
                    )

                    agg_qty, agg_unit = self._aggregate_quantities(storey_elements)
                    storey_node.quantity = agg_qty
                    storey_node.unit = agg_unit

                    cls_node.children.append(storey_node)
                    storey_index += 1

                cls_node.quantity = sum(c.quantity for c in cls_node.children)
                cls_node.unit = cls_node.children[0].unit if cls_node.children else ""
                cls_node.element_count = sum(c.element_count for c in cls_node.children)

                system_node.children.append(cls_node)
                cls_index += 1

            system_node.quantity = sum(c.quantity for c in system_node.children)
            system_node.unit = system_node.children[0].unit if system_node.children else ""
            system_node.element_count = sum(c.element_count for c in system_node.children)

            root_nodes.append(system_node)
            system_index += 1

        for system_name in sorted(grouped.keys()):
            if system_name in SYSTEM_ORDER:
                continue
            system_node = WBSNode(
                level=1,
                code=f"S{system_index:02d}",
                label=system_name,
                parent_code=None,
                element_count=sum(
                    len(elems)
                    for cls_group in grouped[system_name].values()
                    for elems in cls_group.values()
                ),
            )
            root_nodes.append(system_node)
            system_index += 1

        logger.info(
            "Built WBS: %d systems, %d total elements",
            len(root_nodes),
            sum(n.element_count for n in root_nodes),
        )
        return root_nodes

    def build_flat(self, elements: list[BIMElement]) -> list[dict]:
        """Build a flat WBS list for the SmartCon360 output format."""
        flat: list[dict] = []

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

        for (system, cls_code, storey), elems in sorted(grouped.items()):
            qty, unit = self._aggregate_quantities(elems)
            flat.append({
                "system": system,
                "classification_code": cls_code,
                "storey": storey,
                "quantity": round(qty, 4),
                "unit": unit,
                "element_count": len(elems),
            })

        return flat

    def _aggregate_quantities(
        self, elements: list[BIMElement]
    ) -> tuple[float, str]:
        if not elements:
            return 0.0, ""

        primaries: list[QuantityRecord] = []
        for elem in elements:
            pq = elem.primary_quantity
            if pq is not None:
                primaries.append(pq)

        if not primaries:
            return float(len(elements)), "ea"

        type_counts: dict[QuantityType, int] = defaultdict(int)
        for q in primaries:
            type_counts[q.quantity_type] += 1

        dominant_type = max(type_counts, key=lambda t: type_counts[t])
        total = sum(q.value for q in primaries if q.quantity_type == dominant_type)
        unit = next(q.unit for q in primaries if q.quantity_type == dominant_type)

        return total, unit
