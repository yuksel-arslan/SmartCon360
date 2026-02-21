"""WBS (Work Breakdown Structure) builder.

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
from typing import Optional

from ..domain.models import Element, Quantity, QuantityType, WBSNode

logger = logging.getLogger("bim.wbs_builder")

# System classification based on IFC entity type and storey
SYSTEM_MAP: dict[str, str] = {
    "IfcFooting": "Substructure",
    "IfcPile": "Substructure",
    "IfcWall": "Superstructure",
    "IfcWallStandardCase": "Superstructure",
    "IfcSlab": "Superstructure",
    "IfcBeam": "Superstructure",
    "IfcColumn": "Superstructure",
    "IfcStairFlight": "Superstructure",
    "IfcStair": "Superstructure",
    "IfcRamp": "Superstructure",
    "IfcRampFlight": "Superstructure",
    "IfcRoof": "Superstructure",
    "IfcCurtainWall": "Superstructure",
    "IfcPlate": "Superstructure",
    "IfcMember": "Superstructure",
    "IfcDoor": "Finishes",
    "IfcWindow": "Finishes",
    "IfcCovering": "Finishes",
    "IfcRailing": "Finishes",
    "IfcBuildingElementProxy": "Superstructure",
    "IfcSpace": "Spaces",
    "IfcDistributionElement": "MEP",
    "IfcFlowTerminal": "MEP",
    "IfcFlowSegment": "MEP",
    "IfcFlowFitting": "MEP",
}

# System ordering for consistent output
SYSTEM_ORDER: list[str] = [
    "Substructure",
    "Superstructure",
    "Finishes",
    "MEP",
    "External",
    "Spaces",
    "Unclassified",
]


class WBSBuilderError(Exception):
    """Raised when WBS building fails."""


class WBSBuilder:
    """Builds a hierarchical WBS from classified, quantified elements."""

    def build(self, elements: list[Element]) -> list[WBSNode]:
        """Build the WBS hierarchy from a list of elements.

        Returns:
            List of Level-1 (System) WBSNode objects, each containing
            nested Level-2 (Classification) → Level-3 (Storey) → Level-4 (Entity) nodes.
        """
        if not elements:
            logger.warning("No elements provided for WBS building")
            return []

        # Group elements by (system, classification_code, storey)
        grouped: dict[str, dict[str, dict[str, list[Element]]]] = defaultdict(
            lambda: defaultdict(lambda: defaultdict(list))
        )

        for elem in elements:
            system = self._resolve_system(elem)
            classification_code = (
                elem.classification.uniclass_code
                if elem.classification
                else "UNCLASSIFIED"
            )
            storey = elem.storey or "Unknown Storey"
            grouped[system][classification_code][storey].append(elem)

        # Build hierarchy
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

                    # Aggregate quantities at storey level
                    agg_qty, agg_unit = self._aggregate_quantities(storey_elements)
                    storey_node.quantity = agg_qty
                    storey_node.unit = agg_unit

                    cls_node.children.append(storey_node)
                    storey_index += 1

                # Roll up to classification level
                cls_node.quantity = sum(c.quantity for c in cls_node.children)
                cls_node.unit = cls_node.children[0].unit if cls_node.children else ""
                cls_node.element_count = sum(c.element_count for c in cls_node.children)

                system_node.children.append(cls_node)
                cls_index += 1

            # Roll up to system level
            system_node.quantity = sum(c.quantity for c in system_node.children)
            system_node.unit = system_node.children[0].unit if system_node.children else ""
            system_node.element_count = sum(c.element_count for c in system_node.children)

            root_nodes.append(system_node)
            system_index += 1

        # Handle any systems not in SYSTEM_ORDER
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

    def build_flat(self, elements: list[Element]) -> list[dict]:
        """Build a flat WBS list for the SmartCon360 output format.

        Returns list of dicts with keys: system, classification_code, storey, quantity, unit.
        """
        flat: list[dict] = []

        grouped: dict[tuple[str, str, str], list[Element]] = defaultdict(list)
        for elem in elements:
            system = self._resolve_system(elem)
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

    def _resolve_system(self, element: Element) -> str:
        """Determine the system (Level 1) for an element."""
        # Check storey name for substructure indicators
        storey = (element.storey or "").lower()
        if any(kw in storey for kw in ("basement", "foundation", "b1", "b2", "b3", "sub")):
            if element.ifc_class in (
                "IfcWall", "IfcWallStandardCase", "IfcSlab",
                "IfcColumn", "IfcBeam",
            ):
                return "Substructure"

        return SYSTEM_MAP.get(element.ifc_class, "Unclassified")

    def _aggregate_quantities(
        self, elements: list[Element]
    ) -> tuple[float, str]:
        """Aggregate primary quantities across elements.

        Uses the primary quantity of each element. If mixed types,
        groups by the most common quantity type.
        """
        if not elements:
            return 0.0, ""

        # Collect all primary quantities
        primaries: list[Quantity] = []
        for elem in elements:
            pq = elem.primary_quantity
            if pq is not None:
                primaries.append(pq)

        if not primaries:
            return float(len(elements)), "ea"

        # Find most common quantity type
        type_counts: dict[QuantityType, int] = defaultdict(int)
        for q in primaries:
            type_counts[q.quantity_type] += 1

        dominant_type = max(type_counts, key=lambda t: type_counts[t])

        # Sum quantities of the dominant type
        total = sum(q.value for q in primaries if q.quantity_type == dominant_type)
        unit = next(q.unit for q in primaries if q.quantity_type == dominant_type)

        return total, unit
