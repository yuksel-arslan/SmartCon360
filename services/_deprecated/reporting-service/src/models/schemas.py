"""TaktFlow AI — Reporting Service Pydantic Models"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ReportType(str, Enum):
    weekly_progress = "weekly_progress"
    executive_summary = "executive_summary"
    variance_analysis = "variance_analysis"
    custom = "custom"


class ReportFormat(str, Enum):
    html = "html"
    pdf = "pdf"
    json = "json"


class ReportStatus(str, Enum):
    generating = "generating"
    ready = "ready"
    failed = "failed"


# ── Request Models ──


class ReportRequest(BaseModel):
    """Request to generate a report."""

    project_id: str = Field(..., description="Project ID to generate report for")
    report_type: ReportType = Field(
        ..., description="Type of report to generate"
    )
    title: Optional[str] = Field(
        None, description="Custom report title; auto-generated if omitted"
    )
    date_range_start: Optional[date] = Field(
        None, description="Start of reporting period"
    )
    date_range_end: Optional[date] = Field(
        None, description="End of reporting period"
    )
    format: ReportFormat = Field(
        default=ReportFormat.html, description="Output format"
    )
    sections: Optional[list[str]] = Field(
        None,
        description="Custom section names (only for report_type='custom')",
    )
    project_data: Optional[dict] = Field(
        None,
        description=(
            "Project data payload including ppc_current, ppc_history, "
            "trades_status, constraints, activities, milestones, zones, "
            "financial, etc."
        ),
    )


# ── Response Models ──


class ReportSection(BaseModel):
    """A single section within a report."""

    title: str = Field(..., description="Section heading")
    content: str = Field(
        ..., description="Section body in markdown or HTML"
    )
    data: Optional[dict] = Field(
        None, description="Structured data for charts or tables"
    )


class ReportMetadata(BaseModel):
    """Report metadata without content."""

    id: str = Field(..., description="Unique report ID")
    project_id: str
    report_type: str
    title: str
    format: str
    created_at: datetime
    file_size_bytes: Optional[int] = None
    status: ReportStatus = ReportStatus.ready


class ReportContent(BaseModel):
    """Structured report content with sections."""

    metadata: ReportMetadata
    sections: list[ReportSection]
    summary: str = Field(..., description="Overall report summary")
    recommendations: list[str] = Field(
        default_factory=list,
        description="Actionable recommendations",
    )


class GeneratedReport(BaseModel):
    """Final generated report ready for delivery."""

    metadata: ReportMetadata
    content: str = Field(..., description="Full rendered HTML content")
    download_url: Optional[str] = Field(
        None, description="URL to download the report file"
    )
