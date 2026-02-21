"""FastAPI router for the BIM QTO engine.

Endpoints:
- POST   /upload          — Upload an IFC file
- POST   /run             — Run QTO pipeline on an uploaded file
- GET    /jobs            — List all jobs
- GET    /jobs/{job_id}   — Get job status
- GET    /results/{job_id} — Get QTO results for a completed job
- DELETE /jobs/{job_id}   — Delete a job and its files
- GET    /health          — Module health check
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from ..application.project_processor import ProjectProcessor, ProjectProcessorError
from .schemas import (
    HealthResponse,
    JobResponse,
    JobStatusResponse,
    QTOResultResponse,
    RunJobRequest,
)

logger = logging.getLogger("bim.api")

router = APIRouter()

# Singleton processor — shared across requests
_processor: Optional[ProjectProcessor] = None


def _get_processor() -> ProjectProcessor:
    """Get or create the singleton ProjectProcessor."""
    global _processor
    if _processor is None:
        _processor = ProjectProcessor()
    return _processor


@router.get("/health", response_model=HealthResponse)
async def bim_health() -> HealthResponse:
    """BIM QTO engine health check."""
    return HealthResponse(
        status="ok",
        module="bim-qto",
        version="1.0.0",
        capabilities=[
            "ifc_parsing",
            "quantity_extraction",
            "uniclass_classification",
            "omniclass_classification",
            "wbs_aggregation",
            "boq_formatting",
        ],
    )


@router.post("/upload", response_model=JobResponse)
async def upload_ifc(
    file: UploadFile = File(..., description="IFC file to process"),
    project_id: Optional[str] = Query(None, description="Project ID to associate with"),
) -> JobResponse:
    """Upload an IFC file for QTO processing.

    Accepts .ifc files up to 500 MB. Returns a job ID for tracking.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="File name is required")

    processor = _get_processor()

    try:
        content = await file.read()
        job = processor.save_upload(
            file_content=content,
            file_name=file.filename,
            project_id=project_id,
        )

        logger.info("File uploaded: %s → job %s", file.filename, job.job_id)

        return JobResponse(
            job_id=job.job_id,
            file_name=job.file_name,
            status=job.status.value,
            message=f"File '{file.filename}' uploaded. Use POST /run with job_id to process.",
        )
    except ProjectProcessorError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/run", response_model=QTOResultResponse)
async def run_qto(request: RunJobRequest) -> dict:
    """Run the QTO pipeline on a previously uploaded IFC file.

    Returns the full QTO result including WBS, elements, and statistics.
    """
    processor = _get_processor()

    job = processor.get_job(request.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {request.job_id}")

    # Update project_id if provided in run request
    if request.project_id:
        job.project_id = request.project_id

    try:
        result = processor.run_job(request.job_id)
        return result
    except ProjectProcessorError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/jobs", response_model=list[JobStatusResponse])
async def list_jobs() -> list[dict]:
    """List all QTO processing jobs."""
    processor = _get_processor()
    return processor.list_jobs()


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str) -> dict:
    """Get the status of a specific QTO job."""
    processor = _get_processor()
    job = processor.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job.to_dict()


@router.get("/results/{job_id}", response_model=QTOResultResponse)
async def get_job_result(job_id: str) -> dict:
    """Get the QTO result for a completed job."""
    processor = _get_processor()

    job = processor.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    if job.status.value != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Job is not completed (status: {job.status.value})",
        )

    result = processor.get_job_result(job_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not available")

    return result


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str) -> dict:
    """Delete a job and its uploaded file."""
    processor = _get_processor()

    if not processor.cleanup_job(job_id):
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

    return {"message": f"Job {job_id} deleted", "status": "ok"}
