"""QTO Orchestrator — coordinates the full IFC → QTO pipeline.

Pipeline steps:
1. Parse IFC file
2. Extract elements
3. Extract quantities for each element
4. Classify each element
5. Build WBS hierarchy
6. Format BOQ output
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Optional

from ..domain.models import Element
from ..infrastructure.boq_formatter import BOQFormatter
from ..infrastructure.classification_mapper import ClassificationMapper
from ..infrastructure.ifc_parser import IFCParser, IFCParserError
from ..infrastructure.quantity_extractor import QuantityExtractor
from ..infrastructure.wbs_builder import WBSBuilder

logger = logging.getLogger("bim.orchestrator")


class QTOOrchestratorError(Exception):
    """Raised when the QTO pipeline fails."""


class QTOOrchestrator:
    """Orchestrates the full IFC quantity takeoff pipeline.

    Takes an IFC file path and produces a SmartCon360-compatible
    QTO result dictionary.
    """

    def __init__(
        self,
        classification_mapping_file: Optional[str | Path] = None,
    ) -> None:
        self._classification_mapper = ClassificationMapper(classification_mapping_file)
        self._wbs_builder = WBSBuilder()
        self._boq_formatter = BOQFormatter()

    def process(
        self,
        ifc_file_path: str | Path,
        project_id: Optional[str] = None,
    ) -> dict:
        """Run the full QTO pipeline on an IFC file.

        Args:
            ifc_file_path: Path to the IFC file.
            project_id: Optional project ID for the output.

        Returns:
            SmartCon360-compatible QTO result dictionary.

        Raises:
            QTOOrchestratorError: If the pipeline fails.
        """
        start_time = time.monotonic()
        file_path = Path(ifc_file_path)

        logger.info("Starting QTO pipeline for: %s", file_path.name)

        # 1. Parse IFC
        try:
            parser = IFCParser(file_path)
            parser.open()
        except IFCParserError as exc:
            raise QTOOrchestratorError(f"IFC parsing failed: {exc}") from exc

        project_info = parser.get_project_info()
        logger.info("Project info: %s", project_info)

        # 2. Extract elements
        elements = parser.extract_elements()
        if not elements:
            logger.warning("No extractable elements found in %s", file_path.name)
            return self._boq_formatter.format(
                project_id=project_id,
                project_info=project_info,
                elements=[],
                wbs_tree=[],
                wbs_flat=[],
                source_file=file_path.name,
            )

        logger.info("Extracted %d elements", len(elements))

        # 3. Extract quantities
        quantity_extractor = QuantityExtractor(parser.model)
        elements_with_qty = self._extract_all_quantities(
            elements, quantity_extractor, parser
        )

        # 4. Classify elements
        self._classify_all_elements(elements_with_qty)

        # 5. Build WBS
        wbs_tree = self._wbs_builder.build(elements_with_qty)
        wbs_flat = self._wbs_builder.build_flat(elements_with_qty)

        # 6. Format output
        result = self._boq_formatter.format(
            project_id=project_id,
            project_info=project_info,
            elements=elements_with_qty,
            wbs_tree=wbs_tree,
            wbs_flat=wbs_flat,
            source_file=file_path.name,
        )

        elapsed = time.monotonic() - start_time
        logger.info(
            "QTO pipeline complete: %d elements, %.2fs elapsed",
            len(elements_with_qty),
            elapsed,
        )
        result["processing_time_seconds"] = round(elapsed, 3)

        return result

    def _extract_all_quantities(
        self,
        elements: list[Element],
        extractor: QuantityExtractor,
        parser: IFCParser,
    ) -> list[Element]:
        """Extract quantities for all elements, resolving IFC entities."""
        model = parser.model
        ifc_entities: dict[str, object] = {}

        # Build GlobalId → IFC entity lookup
        for ifc_type in ("IfcBuildingElement", "IfcSpace",
                         "IfcDistributionElement", "IfcFlowTerminal",
                         "IfcFlowSegment", "IfcFlowFitting"):
            try:
                for entity in model.by_type(ifc_type):
                    gid = getattr(entity, "GlobalId", None)
                    if gid:
                        ifc_entities[gid] = entity
            except RuntimeError:
                continue

        extracted_count = 0
        for elem in elements:
            ifc_entity = ifc_entities.get(elem.global_id)
            if ifc_entity is None:
                # Fallback: search by ID
                try:
                    for entity in model.by_type(elem.ifc_class):
                        if getattr(entity, "GlobalId", None) == elem.global_id:
                            ifc_entity = entity
                            break
                except RuntimeError:
                    continue

            if ifc_entity is not None:
                try:
                    quantities = extractor.extract_quantities(elem, ifc_entity)
                    elem.quantities = quantities
                    if quantities:
                        extracted_count += 1
                except Exception as exc:
                    logger.warning(
                        "Quantity extraction failed for %s: %s",
                        elem.global_id,
                        exc,
                    )

        logger.info(
            "Quantities extracted: %d / %d elements",
            extracted_count,
            len(elements),
        )
        return elements

    def _classify_all_elements(self, elements: list[Element]) -> None:
        """Classify all elements using the classification mapper."""
        classified_count = 0
        for elem in elements:
            try:
                elem.classification = self._classification_mapper.classify(elem)
                if elem.classification.confidence.value != "low":
                    classified_count += 1
            except Exception as exc:
                logger.warning(
                    "Classification failed for %s: %s",
                    elem.global_id,
                    exc,
                )

        logger.info(
            "Classified: %d / %d elements (high/medium confidence)",
            classified_count,
            len(elements),
        )
