"""IFC file parser using ifcopenshell.

Extracts building elements, their spatial containment (storey),
material associations, and property sets from an IFC model.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import ifcopenshell
import ifcopenshell.util.element as ifc_element_util

from ..domain.models import Element, ElementType

logger = logging.getLogger("bim.ifc_parser")

# IFC entity types to extract
EXTRACTABLE_TYPES: tuple[str, ...] = (
    "IfcWall",
    "IfcWallStandardCase",
    "IfcSlab",
    "IfcBeam",
    "IfcColumn",
    "IfcDoor",
    "IfcWindow",
    "IfcStairFlight",
    "IfcStair",
    "IfcRailing",
    "IfcRoof",
    "IfcCurtainWall",
    "IfcPlate",
    "IfcMember",
    "IfcFooting",
    "IfcPile",
    "IfcCovering",
    "IfcRamp",
    "IfcRampFlight",
    "IfcBuildingElementProxy",
    "IfcSpace",
    "IfcDistributionElement",
    "IfcFlowTerminal",
    "IfcFlowSegment",
    "IfcFlowFitting",
)


class IFCParserError(Exception):
    """Raised when IFC parsing fails."""


class IFCParser:
    """Parses IFC files and extracts building elements with metadata."""

    def __init__(self, file_path: str | Path) -> None:
        self._file_path = Path(file_path)
        self._model: Optional[ifcopenshell.file] = None

        if not self._file_path.exists():
            raise IFCParserError(f"IFC file not found: {self._file_path}")
        if not self._file_path.suffix.lower() == ".ifc":
            raise IFCParserError(f"Not an IFC file: {self._file_path}")

    def open(self) -> ifcopenshell.file:
        """Open and return the IFC model. Caches the result."""
        if self._model is not None:
            return self._model
        try:
            self._model = ifcopenshell.open(str(self._file_path))
            logger.info(
                "Opened IFC file: %s (schema: %s)",
                self._file_path.name,
                self._model.schema,
            )
            return self._model
        except Exception as exc:
            raise IFCParserError(f"Failed to open IFC file: {exc}") from exc

    @property
    def model(self) -> ifcopenshell.file:
        if self._model is None:
            return self.open()
        return self._model

    def get_project_info(self) -> dict[str, Optional[str]]:
        """Extract project-level metadata."""
        model = self.model
        projects = model.by_type("IfcProject")
        if not projects:
            return {"name": None, "description": None, "phase": None}
        project = projects[0]
        return {
            "name": getattr(project, "Name", None),
            "description": getattr(project, "Description", None),
            "phase": getattr(project, "Phase", None),
        }

    def get_storeys(self) -> list[str]:
        """Extract all building storey names, ordered by elevation."""
        model = self.model
        storeys = model.by_type("IfcBuildingStorey")
        sorted_storeys = sorted(
            storeys,
            key=lambda s: getattr(s, "Elevation", 0.0) or 0.0,
        )
        return [
            getattr(s, "Name", None) or f"Storey_{s.id()}"
            for s in sorted_storeys
        ]

    def extract_elements(self) -> list[Element]:
        """Extract all building elements from the IFC model.

        Returns a list of domain Element objects with storey and material resolved.
        """
        model = self.model
        elements: list[Element] = []
        storey_map = self._build_storey_map(model)

        for ifc_type in EXTRACTABLE_TYPES:
            try:
                ifc_elements = model.by_type(ifc_type)
            except RuntimeError:
                # Schema may not support this type
                continue

            for ifc_elem in ifc_elements:
                try:
                    element = self._convert_element(ifc_elem, storey_map)
                    elements.append(element)
                except Exception as exc:
                    logger.warning(
                        "Skipping element %s (id=%s): %s",
                        ifc_type,
                        ifc_elem.id(),
                        exc,
                    )

        logger.info("Extracted %d elements from %s", len(elements), self._file_path.name)
        return elements

    def _build_storey_map(self, model: ifcopenshell.file) -> dict[int, str]:
        """Build a mapping from element id → storey name via spatial containment."""
        storey_map: dict[int, str] = {}
        for storey in model.by_type("IfcBuildingStorey"):
            storey_name = getattr(storey, "Name", None) or f"Storey_{storey.id()}"
            for rel in model.by_type("IfcRelContainedInSpatialStructure"):
                if rel.RelatingStructure == storey:
                    for elem in rel.RelatedElements:
                        storey_map[elem.id()] = storey_name
        return storey_map

    def _convert_element(
        self,
        ifc_elem: ifcopenshell.entity_instance,
        storey_map: dict[int, str],
    ) -> Element:
        """Convert a single ifcopenshell entity to a domain Element."""
        ifc_class = ifc_elem.is_a()
        global_id = getattr(ifc_elem, "GlobalId", str(ifc_elem.id()))
        name = getattr(ifc_elem, "Name", None)
        description = getattr(ifc_elem, "Description", None)
        storey = storey_map.get(ifc_elem.id())

        # Storey fallback: walk decomposition
        if storey is None:
            storey = self._resolve_storey_via_decomposition(ifc_elem)

        material = self._extract_material(ifc_elem)

        return Element(
            global_id=global_id,
            ifc_class=ifc_class,
            element_type=ElementType.from_ifc_class(ifc_class),
            name=name,
            description=description,
            storey=storey,
            material=material,
        )

    def _resolve_storey_via_decomposition(
        self, ifc_elem: ifcopenshell.entity_instance
    ) -> Optional[str]:
        """Walk IfcRelAggregates / IfcRelVoidsElement to find containing storey."""
        try:
            container = ifc_element_util.get_container(ifc_elem)
            if container is not None and container.is_a("IfcBuildingStorey"):
                return getattr(container, "Name", None) or f"Storey_{container.id()}"
        except Exception:
            pass
        return None

    def _extract_material(self, ifc_elem: ifcopenshell.entity_instance) -> Optional[str]:
        """Extract the primary material name from an element."""
        try:
            material = ifc_element_util.get_material(ifc_elem)
            if material is None:
                return None
            if material.is_a("IfcMaterial"):
                return material.Name
            if material.is_a("IfcMaterialLayerSetUsage"):
                layer_set = material.ForLayerSet
                if layer_set and layer_set.MaterialLayers:
                    thickest = max(
                        layer_set.MaterialLayers,
                        key=lambda l: getattr(l, "LayerThickness", 0) or 0,
                    )
                    if thickest.Material:
                        return thickest.Material.Name
            if material.is_a("IfcMaterialLayerSet"):
                if material.MaterialLayers:
                    thickest = max(
                        material.MaterialLayers,
                        key=lambda l: getattr(l, "LayerThickness", 0) or 0,
                    )
                    if thickest.Material:
                        return thickest.Material.Name
            if material.is_a("IfcMaterialList"):
                if material.Materials:
                    return material.Materials[0].Name
            if material.is_a("IfcMaterialConstituentSet"):
                if material.MaterialConstituents:
                    return material.MaterialConstituents[0].Material.Name
            if material.is_a("IfcMaterialProfileSetUsage"):
                profile_set = material.ForProfileSet
                if profile_set and profile_set.MaterialProfiles:
                    return profile_set.MaterialProfiles[0].Material.Name
            if material.is_a("IfcMaterialProfileSet"):
                if material.MaterialProfiles:
                    return material.MaterialProfiles[0].Material.Name
        except Exception as exc:
            logger.debug("Material extraction failed for %s: %s", ifc_elem.id(), exc)
        return None
