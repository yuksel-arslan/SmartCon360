"""Pydantic v2 schemas for the BIM Intelligence Engine API."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    service: str = "smartcon-bim-engine"
    version: str = "1.0.0"
    layer: int = 1
    capabilities: list[str] = Field(default_factory=list)


class UploadResponse(BaseModel):
    """Response after uploading an IFC file."""

    project_id: str = Field(..., description="Generated project identifier")
    file_name: str = Field(..., description="Original file name")
    file_size_mb: float = Field(..., description="File size in MB")
    message: str = Field(..., description="Human-readable status message")


class ProcessRequest(BaseModel):
    """Request to process a previously uploaded IFC file."""

    project_id: str = Field(..., description="Project ID from upload step")


class ProjectInfo(BaseModel):
    """IFC project metadata."""

    name: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    author: Optional[str] = None
    organization: Optional[str] = None
    schema_version: Optional[str] = None
    application: Optional[str] = None


class SummaryStats(BaseModel):
    """Summary statistics for the processing run."""

    total_elements: int = 0
    elements_by_type: dict[str, int] = Field(default_factory=dict)
    elements_by_storey: dict[str, int] = Field(default_factory=dict)
    classified_elements: int = 0
    classification_coverage_pct: float = 0.0
    elements_with_quantities: int = 0
    quantity_coverage_pct: float = 0.0
    total_relationships: int = 0
    total_zones: int = 0
    total_cost_items: int = 0
    storeys: list[str] = Field(default_factory=list)
    spaces: list[str] = Field(default_factory=list)


class ProcessResponse(BaseModel):
    """Full BIM processing result response."""

    project_id: str = Field(..., description="Project identifier")
    source_file: str = Field(..., description="Source IFC file name")
    processed_at: str = Field(..., description="ISO timestamp of processing")
    project_info: ProjectInfo = Field(default_factory=ProjectInfo)
    status: str = Field(..., description="Processing status")
    summary: SummaryStats = Field(default_factory=SummaryStats)
    elements: list[dict[str, Any]] = Field(default_factory=list)
    wbs_hierarchy: list[dict[str, Any]] = Field(default_factory=list)
    wbs_flat: list[dict[str, Any]] = Field(default_factory=list)
    lbs_hierarchy: Optional[dict[str, Any]] = None
    lbs_flat: list[dict[str, Any]] = Field(default_factory=list)
    zones: list[dict[str, Any]] = Field(default_factory=list)
    cost_items: list[dict[str, Any]] = Field(default_factory=list)
    relationships: list[dict[str, Any]] = Field(default_factory=list)
    processing_time_seconds: float = Field(0.0, description="Pipeline processing time")


class ProjectSummary(BaseModel):
    """Lightweight project summary for listing."""

    project_id: str
    source_file: str
    status: str
    element_count: int = 0
    created_at: str = ""


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")
    details: Optional[dict[str, Any]] = None
