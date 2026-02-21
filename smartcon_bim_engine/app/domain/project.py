"""Project domain model.

Represents a BIM project context including metadata extracted from IFC
and runtime processing state.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from datetime import datetime, timezone


class ProjectStatus(str, Enum):
    """Processing status of a BIM project."""

    PENDING = "pending"
    LOADING = "loading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class ProjectMetadata:
    """Metadata extracted from the IFC project entity."""

    name: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    author: Optional[str] = None
    organization: Optional[str] = None
    schema_version: Optional[str] = None
    application: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "phase": self.phase,
            "author": self.author,
            "organization": self.organization,
            "schema_version": self.schema_version,
            "application": self.application,
        }


@dataclass(slots=True)
class BIMProject:
    """Root aggregate for a BIM intelligence processing session.

    Holds references to all extracted data and processing results.
    """

    project_id: str
    source_file: str
    metadata: ProjectMetadata = field(default_factory=ProjectMetadata)
    status: ProjectStatus = ProjectStatus.PENDING
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    element_count: int = 0
    storeys: list[str] = field(default_factory=list)
    spaces: list[str] = field(default_factory=list)

    def mark_loading(self) -> None:
        self.status = ProjectStatus.LOADING

    def mark_processing(self) -> None:
        self.status = ProjectStatus.PROCESSING

    def mark_completed(self, element_count: int) -> None:
        self.status = ProjectStatus.COMPLETED
        self.element_count = element_count
        self.completed_at = datetime.now(timezone.utc).isoformat()

    def mark_failed(self, error: str) -> None:
        self.status = ProjectStatus.FAILED
        self.error_message = error
        self.completed_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "project_id": self.project_id,
            "source_file": self.source_file,
            "metadata": self.metadata.to_dict(),
            "status": self.status.value,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "error_message": self.error_message,
            "element_count": self.element_count,
            "storeys": self.storeys,
            "spaces": self.spaces,
        }
