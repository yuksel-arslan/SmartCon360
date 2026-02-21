"""Classification Mapper service.

Maps IFC elements to Uniclass and OmniClass codes using
JSON mapping files.

Matching priority:
1. Entity type + material (highest confidence)
2. Entity type only (medium confidence)
3. Unknown / unmapped (low confidence)

Returns confidence score with each classification.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from ..domain.element import BIMElement
from ..domain.classification import ClassificationEntry, ClassificationConfidence

logger = logging.getLogger("bim_engine.classification_mapper")


class ClassificationMapperError(Exception):
    """Raised when classification mapping fails."""


class ClassificationMapper:
    """Maps IFC elements to Uniclass and OmniClass codes."""

    def __init__(
        self,
        uniclass_file: Optional[str | Path] = None,
        omniclass_file: Optional[str | Path] = None,
    ) -> None:
        self._uniclass_mapping: dict = {}
        self._omniclass_mapping: dict = {}
        self._uniclass_descriptions: dict[str, str] = {}
        self._omniclass_descriptions: dict[str, str] = {}

        mappings_dir = Path(__file__).parent.parent.parent / "mappings"

        if uniclass_file is None:
            uniclass_file = mappings_dir / "uniclass.json"
        if omniclass_file is None:
            omniclass_file = mappings_dir / "omniclass.json"

        self._load_uniclass(Path(uniclass_file))
        self._load_omniclass(Path(omniclass_file))

    def _load_uniclass(self, path: Path) -> None:
        if not path.exists():
            logger.warning("Uniclass mapping file not found: %s", path)
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._uniclass_mapping = data.get("mappings", {})
            self._uniclass_descriptions = data.get("descriptions", {})
            logger.info(
                "Loaded Uniclass mapping: %d entity types",
                len(self._uniclass_mapping),
            )
        except (json.JSONDecodeError, OSError) as exc:
            raise ClassificationMapperError(
                f"Failed to load Uniclass mapping: {exc}"
            ) from exc

    def _load_omniclass(self, path: Path) -> None:
        if not path.exists():
            logger.warning("OmniClass mapping file not found: %s", path)
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._omniclass_mapping = data.get("mappings", {})
            self._omniclass_descriptions = data.get("descriptions", {})
            logger.info(
                "Loaded OmniClass mapping: %d entity types",
                len(self._omniclass_mapping),
            )
        except (json.JSONDecodeError, OSError) as exc:
            raise ClassificationMapperError(
                f"Failed to load OmniClass mapping: {exc}"
            ) from exc

    def classify(self, element: BIMElement) -> ClassificationEntry:
        """Classify an element using Uniclass and OmniClass codes."""
        ifc_class = element.ifc_class
        material = element.primary_material

        ifc_classes_to_try = [ifc_class]
        if ifc_class == "IfcWallStandardCase":
            ifc_classes_to_try.append("IfcWall")

        uniclass_code = "UNCLASSIFIED"
        uniclass_desc = "Unclassified element"
        omniclass_code = "UNCLASSIFIED"
        omniclass_desc = "Unclassified element"
        confidence = ClassificationConfidence.LOW
        match_method = "unknown"

        for cls in ifc_classes_to_try:
            uni_map = self._uniclass_mapping.get(cls)
            if uni_map is not None:
                if material:
                    mat_key = self._find_material_key(uni_map, material)
                    if mat_key is not None:
                        uniclass_code = uni_map[mat_key].get("code", "UNCLASSIFIED")
                        uniclass_desc = self._uniclass_descriptions.get(
                            uniclass_code, uniclass_code
                        )
                        confidence = ClassificationConfidence.HIGH
                        match_method = "entity+material"
                        break

                if "default" in uni_map:
                    uniclass_code = uni_map["default"].get("code", "UNCLASSIFIED")
                    uniclass_desc = self._uniclass_descriptions.get(
                        uniclass_code, uniclass_code
                    )
                    if confidence == ClassificationConfidence.LOW:
                        confidence = ClassificationConfidence.MEDIUM
                        match_method = "entity"
                    break

        for cls in ifc_classes_to_try:
            omni_map = self._omniclass_mapping.get(cls)
            if omni_map is not None:
                if material:
                    mat_key = self._find_material_key(omni_map, material)
                    if mat_key is not None:
                        omniclass_code = omni_map[mat_key].get("code", "UNCLASSIFIED")
                        omniclass_desc = self._omniclass_descriptions.get(
                            omniclass_code, omniclass_code
                        )
                        if confidence == ClassificationConfidence.LOW:
                            confidence = ClassificationConfidence.HIGH
                            match_method = "entity+material"
                        break

                if "default" in omni_map:
                    omniclass_code = omni_map["default"].get("code", "UNCLASSIFIED")
                    omniclass_desc = self._omniclass_descriptions.get(
                        omniclass_code, omniclass_code
                    )
                    if confidence == ClassificationConfidence.LOW:
                        confidence = ClassificationConfidence.MEDIUM
                        match_method = "entity"
                    break

        return ClassificationEntry(
            uniclass_code=uniclass_code,
            uniclass_description=uniclass_desc,
            omniclass_code=omniclass_code,
            omniclass_description=omniclass_desc,
            confidence=confidence,
            match_method=match_method,
        )

    def classify_all(self, elements: list[BIMElement]) -> int:
        """Classify all elements. Returns count with high/medium confidence."""
        classified_count = 0
        for elem in elements:
            try:
                elem.classification = self.classify(elem)
                if elem.classification.confidence != ClassificationConfidence.LOW:
                    classified_count += 1
            except Exception as exc:
                logger.warning(
                    "Classification failed for %s: %s",
                    elem.global_id, exc,
                )
        logger.info(
            "Classified: %d / %d elements (high/medium confidence)",
            classified_count, len(elements),
        )
        return classified_count

    def _find_material_key(
        self, entity_map: dict, material: str
    ) -> Optional[str]:
        material_lower = material.lower()

        for key in entity_map:
            if key == "default":
                continue
            if key.startswith("material:"):
                mat_pattern = key[len("material:"):].lower()
                if material_lower == mat_pattern:
                    return key

        for key in entity_map:
            if key == "default":
                continue
            if key.startswith("material:"):
                mat_pattern = key[len("material:"):].lower()
                if mat_pattern in material_lower or material_lower.startswith(mat_pattern):
                    return key

        return None

    @property
    def supported_entity_types(self) -> list[str]:
        all_types = set(self._uniclass_mapping.keys()) | set(self._omniclass_mapping.keys())
        return sorted(all_types)
