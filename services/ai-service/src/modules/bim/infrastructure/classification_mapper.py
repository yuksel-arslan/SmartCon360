"""Classification engine mapping IFC elements to Uniclass and OmniClass codes.

Matching priority:
1. Entity type + material (highest confidence)
2. Entity type only (medium confidence)
3. Unknown / unmapped (low confidence)

Loads classification data from a JSON mapping file.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Optional

from ..domain.models import Classification, ClassificationConfidence, Element

logger = logging.getLogger("bim.classification_mapper")


class ClassificationMapperError(Exception):
    """Raised when classification mapping fails."""


class ClassificationMapper:
    """Maps IFC elements to Uniclass and OmniClass codes."""

    def __init__(self, mapping_file: Optional[str | Path] = None) -> None:
        self._mapping: dict[str, dict[str, dict[str, str]]] = {}
        self._descriptions: dict[str, dict[str, str]] = {}

        if mapping_file is None:
            mapping_file = Path(__file__).parent.parent / "data" / "classification_mapping.json"

        self._mapping_file = Path(mapping_file)
        self._load_mapping()

    def _load_mapping(self) -> None:
        """Load classification mapping from JSON file."""
        if not self._mapping_file.exists():
            logger.warning(
                "Classification mapping file not found: %s. Using empty mapping.",
                self._mapping_file,
            )
            return

        try:
            with open(self._mapping_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            self._mapping = data.get("mappings", {})
            self._descriptions = data.get("descriptions", {})
            logger.info(
                "Loaded classification mapping: %d entity types",
                len(self._mapping),
            )
        except (json.JSONDecodeError, OSError) as exc:
            raise ClassificationMapperError(
                f"Failed to load classification mapping: {exc}"
            ) from exc

    def classify(self, element: Element) -> Classification:
        """Classify an element using Uniclass and OmniClass codes.

        Priority:
        1. Entity + material match → HIGH confidence
        2. Entity default → MEDIUM confidence
        3. Unknown → LOW confidence
        """
        ifc_class = element.ifc_class
        material = element.material

        # Normalize IFC class for parent matching (e.g. IfcWallStandardCase → IfcWall)
        ifc_classes_to_try = [ifc_class]
        if ifc_class == "IfcWallStandardCase":
            ifc_classes_to_try.append("IfcWall")

        for cls in ifc_classes_to_try:
            entity_map = self._mapping.get(cls)
            if entity_map is None:
                continue

            # 1. Try entity + material
            if material:
                material_key = self._find_material_key(entity_map, material)
                if material_key is not None:
                    codes = entity_map[material_key]
                    return self._build_classification(
                        codes,
                        ClassificationConfidence.HIGH,
                        "entity+material",
                    )

            # 2. Entity default
            if "default" in entity_map:
                codes = entity_map["default"]
                return self._build_classification(
                    codes,
                    ClassificationConfidence.MEDIUM,
                    "entity",
                )

        # 3. Unknown
        return Classification(
            uniclass_code="UNCLASSIFIED",
            uniclass_description="Unclassified element",
            omniclass_code="UNCLASSIFIED",
            omniclass_description="Unclassified element",
            confidence=ClassificationConfidence.LOW,
            match_method="unknown",
        )

    def _find_material_key(
        self, entity_map: dict[str, dict[str, str]], material: str
    ) -> Optional[str]:
        """Find the best matching material key in the entity mapping.

        Supports prefix matching: "material:Concrete" matches material "Concrete C30/37".
        """
        material_lower = material.lower()

        # Exact match first
        for key in entity_map:
            if key == "default":
                continue
            if key.startswith("material:"):
                mat_pattern = key[len("material:"):].lower()
                if material_lower == mat_pattern:
                    return key

        # Prefix / contains match
        for key in entity_map:
            if key == "default":
                continue
            if key.startswith("material:"):
                mat_pattern = key[len("material:"):].lower()
                if mat_pattern in material_lower or material_lower.startswith(mat_pattern):
                    return key

        return None

    def _build_classification(
        self,
        codes: dict[str, str],
        confidence: ClassificationConfidence,
        match_method: str,
    ) -> Classification:
        """Build a Classification object from mapping codes."""
        uniclass_code = codes.get("uniclass", "UNCLASSIFIED")
        omniclass_code = codes.get("omniclass", "UNCLASSIFIED")

        uniclass_desc = self._descriptions.get("uniclass", {}).get(
            uniclass_code, uniclass_code
        )
        omniclass_desc = self._descriptions.get("omniclass", {}).get(
            omniclass_code, omniclass_code
        )

        return Classification(
            uniclass_code=uniclass_code,
            uniclass_description=uniclass_desc,
            omniclass_code=omniclass_code,
            omniclass_description=omniclass_desc,
            confidence=confidence,
            match_method=match_method,
        )

    @property
    def supported_entity_types(self) -> list[str]:
        """Return the list of entity types with classification mappings."""
        return list(self._mapping.keys())
