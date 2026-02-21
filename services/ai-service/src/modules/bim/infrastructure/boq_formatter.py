"""BOQ (Bill of Quantities) formatter.

Formats extracted and classified element data into the SmartCon360
output JSON structure, including project summary, element details,
WBS hierarchy, and flat WBS for downstream consumption.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from ..domain.models import (
    ClassificationConfidence,
    Element,
    QuantitySource,
    WBSNode,
)

logger = logging.getLogger("bim.boq_formatter")


class BOQFormatterError(Exception):
    """Raised when BOQ formatting fails."""


class BOQFormatter:
    """Formats QTO results into SmartCon360-compatible JSON output."""

    def format(
        self,
        project_id: Optional[str],
        project_info: dict[str, Optional[str]],
        elements: list[Element],
        wbs_tree: list[WBSNode],
        wbs_flat: list[dict],
        source_file: str,
    ) -> dict:
        """Produce the final SmartCon360 QTO output.

        Args:
            project_id: External project ID (or auto-generated UUID).
            project_info: IFC project metadata (name, description, phase).
            elements: List of processed Element objects.
            wbs_tree: Hierarchical WBS nodes.
            wbs_flat: Flat WBS rows for the output format.
            source_file: Name of the source IFC file.

        Returns:
            Complete QTO result dictionary.
        """
        pid = project_id or str(uuid4())

        return {
            "project_id": pid,
            "source_file": source_file,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "project_info": project_info,
            "summary": self._build_summary(elements),
            "elements_processed": len(elements),
            "wbs": wbs_flat,
            "wbs_hierarchy": [node.to_dict() for node in wbs_tree],
            "elements": [elem.to_dict() for elem in elements],
            "statistics": self._build_statistics(elements),
        }

    def _build_summary(self, elements: list[Element]) -> dict:
        """Build a summary of element counts by type."""
        by_type: dict[str, int] = defaultdict(int)
        by_system: dict[str, int] = defaultdict(int)
        by_storey: dict[str, int] = defaultdict(int)
        classified_count = 0
        with_quantities = 0

        for elem in elements:
            by_type[elem.ifc_class] += 1
            storey = elem.storey or "Unknown"
            by_storey[storey] += 1

            if elem.classification and elem.classification.confidence != ClassificationConfidence.LOW:
                classified_count += 1

            if elem.quantities:
                with_quantities += 1

        return {
            "total_elements": len(elements),
            "elements_by_type": dict(sorted(by_type.items())),
            "elements_by_storey": dict(sorted(by_storey.items())),
            "classified_elements": classified_count,
            "classification_rate": round(
                classified_count / len(elements) * 100, 1
            ) if elements else 0.0,
            "elements_with_quantities": with_quantities,
            "quantity_coverage": round(
                with_quantities / len(elements) * 100, 1
            ) if elements else 0.0,
        }

    def _build_statistics(self, elements: list[Element]) -> dict:
        """Build detailed statistics about extraction quality."""
        source_counts: dict[str, int] = defaultdict(int)
        confidence_counts: dict[str, int] = defaultdict(int)
        material_count = 0
        storey_count = 0

        for elem in elements:
            if elem.material:
                material_count += 1
            if elem.storey:
                storey_count += 1
            if elem.classification:
                confidence_counts[elem.classification.confidence.value] += 1
            for q in elem.quantities:
                source_counts[q.source.value] += 1

        unique_materials = len({
            elem.material for elem in elements if elem.material
        })
        unique_storeys = len({
            elem.storey for elem in elements if elem.storey
        })
        unique_classifications = len({
            elem.classification.uniclass_code
            for elem in elements
            if elem.classification
        })

        return {
            "quantity_sources": dict(source_counts),
            "classification_confidence": dict(confidence_counts),
            "material_coverage": round(
                material_count / len(elements) * 100, 1
            ) if elements else 0.0,
            "storey_coverage": round(
                storey_count / len(elements) * 100, 1
            ) if elements else 0.0,
            "unique_materials": unique_materials,
            "unique_storeys": unique_storeys,
            "unique_classifications": unique_classifications,
        }
