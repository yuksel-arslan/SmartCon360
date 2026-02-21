"""Quantity extraction service.

Extracts quantities from IFC elements following the priority order:
1. BaseQuantities property sets (Qto_*BaseQuantities)
2. Qto_* property sets (non-base)
3. Geometry fallback (bounding box / shape representation)

All values are normalized to SI units.
"""

from __future__ import annotations

import logging
from typing import Optional

import ifcopenshell

from ..domain.element import BIMElement
from ..domain.quantity import (
    QuantityRecord,
    QuantitySource,
    QuantityType,
    DEFAULT_UNITS,
    normalize_unit,
)

logger = logging.getLogger("bim_engine.quantity_extractor")

QUANTITY_NAME_MAP: dict[str, QuantityType] = {
    "Length": QuantityType.LENGTH,
    "Height": QuantityType.LENGTH,
    "Width": QuantityType.LENGTH,
    "Depth": QuantityType.LENGTH,
    "Perimeter": QuantityType.LENGTH,
    "NetArea": QuantityType.AREA,
    "GrossArea": QuantityType.AREA,
    "NetSideArea": QuantityType.AREA,
    "GrossSideArea": QuantityType.AREA,
    "NetFloorArea": QuantityType.AREA,
    "GrossFloorArea": QuantityType.AREA,
    "NetCeilingArea": QuantityType.AREA,
    "GrossCeilingArea": QuantityType.AREA,
    "CrossSectionArea": QuantityType.AREA,
    "OuterSurfaceArea": QuantityType.AREA,
    "TotalSurfaceArea": QuantityType.AREA,
    "NetSurfaceArea": QuantityType.AREA,
    "GrossSurfaceArea": QuantityType.AREA,
    "ProjectedArea": QuantityType.AREA,
    "Area": QuantityType.AREA,
    "NetVolume": QuantityType.VOLUME,
    "GrossVolume": QuantityType.VOLUME,
    "Volume": QuantityType.VOLUME,
    "NetWeight": QuantityType.WEIGHT,
    "GrossWeight": QuantityType.WEIGHT,
    "Weight": QuantityType.WEIGHT,
    "Count": QuantityType.COUNT,
}

PRIMARY_QUANTITY_PREFERENCE: dict[str, list[str]] = {
    "IfcWall": ["NetVolume", "GrossVolume", "NetSideArea", "GrossSideArea"],
    "IfcWallStandardCase": ["NetVolume", "GrossVolume", "NetSideArea", "GrossSideArea"],
    "IfcSlab": ["NetVolume", "GrossVolume", "NetArea", "GrossArea"],
    "IfcBeam": ["NetVolume", "GrossVolume", "Length"],
    "IfcColumn": ["NetVolume", "GrossVolume", "Length"],
    "IfcDoor": ["Area", "NetArea"],
    "IfcWindow": ["Area", "NetArea"],
    "IfcStairFlight": ["NetVolume", "GrossVolume", "Length"],
    "IfcRoof": ["NetArea", "GrossArea", "ProjectedArea"],
    "IfcFooting": ["NetVolume", "GrossVolume"],
    "IfcPile": ["NetVolume", "GrossVolume", "Length"],
    "IfcCovering": ["NetArea", "GrossArea"],
    "IfcCurtainWall": ["NetArea", "GrossArea"],
    "IfcPlate": ["NetVolume", "GrossVolume", "NetArea"],
    "IfcMember": ["NetVolume", "GrossVolume", "Length"],
    "IfcRailing": ["Length"],
    "IfcRamp": ["NetVolume", "GrossVolume"],
    "IfcRampFlight": ["NetVolume", "GrossVolume"],
    "IfcSpace": ["NetFloorArea", "GrossFloorArea", "NetVolume", "GrossVolume"],
}


class QuantityExtractorError(Exception):
    """Raised when quantity extraction fails."""


class QuantityExtractor:
    """Extracts quantities from IFC elements following the priority order."""

    def __init__(self, model: ifcopenshell.file) -> None:
        self._model = model
        self._pset_cache: dict[int, dict[str, ifcopenshell.entity_instance]] = {}
        self._rel_defines: Optional[list] = None

    def extract_quantities(
        self,
        element: BIMElement,
        ifc_elem: ifcopenshell.entity_instance,
    ) -> list[QuantityRecord]:
        """Extract all available quantities for an element."""
        quantities: list[QuantityRecord] = []

        base_qtys = self._extract_from_base_quantities(ifc_elem)
        quantities.extend(base_qtys)

        qto_qtys = self._extract_from_qto_sets(ifc_elem)
        existing_names = {q.name for q in quantities}
        for q in qto_qtys:
            if q.name not in existing_names:
                quantities.append(q)
                existing_names.add(q.name)

        if not quantities:
            geo_qtys = self._extract_from_geometry(ifc_elem, element.ifc_class)
            quantities.extend(geo_qtys)

        return quantities

    def extract_all(
        self,
        elements: list[BIMElement],
        loader: object,
    ) -> int:
        """Extract quantities for all elements. Returns count of elements with quantities."""
        extracted_count = 0
        for elem in elements:
            ifc_entity = None

            if hasattr(loader, 'get_ifc_entity_by_global_id'):
                ifc_entity = loader.get_ifc_entity_by_global_id(elem.global_id)

            if ifc_entity is None:
                try:
                    for entity in self._model.by_type(elem.ifc_class):
                        if getattr(entity, "GlobalId", None) == elem.global_id:
                            ifc_entity = entity
                            break
                except RuntimeError:
                    continue

            if ifc_entity is not None:
                try:
                    quantities = self.extract_quantities(elem, ifc_entity)
                    elem.quantities = quantities
                    if quantities:
                        extracted_count += 1
                except Exception as exc:
                    logger.warning(
                        "Quantity extraction failed for %s: %s",
                        elem.global_id, exc,
                    )

        logger.info(
            "Quantities extracted: %d / %d elements",
            extracted_count, len(elements),
        )
        return extracted_count

    def _get_rel_defines(self) -> list:
        if self._rel_defines is None:
            try:
                self._rel_defines = list(self._model.by_type("IfcRelDefinesByProperties"))
            except RuntimeError:
                self._rel_defines = []
        return self._rel_defines

    def _get_property_sets(
        self, ifc_elem: ifcopenshell.entity_instance
    ) -> dict[str, ifcopenshell.entity_instance]:
        elem_id = ifc_elem.id()
        if elem_id in self._pset_cache:
            return self._pset_cache[elem_id]

        psets: dict[str, ifcopenshell.entity_instance] = {}
        for rel in self._get_rel_defines():
            if ifc_elem not in rel.RelatedObjects:
                continue
            prop_def = rel.RelatingPropertyDefinition
            if prop_def is None:
                continue
            name = getattr(prop_def, "Name", None) or str(prop_def.id())
            psets[name] = prop_def

        self._pset_cache[elem_id] = psets
        return psets

    def _extract_from_base_quantities(
        self, ifc_elem: ifcopenshell.entity_instance
    ) -> list[QuantityRecord]:
        quantities: list[QuantityRecord] = []
        psets = self._get_property_sets(ifc_elem)
        for pset_name, pset in psets.items():
            if "BaseQuantities" not in pset_name:
                continue
            quantities.extend(
                self._parse_quantity_set(pset, QuantitySource.BASE_QUANTITIES)
            )
        return quantities

    def _extract_from_qto_sets(
        self, ifc_elem: ifcopenshell.entity_instance
    ) -> list[QuantityRecord]:
        quantities: list[QuantityRecord] = []
        psets = self._get_property_sets(ifc_elem)
        for pset_name, pset in psets.items():
            if not pset_name.startswith("Qto_"):
                continue
            if "BaseQuantities" in pset_name:
                continue
            quantities.extend(
                self._parse_quantity_set(pset, QuantitySource.QTO_PROPERTY_SET)
            )
        return quantities

    def _parse_quantity_set(
        self,
        pset: ifcopenshell.entity_instance,
        source: QuantitySource,
    ) -> list[QuantityRecord]:
        quantities: list[QuantityRecord] = []
        if not hasattr(pset, "Quantities"):
            return quantities

        for q in pset.Quantities:
            name = getattr(q, "Name", None)
            if name is None:
                continue

            value = self._get_quantity_value(q)
            if value is None or value <= 0:
                continue

            qty_type = QUANTITY_NAME_MAP.get(name, self._infer_quantity_type(q))
            raw_unit = self._resolve_unit(q, qty_type)
            norm_value, norm_unit = normalize_unit(value, raw_unit)

            quantities.append(
                QuantityRecord(
                    name=name,
                    value=norm_value,
                    unit=norm_unit,
                    quantity_type=qty_type,
                    source=source,
                )
            )
        return quantities

    def _get_quantity_value(self, q: ifcopenshell.entity_instance) -> Optional[float]:
        for attr in ("LengthValue", "AreaValue", "VolumeValue", "WeightValue", "CountValue"):
            val = getattr(q, attr, None)
            if val is not None:
                try:
                    return float(val)
                except (TypeError, ValueError):
                    continue
        return None

    def _infer_quantity_type(self, q: ifcopenshell.entity_instance) -> QuantityType:
        qtype = q.is_a()
        type_map = {
            "IfcQuantityLength": QuantityType.LENGTH,
            "IfcQuantityArea": QuantityType.AREA,
            "IfcQuantityVolume": QuantityType.VOLUME,
            "IfcQuantityWeight": QuantityType.WEIGHT,
            "IfcQuantityCount": QuantityType.COUNT,
        }
        return type_map.get(qtype, QuantityType.VOLUME)

    def _resolve_unit(self, q: ifcopenshell.entity_instance, qty_type: QuantityType) -> str:
        unit = getattr(q, "Unit", None)
        if unit is not None:
            unit_name = getattr(unit, "Name", None)
            if unit_name:
                return str(unit_name)
        return DEFAULT_UNITS.get(qty_type, "m3")

    def _extract_from_geometry(
        self, ifc_elem: ifcopenshell.entity_instance, ifc_class: str
    ) -> list[QuantityRecord]:
        quantities: list[QuantityRecord] = []
        try:
            representation = ifc_elem.Representation
            if representation is None:
                return quantities

            bbox = self._compute_bounding_box(representation)
            if bbox is None:
                return quantities

            dx, dy, dz = bbox

            if ifc_class in ("IfcWall", "IfcWallStandardCase", "IfcCurtainWall"):
                length = max(dx, dy)
                height = dz
                thickness = min(dx, dy)
                volume = length * height * thickness
                area = length * height

                quantities.append(QuantityRecord(
                    name="GrossVolume", value=volume, unit="m3",
                    quantity_type=QuantityType.VOLUME,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))
                quantities.append(QuantityRecord(
                    name="GrossSideArea", value=area, unit="m2",
                    quantity_type=QuantityType.AREA,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))
                quantities.append(QuantityRecord(
                    name="Length", value=length, unit="m",
                    quantity_type=QuantityType.LENGTH,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))

            elif ifc_class in ("IfcSlab", "IfcRoof", "IfcCovering"):
                area = dx * dy
                volume = dx * dy * dz

                quantities.append(QuantityRecord(
                    name="GrossArea", value=area, unit="m2",
                    quantity_type=QuantityType.AREA,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))
                quantities.append(QuantityRecord(
                    name="GrossVolume", value=volume, unit="m3",
                    quantity_type=QuantityType.VOLUME,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))

            elif ifc_class in ("IfcBeam", "IfcColumn", "IfcMember", "IfcPile"):
                length = max(dx, dy, dz)
                cross_section = sorted([dx, dy, dz])
                area = cross_section[0] * cross_section[1]
                volume = area * length

                quantities.append(QuantityRecord(
                    name="Length", value=length, unit="m",
                    quantity_type=QuantityType.LENGTH,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))
                quantities.append(QuantityRecord(
                    name="GrossVolume", value=volume, unit="m3",
                    quantity_type=QuantityType.VOLUME,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))

            elif ifc_class in ("IfcDoor", "IfcWindow"):
                area = dx * dz if dx > dy else dy * dz
                quantities.append(QuantityRecord(
                    name="Area", value=area, unit="m2",
                    quantity_type=QuantityType.AREA,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))

            elif ifc_class == "IfcSpace":
                floor_area = dx * dy
                volume = dx * dy * dz

                quantities.append(QuantityRecord(
                    name="GrossFloorArea", value=floor_area, unit="m2",
                    quantity_type=QuantityType.AREA,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))
                quantities.append(QuantityRecord(
                    name="GrossVolume", value=volume, unit="m3",
                    quantity_type=QuantityType.VOLUME,
                    source=QuantitySource.GEOMETRY_FALLBACK,
                ))

            else:
                volume = dx * dy * dz
                if volume > 0:
                    quantities.append(QuantityRecord(
                        name="GrossVolume", value=volume, unit="m3",
                        quantity_type=QuantityType.VOLUME,
                        source=QuantitySource.GEOMETRY_FALLBACK,
                    ))

        except Exception as exc:
            logger.debug("Geometry fallback failed for %s: %s", ifc_elem.id(), exc)

        return quantities

    def _compute_bounding_box(
        self, representation: ifcopenshell.entity_instance
    ) -> Optional[tuple[float, float, float]]:
        try:
            for rep in representation.Representations:
                if rep.RepresentationType == "BoundingBox":
                    for item in rep.Items:
                        if item.is_a("IfcBoundingBox"):
                            return (
                                float(item.XDim),
                                float(item.YDim),
                                float(item.ZDim),
                            )

            for rep in representation.Representations:
                for item in rep.Items:
                    if item.is_a("IfcExtrudedAreaSolid"):
                        depth = float(item.Depth)
                        profile = item.SweptArea
                        if profile.is_a("IfcRectangleProfileDef"):
                            return (
                                float(profile.XDim),
                                float(profile.YDim),
                                depth,
                            )
                        elif profile.is_a("IfcCircleProfileDef"):
                            d = float(profile.Radius) * 2
                            return (d, d, depth)
        except Exception:
            pass
        return None
