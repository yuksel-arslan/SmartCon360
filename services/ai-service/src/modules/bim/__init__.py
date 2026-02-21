"""SmartCon360 BIM QTO Engine.

Production-grade IFC Quantity Takeoff and Classification engine.
Parses IFC files, extracts quantities, applies Uniclass/OmniClass
classifications, builds WBS hierarchy, and produces SmartCon360-
compatible JSON output.

Architecture:
  Layer 1 — Domain:         Element, Quantity, Classification, WBSNode
  Layer 2 — Infrastructure: IFCParser, QuantityExtractor, ClassificationMapper,
                            WBSBuilder, BOQFormatter
  Layer 3 — Application:    QTOOrchestrator, ProjectProcessor
  Layer 4 — API:            FastAPI router with upload/run/results endpoints
"""
