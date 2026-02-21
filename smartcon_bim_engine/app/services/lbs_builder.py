"""LBS (Location Breakdown Structure) Builder service.

Builds a hierarchical LBS from IFC spatial structure:
  Vertical: Storey (from IfcBuildingStorey)
  Horizontal: Space / Zone (from IfcSpace or element clustering)

Supports takt segmentation by producing storey+space groupings
that can be mapped to takt zones.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from ..domain.element import BIMElement

logger = logging.getLogger("bim_engine.lbs_builder")


@dataclass(slots=True)
class LBSNode:
    """Location Breakdown Structure node.

    Hierarchy: Site -> Building -> Storey -> Space/Zone
    """

    level: int
    code: str
    label: str
    node_type: str
    parent_code: Optional[str] = None
    element_count: int = 0
    element_ids: list[str] = field(default_factory=list)
    children: list[LBSNode] = field(default_factory=list)

    def to_dict(self) -> dict:
        result: dict = {
            "level": self.level,
            "code": self.code,
            "label": self.label,
            "node_type": self.node_type,
            "element_count": self.element_count,
        }
        if self.children:
            result["children"] = [c.to_dict() for c in self.children]
        return result


class LBSBuilder:
    """Builds a hierarchical LBS from extracted BIM elements.

    The LBS provides the spatial framework for takt zone generation.
    """

    def build(
        self,
        elements: list[BIMElement],
        storeys: list[str],
        spaces: list[str],
        site_name: str = "Site",
        building_name: str = "Building",
    ) -> LBSNode:
        """Build the complete LBS hierarchy.

        Returns the root LBSNode (Site level).
        """
        storey_elements: dict[str, list[BIMElement]] = defaultdict(list)
        space_elements: dict[str, dict[str, list[BIMElement]]] = defaultdict(
            lambda: defaultdict(list)
        )

        for elem in elements:
            storey = elem.storey or "Unknown Storey"
            storey_elements[storey].append(elem)

            if elem.space:
                space_elements[storey][elem.space].append(elem)
            else:
                space_elements[storey]["General"].append(elem)

        site_node = LBSNode(
            level=0,
            code="SITE",
            label=site_name,
            node_type="site",
        )

        building_node = LBSNode(
            level=1,
            code="SITE.B01",
            label=building_name,
            node_type="building",
            parent_code="SITE",
        )

        storey_order = storeys if storeys else sorted(storey_elements.keys())
        storey_index = 1

        for storey_name in storey_order:
            elems_in_storey = storey_elements.get(storey_name, [])

            storey_code = f"SITE.B01.F{storey_index:02d}"
            storey_node = LBSNode(
                level=2,
                code=storey_code,
                label=storey_name,
                node_type="storey",
                parent_code="SITE.B01",
                element_count=len(elems_in_storey),
                element_ids=[e.global_id for e in elems_in_storey],
            )

            space_groups = space_elements.get(storey_name, {})
            space_index = 1

            for space_name in sorted(space_groups.keys()):
                space_elems = space_groups[space_name]
                space_code = f"{storey_code}.S{space_index:02d}"

                space_node = LBSNode(
                    level=3,
                    code=space_code,
                    label=space_name,
                    node_type="space",
                    parent_code=storey_code,
                    element_count=len(space_elems),
                    element_ids=[e.global_id for e in space_elems],
                )

                storey_node.children.append(space_node)
                space_index += 1

            building_node.children.append(storey_node)
            storey_index += 1

        for storey_name in sorted(storey_elements.keys()):
            if storey_name in storey_order:
                continue
            elems = storey_elements[storey_name]
            storey_code = f"SITE.B01.F{storey_index:02d}"
            extra_node = LBSNode(
                level=2,
                code=storey_code,
                label=storey_name,
                node_type="storey",
                parent_code="SITE.B01",
                element_count=len(elems),
                element_ids=[e.global_id for e in elems],
            )
            building_node.children.append(extra_node)
            storey_index += 1

        building_node.element_count = sum(c.element_count for c in building_node.children)
        site_node.children.append(building_node)
        site_node.element_count = building_node.element_count

        logger.info(
            "Built LBS: %d storeys, %d total elements",
            len(building_node.children),
            site_node.element_count,
        )
        return site_node

    def build_flat(self, elements: list[BIMElement]) -> list[dict]:
        """Build a flat LBS list showing storey x space matrix."""
        flat: list[dict] = []

        grouped: dict[str, dict[str, list[str]]] = defaultdict(
            lambda: defaultdict(list)
        )

        for elem in elements:
            storey = elem.storey or "Unknown Storey"
            space = elem.space or "General"
            grouped[storey][space].append(elem.global_id)

        for storey in sorted(grouped.keys()):
            for space in sorted(grouped[storey].keys()):
                element_ids = grouped[storey][space]
                flat.append({
                    "storey": storey,
                    "space": space,
                    "element_count": len(element_ids),
                })

        return flat
