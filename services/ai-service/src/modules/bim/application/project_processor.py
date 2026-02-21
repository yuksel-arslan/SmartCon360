"""Project processor — manages file uploads and QTO job lifecycle.

Handles:
- File upload and validation
- Job creation and tracking
- Asynchronous processing coordination
- Result storage and retrieval
"""

from __future__ import annotations

import logging
import shutil
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Optional

from .orchestrator import QTOOrchestrator, QTOOrchestratorError

logger = logging.getLogger("bim.project_processor")

DEFAULT_UPLOAD_DIR = Path("/tmp/smartcon360_bim_uploads")
MAX_FILE_SIZE_MB = 500


class JobStatus(str, Enum):
    """Processing job status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class ProcessingJob:
    """Tracks the state of a QTO processing job."""

    job_id: str
    project_id: Optional[str]
    file_name: str
    file_path: str
    status: JobStatus = JobStatus.PENDING
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    completed_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[dict] = None
    elements_processed: int = 0

    def to_dict(self) -> dict:
        return {
            "job_id": self.job_id,
            "project_id": self.project_id,
            "file_name": self.file_name,
            "status": self.status.value,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "error": self.error,
            "elements_processed": self.elements_processed,
        }


class ProjectProcessorError(Exception):
    """Raised when project processing fails."""


class ProjectProcessor:
    """Manages IFC file uploads and QTO processing jobs."""

    def __init__(
        self,
        upload_dir: Optional[str | Path] = None,
        classification_mapping_file: Optional[str | Path] = None,
    ) -> None:
        self._upload_dir = Path(upload_dir or DEFAULT_UPLOAD_DIR)
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        self._orchestrator = QTOOrchestrator(classification_mapping_file)
        self._jobs: dict[str, ProcessingJob] = {}

    def save_upload(
        self,
        file_content: bytes,
        file_name: str,
        project_id: Optional[str] = None,
    ) -> ProcessingJob:
        """Save an uploaded IFC file and create a processing job.

        Args:
            file_content: Raw bytes of the uploaded IFC file.
            file_name: Original file name.
            project_id: Optional project ID to associate with.

        Returns:
            A new ProcessingJob in PENDING status.

        Raises:
            ProjectProcessorError: If the upload is invalid.
        """
        if not file_name.lower().endswith(".ifc"):
            raise ProjectProcessorError(
                f"Invalid file type: {file_name}. Only .ifc files are accepted."
            )

        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise ProjectProcessorError(
                f"File too large: {file_size_mb:.1f} MB (max {MAX_FILE_SIZE_MB} MB)"
            )

        if len(file_content) == 0:
            raise ProjectProcessorError("Empty file uploaded")

        job_id = str(uuid.uuid4())
        safe_name = f"{job_id}_{file_name.replace(' ', '_')}"
        file_path = self._upload_dir / safe_name

        try:
            file_path.write_bytes(file_content)
        except OSError as exc:
            raise ProjectProcessorError(f"Failed to save file: {exc}") from exc

        job = ProcessingJob(
            job_id=job_id,
            project_id=project_id,
            file_name=file_name,
            file_path=str(file_path),
        )
        self._jobs[job_id] = job

        logger.info(
            "Upload saved: job=%s, file=%s, size=%.1f MB",
            job_id,
            file_name,
            file_size_mb,
        )
        return job

    def run_job(self, job_id: str) -> dict:
        """Execute the QTO pipeline for a pending job.

        Args:
            job_id: ID of the job to process.

        Returns:
            The QTO result dictionary.

        Raises:
            ProjectProcessorError: If the job is not found or already processed.
        """
        job = self._jobs.get(job_id)
        if job is None:
            raise ProjectProcessorError(f"Job not found: {job_id}")

        if job.status == JobStatus.COMPLETED:
            if job.result is not None:
                return job.result
            raise ProjectProcessorError(f"Job {job_id} completed but result was discarded")

        if job.status == JobStatus.PROCESSING:
            raise ProjectProcessorError(f"Job {job_id} is already processing")

        job.status = JobStatus.PROCESSING
        logger.info("Processing job: %s (%s)", job_id, job.file_name)

        try:
            result = self._orchestrator.process(
                ifc_file_path=job.file_path,
                project_id=job.project_id,
            )

            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.result = result
            job.elements_processed = result.get("elements_processed", 0)

            logger.info(
                "Job completed: %s — %d elements",
                job_id,
                job.elements_processed,
            )
            return result

        except QTOOrchestratorError as exc:
            job.status = JobStatus.FAILED
            job.error = str(exc)
            job.completed_at = datetime.now(timezone.utc).isoformat()
            logger.error("Job failed: %s — %s", job_id, exc)
            raise ProjectProcessorError(f"Processing failed: {exc}") from exc

        except Exception as exc:
            job.status = JobStatus.FAILED
            job.error = str(exc)
            job.completed_at = datetime.now(timezone.utc).isoformat()
            logger.error("Job failed unexpectedly: %s — %s", job_id, exc)
            raise ProjectProcessorError(f"Unexpected error: {exc}") from exc

    def get_job(self, job_id: str) -> Optional[ProcessingJob]:
        """Get a job by ID."""
        return self._jobs.get(job_id)

    def get_job_result(self, job_id: str) -> Optional[dict]:
        """Get the result of a completed job."""
        job = self._jobs.get(job_id)
        if job is None:
            return None
        return job.result

    def list_jobs(self) -> list[dict]:
        """List all jobs with their status."""
        return [job.to_dict() for job in self._jobs.values()]

    def cleanup_job(self, job_id: str) -> bool:
        """Remove a job and its uploaded file."""
        job = self._jobs.get(job_id)
        if job is None:
            return False

        try:
            file_path = Path(job.file_path)
            if file_path.exists():
                file_path.unlink()
        except OSError as exc:
            logger.warning("Failed to delete file for job %s: %s", job_id, exc)

        del self._jobs[job_id]
        return True

    def cleanup_all(self) -> int:
        """Remove all jobs and uploaded files. Returns count removed."""
        count = len(self._jobs)
        for job_id in list(self._jobs.keys()):
            self.cleanup_job(job_id)
        return count
