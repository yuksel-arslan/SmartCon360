"""TaktFlow AI — Reporting Service API Routes"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from ..core.generator import ReportGenerator
from ..models.schemas import (
    GeneratedReport,
    ReportMetadata,
    ReportRequest,
    ReportStatus,
)

logger = logging.getLogger("reporting-service")

router = APIRouter(prefix="/reports", tags=["reports"])

# ── In-memory store (Phase 2 — will be replaced with database) ──
_reports_store: dict[str, dict[str, Any]] = {}

# ── Shared generator instance ──
_generator = ReportGenerator()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _envelope(data: Any = None, error: str | None = None) -> dict:
    """Standard TaktFlow response envelope."""
    return {"data": data, "error": error}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/generate", response_model=None)
async def generate_report(request: ReportRequest) -> dict:
    """Generate a new report and return it immediately.

    The report is also stored in memory so it can be retrieved later via
    GET /reports/{report_id} or downloaded via GET /reports/{report_id}/download.
    """
    try:
        report: GeneratedReport = await _generator.generate_report(request)

        # Persist in memory
        _reports_store[report.metadata.id] = {
            "metadata": report.metadata.model_dump(),
            "content": report.content,
        }

        logger.info(
            "Report generated: id=%s type=%s project=%s size=%s",
            report.metadata.id,
            report.metadata.report_type,
            report.metadata.project_id,
            report.metadata.file_size_bytes,
        )

        return _envelope(data=report.model_dump())

    except Exception as exc:
        logger.exception("Report generation failed: %s", exc)

        # Return a failed report metadata so the caller knows what happened
        failed_meta = ReportMetadata(
            id="error",
            project_id=request.project_id,
            report_type=request.report_type.value,
            title=request.title or "Failed Report",
            format=request.format.value,
            created_at=datetime.utcnow(),
            status=ReportStatus.failed,
        )
        raise HTTPException(
            status_code=500,
            detail={
                "data": None,
                "error": f"Report generation failed: {str(exc)}",
                "metadata": failed_meta.model_dump(),
            },
        )


@router.get("/{report_id}", response_model=None)
async def get_report_metadata(report_id: str) -> dict:
    """Return metadata for a previously generated report."""
    entry = _reports_store.get(report_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Report not found")

    return _envelope(data=entry["metadata"])


@router.get("/{report_id}/download", response_model=None)
async def download_report(report_id: str) -> dict:
    """Return the full rendered HTML (or JSON) content of a report.

    In a production deployment this would stream a file; for Phase 2 the
    content is returned directly in the response body.
    """
    entry = _reports_store.get(report_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Report not found")

    from fastapi.responses import HTMLResponse, JSONResponse

    fmt = entry["metadata"].get("format", "html")
    content = entry["content"]

    if fmt == "json":
        import json

        try:
            parsed = json.loads(content)
            return JSONResponse(content=parsed)
        except (json.JSONDecodeError, TypeError):
            return JSONResponse(content={"raw": content})
    else:
        return HTMLResponse(content=content)


@router.get("/list/{project_id}", response_model=None)
async def list_project_reports(project_id: str) -> dict:
    """List all reports generated for a given project."""
    reports = [
        entry["metadata"]
        for entry in _reports_store.values()
        if entry["metadata"].get("project_id") == project_id
    ]

    # Sort by created_at descending
    reports.sort(key=lambda r: r.get("created_at", ""), reverse=True)

    return _envelope(data=reports)


@router.delete("/{report_id}", response_model=None)
async def delete_report(report_id: str) -> dict:
    """Delete a previously generated report from the store."""
    if report_id not in _reports_store:
        raise HTTPException(status_code=404, detail="Report not found")

    del _reports_store[report_id]
    logger.info("Report deleted: id=%s", report_id)

    return _envelope(data={"message": f"Report {report_id} deleted successfully"})
