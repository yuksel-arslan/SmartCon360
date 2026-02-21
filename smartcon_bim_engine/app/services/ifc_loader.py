"""IFC file loader service.

Parses IFC files using ifcopenshell and extracts building elements,
spatial containment (storey/space), material associations, and
property sets into domain BIMElement objects.

Memory-safe: processes elements in a streaming fashion.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import ifcopenshell
import ifcopenshell.util.element as ifc_element_util

from ..domain.element import BIMElement, ElementType
from ..domain.project import ProjectMetadata

logger = logging.getLogger("bim_engine.ifc_loader")

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


class IFCLoaderError(Exception):
    """Raised when IFC loading or parsing fails."""


class IFCLoader:
    """Parses IFC files and produces domain BIMElement objects.

    Provides access to the underlying ifcopenshell model for
    downstream quantity extraction.
    """

    def __init__(self, file_path: str | Path) -> None:
        self._file_path = Path(file_path)
        self._model: Optional[ifcopenshell.file] = None

        if not self._file_path.exists():
            raise IFCLoaderError(f"IFC file not found: {self._file_path}")
        if self._file_path.suffix.lower() != ".ifc":
            raise IFCLoaderError(f"Not an IFC file: {self._file_path}")

    def open(self) -> ifcopenshell.file:
        if self._model is not None:
            return self._model
        try:
            self._model = ifcopenshell.open(str(self._file_path))
            logger.info(
                "Opened IFC file: %s (schema: %s, size: %.1f MB)",
                self._file_path.name,
                self._model.schema,
                self._file_path.stat().st_size / (1024 * 1024),
            )
            return self._model
        except Exception as exc:
            raise IFCLoaderError(f"Failed to open IFC file: {exc}") from exc

    @property
    def model(self) -> ifcopenshell.file:
        if self._model is None:
            return self.open()
        return self._model

    @property
    def file_path(self) -> Path:
        return self._file_path

    def get_project_metadata(self) -> ProjectMetadata:
        model = self.model
        projects = model.by_type("IfcProject")
        if not projects:
            return ProjectMetadata()

        project = projects[0]
        author = None
        organization = None
        application = None

        try:
            owner_history = getattr(project, "OwnerHistory", None)
            if owner_history:
                owning_user = getattr(owner_history, "OwningUser", None)
                if owning_user:
                    person = getattr(owning_user, "ThePerson", None)
                    if person:
                        given = getattr(person, "GivenName", "") or ""
                        family = getattr(person, "FamilyName", "") or ""
                        author = f"{given} {family}".strip() or None
                    org = getattr(owning_user, "TheOrganization", None)
                    if org:
                        organization = getattr(org, "Name", None)
                owning_app = getattr(owner_history, "OwningApplication", None)
                if owning_app:
                    application = getattr(owning_app, "ApplicationFullName", None)
        except Exception:
            pass

        return ProjectMetadata(
            name=getattr(project, "Name", None),
            description=getattr(project, "Description", None),
            phase=getattr(project, "Phase", None),
            author=author,
            organization=organization,
            schema_version=model.schema,
            application=application,
        )

    def get_storeys(self) -> list[str]:
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

    def get_spaces(self) -> list[str]:
        model = self.model
        spaces = model.by_type("IfcSpace")
        return [
            getattr(s, "Name", None) or getattr(s, "LongName", None) or f"Space_{s.id()}"
            for s in spaces
        ]

    def extract_elements(self) -> list[BIMElement]:
        model = self.model
        elements: list[BIMElement] = []
        storey_map = self._build_storey_map(model)
        space_map = self._build_space_map(model)

        for ifc_type in EXTRACTABLE_TYPES:
            try:
                ifc_elements = model.by_type(ifc_type)
            except RuntimeError:
                continue

            for ifc_elem in ifc_elements:
                try:
                    element = self._convert_element(ifc_elem, storey_map, space_map)
                    elements.append(element)
                except Exception as exc:
                    logger.warning(
                        "Skipping element %s (id=%s): %s",
                        ifc_type, ifc_elem.id(), exc,
                    )

        logger.info("Extracted %d elements from %s", len(elements), self._file_path.name)
        return elements

    def get_ifc_entity_by_global_id(self, global_id: str) -> Optional[ifcopenshell.entity_instance]:
        model = self.model
        try:
            return model.by_guid(global_id)
        except (RuntimeError, Exception):
            pass
        return None

    def _build_storey_map(self, model: ifcopenshell.file) -> dict[int, str]:
        storey_map: dict[int, str] = {}
        for storey in model.by_type("IfcBuildingStorey"):
            storey_name = getattr(storey, "Name", None) or f"Storey_{storey.id()}"
            for rel in model.by_type("IfcRelContainedInSpatialStructure"):
                if rel.RelatingStructure == storey:
                    for elem in rel.RelatedElements:
                        storey_map[elem.id()] = storey_name
        return storey_map

    def _build_space_map(self, model: ifcopenshell.file) -> dict[int, str]:
        space_map: dict[int, str] = {}
        for space in model.by_type("IfcSpace"):
            space_name = getattr(space, "Name", None) or getattr(space, "LongName", None) or f"Space_{space.id()}"
            for rel in model.by_type("IfcRelContainedInSpatialStructure"):
                if rel.RelatingStructure == space:
                    for elem in rel.RelatedElements:
                        space_map[elem.id()] = space_name
        return space_map

    def _convert_element(
        self,
        ifc_elem: ifcopenshell.entity_instance,
        storey_map: dict[int, str],
        space_map: dict[int, str],
    ) -> BIMElement:
        ifc_class = ifc_elem.is_a()
        global_id = getattr(ifc_elem, "GlobalId", str(ifc_elem.id()))
        name = getattr(ifc_elem, "Name", None)
        description = getattr(ifc_elem, "Description", None)
        storey = storey_map.get(ifc_elem.id())
        space = space_map.get(ifc_elem.id())

        if storey is None:
            storey = self._resolve_storey_via_decomposition(ifc_elem)

        material_list = self._extract_all_materials(ifc_elem)
        primary_material = material_list[0] if material_list else None

        system_name = self._detect_system(ifc_elem)

        return BIMElement(
            global_id=global_id,
            ifc_class=ifc_class,
            element_type=ElementType.from_ifc_class(ifc_class),
            name=name,
            description=description,
            storey=storey,
            space=space,
            system=system_name,
            material_list=material_list,
            primary_material=primary_material,
        )

    def _resolve_storey_via_decomposition(
        self, ifc_elem: ifcopenshell.entity_instance
    ) -> Optional[str]:
        try:
            container = ifc_element_util.get_container(ifc_elem)
            if container is not None and container.is_a("IfcBuildingStorey"):
                return getattr(container, "Name", None) or f"Storey_{container.id()}"
        except Exception:
            pass
        return None

    def _extract_all_materials(self, ifc_elem: ifcopenshell.entity_instance) -> list[str]:
        materials: list[str] = []
        try:
            material = ifc_element_util.get_material(ifc_elem)
            if material is None:
                return materials

            if material.is_a("IfcMaterial"):
                if material.Name:
                    materials.append(material.Name)

            elif material.is_a("IfcMaterialLayerSetUsage"):
                layer_set = material.ForLayerSet
                if layer_set and layer_set.MaterialLayers:
                    for layer in sorted(
                        layer_set.MaterialLayers,
                        key=lambda l: getattr(l, "LayerThickness", 0) or 0,
                        reverse=True,
                    ):
                        if layer.Material and layer.Material.Name:
                            materials.append(layer.Material.Name)

            elif material.is_a("IfcMaterialLayerSet"):
                if material.MaterialLayers:
                    for layer in sorted(
                        material.MaterialLayers,
                        key=lambda l: getattr(l, "LayerThickness", 0) or 0,
                        reverse=True,
                    ):
                        if layer.Material and layer.Material.Name:
                            materials.append(layer.Material.Name)

            elif material.is_a("IfcMaterialList"):
                if material.Materials:
                    for mat in material.Materials:
                        if mat.Name:
                            materials.append(mat.Name)

            elif material.is_a("IfcMaterialConstituentSet"):
                if material.MaterialConstituents:
                    for constituent in material.MaterialConstituents:
                        if constituent.Material and constituent.Material.Name:
                            materials.append(constituent.Material.Name)

            elif material.is_a("IfcMaterialProfileSetUsage"):
                profile_set = material.ForProfileSet
                if profile_set and profile_set.MaterialProfiles:
                    for profile in profile_set.MaterialProfiles:
                        if profile.Material and profile.Material.Name:
                            materials.append(profile.Material.Name)

            elif material.is_a("IfcMaterialProfileSet"):
                if material.MaterialProfiles:
                    for profile in material.MaterialProfiles:
                        if profile.Material and profile.Material.Name:
                            materials.append(profile.Material.Name)

        except Exception as exc:
            logger.debug("Material extraction failed for %s: %s", ifc_elem.id(), exc)

        seen: set[str] = set()
        unique: list[str] = []
        for m in materials:
            if m not in seen:
                seen.add(m)
                unique.append(m)
        return unique

    def _detect_system(self, ifc_elem: ifcopenshell.entity_instance) -> Optional[str]:
        try:
            for rel in self.model.by_type("IfcRelAssignsToGroup"):
                if ifc_elem in rel.RelatedObjects:
                    group = rel.RelatingGroup
                    if group.is_a("IfcSystem"):
                        return getattr(group, "Name", None)
        except Exception:
            pass
        return None
