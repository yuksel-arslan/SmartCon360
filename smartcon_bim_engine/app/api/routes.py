"""FastAPI routes for the BIM Intelligence Engine.

Endpoints:
- POST /api/v1/bim/upload    — Upload an IFC file
- POST /api/v1/bim/process   — Run the BIM intelligence pipeline
- GET  /api/v1/bim/{project_id} — Get processing results

API layer only orchestrates; no business logic here.
"""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from ..config import BIMEngineConfig
from ..schemas.api_schemas import (
    ErrorResponse,
    HealthResponse,
    ProcessRequest,
    ProcessResponse,
    UploadResponse,
)
from ..services.orchestrator import BIMOrchestrator, BIMOrchestratorError
from ..domain.cost import CurrencyCode

logger = logging.getLogger("bim_engine.api")

router = APIRouter()

_results_store: dict[str, dict] = {}
_file_store: dict[str, Path] = {}


def _get_orchestrator() -> BIMOrchestrator:
    """Create orchestrator with current config."""
    try:
        currency = CurrencyCode(BIMEngineConfig.CURRENCY)
    except ValueError:
        currency = CurrencyCode.USD

    return BIMOrchestrator(
        uniclass_file=BIMEngineConfig.UNICLASS_FILE,
        omniclass_file=BIMEngineConfig.OMNICLASS_FILE,
        currency=currency,
    )


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """BIM Intelligence Engine health check."""
    return HealthResponse(
        status="ok",
        service="smartcon-bim-engine",
        version="1.0.0",
        layer=1,
        capabilities=[
            "ifc_parsing",
            "element_graph",
            "quantity_extraction",
            "uniclass_classification",
            "omniclass_classification",
            "wbs_generation",
            "lbs_generation",
            "zone_generation",
            "cost_binding",
        ],
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_ifc(
    file: UploadFile = File(..., description="IFC file to process"),
    project_id: Optional[str] = Query(None, description="Custom project ID"),
) -> UploadResponse:
    """Upload an IFC file for BIM intelligence processing.

    Accepts .ifc files. Returns a project_id for subsequent processing.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="File name is required")

    if not file.filename.lower().endswith(".ifc"):
        raise HTTPException(status_code=400, detail="Only .ifc files are accepted")

    BIMEngineConfig.ensure_directories()

    pid = project_id or f"bim-{uuid.uuid4().hex[:12]}"
    upload_path = BIMEngineConfig.UPLOAD_DIR / f"{pid}.ifc"

    try:
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)

        if file_size_mb > BIMEngineConfig.MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {file_size_mb:.1f} MB (max {BIMEngineConfig.MAX_UPLOAD_SIZE_MB} MB)",
            )

        with open(upload_path, "wb") as f:
            f.write(content)

        _file_store[pid] = upload_path

        logger.info("File uploaded: %s → project %s (%.1f MB)", file.filename, pid, file_size_mb)

        return UploadResponse(
            project_id=pid,
            file_name=file.filename,
            file_size_mb=round(file_size_mb, 2),
            message=f"File '{file.filename}' uploaded. Use POST /api/v1/bim/process to run pipeline.",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Upload failed: {exc}") from exc


@router.post("/process", response_model=ProcessResponse)
async def process_ifc(request: ProcessRequest) -> dict:
    """Run the BIM intelligence pipeline on a previously uploaded IFC file.

    Returns the full result including elements, WBS, LBS, zones,
    cost items, relationships, and statistics.
    """
    pid = request.project_id
    file_path = _file_store.get(pid)

    if file_path is None or not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No uploaded file found for project_id: {pid}",
        )

    orchestrator = _get_orchestrator()

    try:
        result = orchestrator.process(
            ifc_file_path=file_path,
            project_id=pid,
        )
        _results_store[pid] = result
        return result
    except BIMOrchestratorError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Processing failed for %s: %s", pid, exc)
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}") from exc


@router.get("/{project_id}", response_model=ProcessResponse)
async def get_project_result(project_id: str) -> dict:
    """Get the BIM intelligence result for a processed project."""
    result = _results_store.get(project_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No results found for project_id: {project_id}",
        )
    return result
