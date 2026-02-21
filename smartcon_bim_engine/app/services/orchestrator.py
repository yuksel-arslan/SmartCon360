"""BIM Intelligence Engine Orchestrator.

Coordinates the full IFC processing pipeline:
1. Load IFC file
2. Extract elements
3. Build element graph
4. Extract quantities
5. Apply classification mapping
6. Build WBS
7. Build LBS
8. Generate takt zones
9. Bind cost items
10. Produce SmartCon360-compatible JSON output

All steps execute deterministically with no AI dependency.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..domain.project import BIMProject, ProjectStatus
from ..domain.element import BIMElement
from ..domain.cost import CurrencyCode
from .ifc_loader import IFCLoader, IFCLoaderError
from .element_graph_builder import ElementGraphBuilder
from .quantity_extractor import QuantityExtractor
from .classification_mapper import ClassificationMapper
from .wbs_builder import WBSBuilder
from .lbs_builder import LBSBuilder
from .zone_generator import ZoneGenerator
from .cost_binder import CostBinder

logger = logging.getLogger("bim_engine.orchestrator")


class BIMOrchestratorError(Exception):
    """Raised when the BIM processing pipeline fails."""


class BIMOrchestrator:
    """Orchestrates the full BIM Intelligence Engine pipeline.

    Takes an IFC file and produces SmartCon360-compatible output
    including elements, WBS, LBS, zones, and cost items.
    """

    def __init__(
        self,
        uniclass_file: Optional[str | Path] = None,
        omniclass_file: Optional[str | Path] = None,
        currency: CurrencyCode = CurrencyCode.USD,
    ) -> None:
        self._classification_mapper = ClassificationMapper(
            uniclass_file=uniclass_file,
            omniclass_file=omniclass_file,
        )
        self._wbs_builder = WBSBuilder()
        self._lbs_builder = LBSBuilder()
        self._zone_generator = ZoneGenerator()
        self._cost_binder = CostBinder(currency=currency)

    def process(
        self,
        ifc_file_path: str | Path,
        project_id: Optional[str] = None,
    ) -> dict:
        """Run the full BIM intelligence pipeline on an IFC file.

        Returns SmartCon360-compatible result dictionary.
        """
        start_time = time.monotonic()
        file_path = Path(ifc_file_path)

        project = BIMProject(
            project_id=project_id or file_path.stem,
            source_file=file_path.name,
        )

        logger.info("Starting BIM pipeline for: %s", file_path.name)

        try:
            project.mark_loading()
            loader = IFCLoader(file_path)
            loader.open()
        except IFCLoaderError as exc:
            project.mark_failed(str(exc))
            raise BIMOrchestratorError(f"IFC loading failed: {exc}") from exc

        project.metadata = loader.get_project_metadata()
        storeys = loader.get_storeys()
        spaces = loader.get_spaces()
        project.storeys = storeys
        project.spaces = spaces

        logger.info("Project: %s, Storeys: %d, Spaces: %d",
                     project.metadata.name or "unnamed",
                     len(storeys), len(spaces))

        project.mark_processing()

        elements = loader.extract_elements()
        if not elements:
            logger.warning("No extractable elements found in %s", file_path.name)
            project.mark_completed(0)
            return self._format_output(
                project=project,
                elements=[],
                wbs_tree=[], wbs_flat=[],
                lbs_tree=None, lbs_flat=[],
                zones=[],
                cost_items=[],
                relationships=[],
                processing_time=time.monotonic() - start_time,
            )

        logger.info("Extracted %d elements", len(elements))

        quantity_extractor = QuantityExtractor(loader.model)
        qty_count = quantity_extractor.extract_all(elements, loader)
        logger.info("Quantities extracted for %d elements", qty_count)

        cls_count = self._classification_mapper.classify_all(elements)
        logger.info("Classified %d elements (high/medium)", cls_count)

        graph_builder = ElementGraphBuilder(loader.model)
        relationships = graph_builder.build_graph(elements)
        logger.info("Built %d relationships", len(relationships))

        wbs_tree = self._wbs_builder.build(elements)
        wbs_flat = self._wbs_builder.build_flat(elements)

        site_name = project.metadata.name or "Site"
        lbs_tree = self._lbs_builder.build(
            elements, storeys, spaces,
            site_name=site_name,
        )
        lbs_flat = self._lbs_builder.build_flat(elements)

        zones = self._zone_generator.generate_storey_zones(elements, storeys)
        if spaces:
            space_zones = self._zone_generator.generate_space_zones(elements, storeys)
            zones.extend(space_zones)

        cost_items = self._cost_binder.generate_cost_items(elements)

        project.mark_completed(len(elements))

        elapsed = time.monotonic() - start_time
        logger.info(
            "BIM pipeline complete: %d elements, %d relationships, "
            "%d zones, %d cost items, %.2fs elapsed",
            len(elements), len(relationships),
            len(zones), len(cost_items), elapsed,
        )

        return self._format_output(
            project=project,
            elements=elements,
            wbs_tree=wbs_tree,
            wbs_flat=wbs_flat,
            lbs_tree=lbs_tree,
            lbs_flat=lbs_flat,
            zones=zones,
            cost_items=cost_items,
            relationships=relationships,
            processing_time=elapsed,
        )

    def _format_output(
        self,
        project: BIMProject,
        elements: list[BIMElement],
        wbs_tree: list,
        wbs_flat: list[dict],
        lbs_tree,
        lbs_flat: list[dict],
        zones: list,
        cost_items: list,
        relationships: list,
        processing_time: float,
    ) -> dict:
        """Format the pipeline output as SmartCon360-compatible JSON."""
        total_elements = len(elements)

        elements_by_type: dict[str, int] = {}
        elements_by_storey: dict[str, int] = {}
        classified_count = 0
        elements_with_qty = 0

        for elem in elements:
            ifc_class = elem.ifc_class
            elements_by_type[ifc_class] = elements_by_type.get(ifc_class, 0) + 1

            storey = elem.storey or "Unknown"
            elements_by_storey[storey] = elements_by_storey.get(storey, 0) + 1

            if elem.classification and elem.classification.confidence.value != "low":
                classified_count += 1
            if elem.quantities:
                elements_with_qty += 1

        classification_coverage = (
            (classified_count / total_elements * 100) if total_elements > 0 else 0.0
        )
        quantity_coverage = (
            (elements_with_qty / total_elements * 100) if total_elements > 0 else 0.0
        )

        return {
            "project_id": project.project_id,
            "source_file": project.source_file,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "project_info": project.metadata.to_dict(),
            "status": project.status.value,
            "summary": {
                "total_elements": total_elements,
                "elements_by_type": elements_by_type,
                "elements_by_storey": elements_by_storey,
                "classified_elements": classified_count,
                "classification_coverage_pct": round(classification_coverage, 2),
                "elements_with_quantities": elements_with_qty,
                "quantity_coverage_pct": round(quantity_coverage, 2),
                "total_relationships": len(relationships),
                "total_zones": len(zones),
                "total_cost_items": len(cost_items),
                "storeys": project.storeys,
                "spaces": project.spaces,
            },
            "elements": [e.to_dict() for e in elements],
            "wbs_hierarchy": [n.to_dict() for n in wbs_tree],
            "wbs_flat": wbs_flat,
            "lbs_hierarchy": lbs_tree.to_dict() if lbs_tree else None,
            "lbs_flat": lbs_flat,
            "zones": [z.to_dict() for z in zones],
            "cost_items": [c.to_dict() for c in cost_items],
            "relationships": [r.to_dict() for r in relationships],
            "processing_time_seconds": round(processing_time, 3),
        }
