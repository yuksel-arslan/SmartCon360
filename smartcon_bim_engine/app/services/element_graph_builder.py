"""Element Graph Builder service.

Builds a graph of relationships between BIM elements based on:
- Spatial containment (same storey, same space)
- Structural connections (IfcRelConnectsElements)
- System membership (IfcRelAssignsToGroup / IfcSystem)
- Workflow dependencies (trade sequence within zones)

The graph is represented as Relationship objects attached to BIMElements.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Optional

import ifcopenshell

from ..domain.element import BIMElement
from ..domain.relationship import Relationship, RelationshipType
from ..domain.risk import ComplexityIndex

logger = logging.getLogger("bim_engine.element_graph_builder")


class ElementGraphBuilder:
    """Builds the Element Graph from IFC model and extracted BIMElements.

    Produces Relationship edges between elements and computes
    ComplexityIndex for each element.
    """

    def __init__(self, model: ifcopenshell.file) -> None:
        self._model = model

    def build_graph(self, elements: list[BIMElement]) -> list[Relationship]:
        """Build all relationships and attach them to elements.

        Returns the complete list of relationships.
        """
        element_map = {e.global_id: e for e in elements}

        all_relationships: list[Relationship] = []

        spatial_rels = self._build_spatial_relationships(elements)
        all_relationships.extend(spatial_rels)
        logger.info("Built %d spatial relationships", len(spatial_rels))

        structural_rels = self._build_structural_relationships(element_map)
        all_relationships.extend(structural_rels)
        logger.info("Built %d structural relationships", len(structural_rels))

        system_rels = self._build_system_relationships(element_map)
        all_relationships.extend(system_rels)
        logger.info("Built %d system relationships", len(system_rels))

        for rel in all_relationships:
            source = element_map.get(rel.source_id)
            if source is not None:
                source.relationships.append(rel)

        self._compute_complexity_indices(elements)

        logger.info(
            "Element graph built: %d elements, %d relationships",
            len(elements),
            len(all_relationships),
        )
        return all_relationships

    def _build_spatial_relationships(self, elements: list[BIMElement]) -> list[Relationship]:
        """Build spatial relationships: elements in the same storey or space."""
        relationships: list[Relationship] = []

        storey_groups: dict[str, list[BIMElement]] = defaultdict(list)
        space_groups: dict[str, list[BIMElement]] = defaultdict(list)

        for elem in elements:
            if elem.storey:
                storey_groups[elem.storey].append(elem)
            if elem.space:
                space_groups[elem.space].append(elem)

        for storey, group in storey_groups.items():
            if len(group) < 2:
                continue

            type_groups: dict[str, list[BIMElement]] = defaultdict(list)
            for elem in group:
                type_groups[elem.ifc_class].append(elem)

            for ifc_class, typed_elems in type_groups.items():
                for i in range(len(typed_elems)):
                    for j in range(i + 1, min(i + 5, len(typed_elems))):
                        rel = Relationship(
                            source_id=typed_elems[i].global_id,
                            target_id=typed_elems[j].global_id,
                            relationship_type=RelationshipType.SPATIAL,
                            description=f"Same storey ({storey}), same type ({ifc_class})",
                            weight=0.5,
                        )
                        relationships.append(rel)

        for space, group in space_groups.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i + 1, min(i + 10, len(group))):
                    rel = Relationship(
                        source_id=group[i].global_id,
                        target_id=group[j].global_id,
                        relationship_type=RelationshipType.SPATIAL,
                        description=f"Same space ({space})",
                        weight=0.8,
                    )
                    relationships.append(rel)

        return relationships

    def _build_structural_relationships(
        self, element_map: dict[str, BIMElement]
    ) -> list[Relationship]:
        """Build structural relationships from IfcRelConnectsElements."""
        relationships: list[Relationship] = []

        try:
            connects = self._model.by_type("IfcRelConnectsElements")
        except RuntimeError:
            return relationships

        for rel in connects:
            try:
                relating = rel.RelatingElement
                related = rel.RelatedElement
                if relating is None or related is None:
                    continue

                source_gid = getattr(relating, "GlobalId", None)
                target_gid = getattr(related, "GlobalId", None)

                if source_gid and target_gid and source_gid in element_map and target_gid in element_map:
                    conn_type = getattr(rel, "ConnectionType", None)
                    desc = f"Structural: {conn_type}" if conn_type else "Structural connection"

                    relationships.append(Relationship(
                        source_id=source_gid,
                        target_id=target_gid,
                        relationship_type=RelationshipType.STRUCTURAL,
                        description=desc,
                        weight=1.0,
                    ))
            except Exception as exc:
                logger.debug("Skipping structural rel: %s", exc)

        try:
            voids = self._model.by_type("IfcRelVoidsElement")
        except RuntimeError:
            return relationships

        for void_rel in voids:
            try:
                building_elem = void_rel.RelatingBuildingElement
                opening = void_rel.RelatedOpeningElement
                if building_elem is None or opening is None:
                    continue

                building_gid = getattr(building_elem, "GlobalId", None)
                if building_gid is None or building_gid not in element_map:
                    continue

                try:
                    fills = self._model.by_type("IfcRelFillsElement")
                except RuntimeError:
                    continue

                for fill_rel in fills:
                    if fill_rel.RelatingOpeningElement == opening:
                        filling_elem = fill_rel.RelatedBuildingElement
                        if filling_elem:
                            filling_gid = getattr(filling_elem, "GlobalId", None)
                            if filling_gid and filling_gid in element_map:
                                relationships.append(Relationship(
                                    source_id=building_gid,
                                    target_id=filling_gid,
                                    relationship_type=RelationshipType.STRUCTURAL,
                                    description="Void/Fill (e.g. wall hosts door/window)",
                                    weight=0.9,
                                ))
            except Exception as exc:
                logger.debug("Skipping void rel: %s", exc)

        return relationships

    def _build_system_relationships(
        self, element_map: dict[str, BIMElement]
    ) -> list[Relationship]:
        """Build system relationships from IfcRelAssignsToGroup / IfcSystem."""
        relationships: list[Relationship] = []

        try:
            group_rels = self._model.by_type("IfcRelAssignsToGroup")
        except RuntimeError:
            return relationships

        system_members: dict[str, list[str]] = defaultdict(list)

        for rel in group_rels:
            try:
                group = rel.RelatingGroup
                if group is None:
                    continue
                if not group.is_a("IfcSystem"):
                    continue

                system_name = getattr(group, "Name", None) or f"System_{group.id()}"

                for obj in rel.RelatedObjects:
                    gid = getattr(obj, "GlobalId", None)
                    if gid and gid in element_map:
                        system_members[system_name].append(gid)
            except Exception as exc:
                logger.debug("Skipping group rel: %s", exc)

        for system_name, members in system_members.items():
            if len(members) < 2:
                continue
            for i in range(len(members)):
                for j in range(i + 1, min(i + 5, len(members))):
                    relationships.append(Relationship(
                        source_id=members[i],
                        target_id=members[j],
                        relationship_type=RelationshipType.SYSTEM,
                        description=f"Same system ({system_name})",
                        weight=0.7,
                    ))

        return relationships

    def _compute_complexity_indices(self, elements: list[BIMElement]) -> None:
        """Compute ComplexityIndex for each element."""
        for elem in elements:
            elem.complexity_index = ComplexityIndex.compute(
                relationship_count=len(elem.relationships),
                material_count=len(elem.material_list),
                quantity_count=len(elem.quantities),
            )
