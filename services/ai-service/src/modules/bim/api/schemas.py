"""Pydantic v2 schemas for the BIM QTO API."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class RunJobRequest(BaseModel):
    """Request to run a QTO job."""

    job_id: str = Field(..., description="ID of the uploaded job to process")
    project_id: Optional[str] = Field(
        None, description="Optional project ID to associate with results"
    )


class JobResponse(BaseModel):
    """Response after uploading an IFC file."""

    job_id: str = Field(..., description="Unique job identifier")
    file_name: str = Field(..., description="Original file name")
    status: str = Field(..., description="Job status: pending, processing, completed, failed")
    message: str = Field(..., description="Human-readable status message")


class JobStatusResponse(BaseModel):
    """Response for job status query."""

    job_id: str
    project_id: Optional[str] = None
    file_name: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None
    elements_processed: int = 0


class WBSItem(BaseModel):
    """A single WBS row in the flat output."""

    system: str = Field(..., description="WBS Level 1: System name")
    classification_code: str = Field(..., description="Uniclass classification code")
    storey: str = Field(..., description="Building storey name")
    quantity: float = Field(..., description="Aggregated quantity value")
    unit: str = Field(..., description="Quantity unit (m, m2, m3, kg, ea)")
    element_count: int = Field(0, description="Number of elements in this group")


class ProjectInfo(BaseModel):
    """IFC project metadata."""

    name: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None


class SummaryStats(BaseModel):
    """Summary statistics for the QTO run."""

    total_elements: int = 0
    elements_by_type: dict[str, int] = Field(default_factory=dict)
    elements_by_storey: dict[str, int] = Field(default_factory=dict)
    classified_elements: int = 0
    classification_rate: float = 0.0
    elements_with_quantities: int = 0
    quantity_coverage: float = 0.0


class QTOResultResponse(BaseModel):
    """Full QTO result response."""

    project_id: str = Field(..., description="Project identifier")
    source_file: str = Field(..., description="Source IFC file name")
    processed_at: str = Field(..., description="ISO timestamp of processing")
    project_info: ProjectInfo = Field(default_factory=ProjectInfo)
    summary: SummaryStats = Field(default_factory=SummaryStats)
    elements_processed: int = Field(0, description="Total elements processed")
    wbs: list[WBSItem] = Field(default_factory=list, description="Flat WBS rows")
    wbs_hierarchy: list[dict[str, Any]] = Field(
        default_factory=list, description="Hierarchical WBS tree"
    )
    processing_time_seconds: float = Field(0.0, description="Pipeline processing time")
    statistics: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    module: str = "bim-qto"
    version: str = "1.0.0"
    capabilities: list[str] = Field(default_factory=list)
