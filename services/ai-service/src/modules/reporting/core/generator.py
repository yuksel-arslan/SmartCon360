"""TaktFlow AI — Report Generator (Layer 1 + Layer 2)

Generates construction project reports using Jinja2 templates.
When a Gemini API key is available (Layer 2), AI-powered narrative
sections are produced.  Without the key the generator falls back to
structured, template-based data formatting (Layer 1).
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import markdown
from jinja2 import Environment, FileSystemLoader

from ..models.schemas import (
    GeneratedReport,
    ReportContent,
    ReportFormat,
    ReportMetadata,
    ReportRequest,
    ReportSection,
    ReportStatus,
    ReportType,
)

logger = logging.getLogger("reporting-service")

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"

# ── Optional Gemini import ──
_gemini_model = None


def _init_gemini() -> None:
    """Lazy-initialise the Gemini generative model if the API key exists."""
    global _gemini_model
    if _gemini_model is not None:
        return
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Gemini API initialised — Layer 2 AI narratives enabled")
    except Exception as exc:
        logger.warning("Failed to initialise Gemini: %s — falling back to Layer 1", exc)
        _gemini_model = None


def _has_gemini() -> bool:
    _init_gemini()
    return _gemini_model is not None


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _fmt_pct(value: float | int | None) -> str:
    """Format a percentage value for display."""
    if value is None:
        return "N/A"
    return f"{value:.1f}%"


def _fmt_date(value: str | None) -> str:
    """Format an ISO date string into a readable form."""
    if not value:
        return "N/A"
    try:
        dt = datetime.fromisoformat(value)
        return dt.strftime("%d %b %Y")
    except (ValueError, TypeError):
        return str(value)


def _safe_get(data: dict, *keys, default=None):
    """Safely traverse nested dicts."""
    current = data
    for k in keys:
        if isinstance(current, dict):
            current = current.get(k, default)
        else:
            return default
    return current


# ---------------------------------------------------------------------------
# ReportGenerator
# ---------------------------------------------------------------------------


class ReportGenerator:
    """Generates TaktFlow construction reports in HTML (and JSON).

    Layer 1: Template-based reports with structured data.
    Layer 2: AI-enhanced narrative when Gemini API key is present.
    """

    def __init__(self) -> None:
        self._jinja = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True,
        )

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def generate_report(self, request: ReportRequest) -> GeneratedReport:
        """Generate a complete report from a ReportRequest."""
        report_id = str(uuid.uuid4())
        project_data = request.project_data or {}

        # Determine title
        title = request.title or self._default_title(request.report_type)

        # Generate structured content based on report type
        report_content = await self._dispatch(request.report_type, project_data, request.sections)

        # Override metadata
        report_content.metadata = ReportMetadata(
            id=report_id,
            project_id=request.project_id,
            report_type=request.report_type.value,
            title=title,
            format=request.format.value,
            created_at=datetime.utcnow(),
            status=ReportStatus.ready,
        )

        # Render
        if request.format == ReportFormat.json:
            # Return the structured content as JSON — content field holds the
            # JSON-serialised ReportContent so callers can parse it.
            import json

            html_content = json.dumps(report_content.model_dump(), default=str, indent=2)
        else:
            html_content = self._render_html(
                title=title,
                project_id=request.project_id,
                date_range_start=request.date_range_start,
                date_range_end=request.date_range_end,
                sections=report_content.sections,
                summary=report_content.summary,
                recommendations=report_content.recommendations,
                report_type=request.report_type.value,
            )

        # Compute size
        report_content.metadata.file_size_bytes = len(html_content.encode("utf-8"))

        return GeneratedReport(
            metadata=report_content.metadata,
            content=html_content,
            download_url=None,
        )

    # ------------------------------------------------------------------
    # Dispatch by report type
    # ------------------------------------------------------------------

    async def _dispatch(
        self,
        report_type: ReportType,
        project_data: dict,
        custom_sections: Optional[list[str]],
    ) -> ReportContent:
        if report_type == ReportType.weekly_progress:
            return await self._generate_weekly_progress(project_data)
        elif report_type == ReportType.executive_summary:
            return await self._generate_executive_summary(project_data)
        elif report_type == ReportType.variance_analysis:
            return await self._generate_variance_analysis(project_data)
        elif report_type == ReportType.custom:
            return await self._generate_custom(project_data, custom_sections or [])
        else:
            return await self._generate_weekly_progress(project_data)

    # ------------------------------------------------------------------
    # Weekly Progress Report
    # ------------------------------------------------------------------

    async def _generate_weekly_progress(self, project_data: dict) -> ReportContent:
        sections: list[ReportSection] = []

        ppc_current = _safe_get(project_data, "ppc_current", default=0)
        ppc_history = _safe_get(project_data, "ppc_history", default=[])
        trades_status = _safe_get(project_data, "trades_status", default=[])
        constraints = _safe_get(project_data, "constraints", default=[])
        activities = _safe_get(project_data, "activities", default=[])

        # 1. Executive Summary
        exec_data = {
            "ppc_current": ppc_current,
            "total_trades": len(trades_status),
            "open_constraints": len([c for c in constraints if _safe_get(c, "status") != "resolved"]),
            "total_activities": len(activities),
            "completed_activities": len([a for a in activities if _safe_get(a, "status") == "completed"]),
        }
        exec_narrative = await self._ai_narrative(
            prompt=(
                "Write a concise executive summary paragraph for a weekly takt construction progress report. "
                "Mention PPC, trade count, open constraints, and activity progress."
            ),
            data=exec_data,
        )
        sections.append(ReportSection(
            title="Executive Summary",
            content=exec_narrative,
            data=exec_data,
        ))

        # 2. PPC Analysis
        ppc_trend_str = ", ".join([f"Week {i + 1}: {_fmt_pct(v)}" for i, v in enumerate(ppc_history[-8:])])
        ppc_content = (
            f"**Current PPC:** {_fmt_pct(ppc_current)}\n\n"
            f"**Recent Trend:** {ppc_trend_str or 'No historical data available.'}\n\n"
        )
        if ppc_current is not None:
            if ppc_current >= 80:
                ppc_content += "PPC is within the target range (>=80%). The project team is demonstrating strong plan reliability.\n"
            elif ppc_current >= 60:
                ppc_content += "PPC is below the 80% target. Root cause analysis of missed commitments is recommended.\n"
            else:
                ppc_content += "PPC is critically low. Immediate intervention is required to improve plan reliability.\n"
        sections.append(ReportSection(
            title="PPC Analysis",
            content=ppc_content,
            data={"ppc_current": ppc_current, "ppc_history": ppc_history},
        ))

        # 3. Trade Performance
        trade_rows: list[str] = []
        for trade in trades_status:
            name = _safe_get(trade, "name", default="Unknown")
            progress = _safe_get(trade, "progress_pct", default=0)
            status = _safe_get(trade, "status", default="unknown")
            zones_complete = _safe_get(trade, "zones_completed", default=0)
            zones_total = _safe_get(trade, "zones_total", default=0)
            trade_rows.append(
                f"| {name} | {_fmt_pct(progress)} | {status} | {zones_complete}/{zones_total} |"
            )
        trade_table = (
            "| Trade | Progress | Status | Zones |\n"
            "| --- | --- | --- | --- |\n"
            + ("\n".join(trade_rows) if trade_rows else "| No trade data available | - | - | - |")
        )
        sections.append(ReportSection(
            title="Trade Performance",
            content=trade_table,
            data={"trades": trades_status},
        ))

        # 4. Constraint Status
        open_constraints = [c for c in constraints if _safe_get(c, "status") != "resolved"]
        resolved_constraints = [c for c in constraints if _safe_get(c, "status") == "resolved"]
        constraint_rows: list[str] = []
        for c in open_constraints:
            category = _safe_get(c, "category", default="Unknown")
            desc = _safe_get(c, "description", default="No description")
            severity = _safe_get(c, "severity", default="medium")
            due = _fmt_date(_safe_get(c, "due_date"))
            constraint_rows.append(f"| {category} | {desc} | {severity} | {due} |")
        constraint_table = (
            f"**Open Constraints:** {len(open_constraints)}  |  "
            f"**Resolved This Period:** {len(resolved_constraints)}\n\n"
            "| Category | Description | Severity | Due Date |\n"
            "| --- | --- | --- | --- |\n"
            + ("\n".join(constraint_rows) if constraint_rows else "| No open constraints | - | - | - |")
        )
        sections.append(ReportSection(
            title="Constraint Status",
            content=constraint_table,
            data={
                "open_count": len(open_constraints),
                "resolved_count": len(resolved_constraints),
                "constraints": open_constraints,
            },
        ))

        # 5. Lookahead
        upcoming = [a for a in activities if _safe_get(a, "status") in ("planned", "ready")][:10]
        lookahead_rows: list[str] = []
        for a in upcoming:
            name = _safe_get(a, "name", default="Unknown")
            zone = _safe_get(a, "zone", default="N/A")
            trade = _safe_get(a, "trade", default="N/A")
            start = _fmt_date(_safe_get(a, "planned_start"))
            lookahead_rows.append(f"| {name} | {zone} | {trade} | {start} |")
        lookahead_table = (
            "| Activity | Zone | Trade | Planned Start |\n"
            "| --- | --- | --- | --- |\n"
            + ("\n".join(lookahead_rows) if lookahead_rows else "| No upcoming activities | - | - | - |")
        )
        sections.append(ReportSection(
            title="Lookahead (Next 6 Weeks)",
            content=lookahead_table,
            data={"upcoming_activities": upcoming},
        ))

        # 6. Recommendations
        recommendations = self._build_weekly_recommendations(ppc_current, open_constraints, trades_status)

        recs_content = "\n".join([f"- {r}" for r in recommendations]) if recommendations else "No specific recommendations at this time."
        sections.append(ReportSection(
            title="Recommendations",
            content=recs_content,
        ))

        summary = (
            f"Weekly progress report generated. Current PPC: {_fmt_pct(ppc_current)}. "
            f"{len(trades_status)} trades tracked, {len(open_constraints)} open constraints."
        )

        return ReportContent(
            metadata=ReportMetadata(
                id="", project_id="", report_type="weekly_progress",
                title="", format="html", created_at=datetime.utcnow(),
            ),
            sections=sections,
            summary=summary,
            recommendations=recommendations,
        )

    # ------------------------------------------------------------------
    # Executive Summary Report
    # ------------------------------------------------------------------

    async def _generate_executive_summary(self, project_data: dict) -> ReportContent:
        sections: list[ReportSection] = []

        project_name = _safe_get(project_data, "project_name", default="Project")
        overall_progress = _safe_get(project_data, "overall_progress_pct", default=0)
        ppc_current = _safe_get(project_data, "ppc_current", default=0)
        milestones = _safe_get(project_data, "milestones", default=[])
        constraints = _safe_get(project_data, "constraints", default=[])
        financial = _safe_get(project_data, "financial", default={})
        trades_status = _safe_get(project_data, "trades_status", default=[])

        # 1. Project Overview
        overview_data = {
            "project_name": project_name,
            "overall_progress": overall_progress,
            "ppc_current": ppc_current,
            "total_trades": len(trades_status),
        }
        overview_narrative = await self._ai_narrative(
            prompt=(
                "Write a 2-3 sentence project overview for an executive audience. "
                "Mention overall progress percentage, PPC, and number of active trades."
            ),
            data=overview_data,
        )
        sections.append(ReportSection(
            title="Project Overview",
            content=overview_narrative,
            data=overview_data,
        ))

        # 2. Key Metrics
        metrics_content = (
            f"| Metric | Value |\n"
            f"| --- | --- |\n"
            f"| Overall Progress | {_fmt_pct(overall_progress)} |\n"
            f"| PPC (Plan Reliability) | {_fmt_pct(ppc_current)} |\n"
            f"| Active Trades | {len(trades_status)} |\n"
            f"| Open Constraints | {len([c for c in constraints if _safe_get(c, 'status') != 'resolved'])} |\n"
            f"| Milestones Completed | {len([m for m in milestones if _safe_get(m, 'status') == 'completed'])}/{len(milestones)} |"
        )
        sections.append(ReportSection(
            title="Key Metrics",
            content=metrics_content,
            data={
                "overall_progress": overall_progress,
                "ppc_current": ppc_current,
                "trade_count": len(trades_status),
                "milestone_count": len(milestones),
            },
        ))

        # 3. Milestones
        milestone_rows: list[str] = []
        for m in milestones:
            name = _safe_get(m, "name", default="Unknown")
            target = _fmt_date(_safe_get(m, "target_date"))
            status = _safe_get(m, "status", default="pending")
            forecast = _fmt_date(_safe_get(m, "forecast_date"))
            milestone_rows.append(f"| {name} | {target} | {forecast} | {status} |")
        milestone_table = (
            "| Milestone | Target Date | Forecast | Status |\n"
            "| --- | --- | --- | --- |\n"
            + ("\n".join(milestone_rows) if milestone_rows else "| No milestones defined | - | - | - |")
        )
        sections.append(ReportSection(
            title="Milestones",
            content=milestone_table,
            data={"milestones": milestones},
        ))

        # 4. Risk Assessment
        open_constraints = [c for c in constraints if _safe_get(c, "status") != "resolved"]
        high_severity = [c for c in open_constraints if _safe_get(c, "severity") in ("high", "critical")]
        risk_data = {
            "total_open": len(open_constraints),
            "high_severity": len(high_severity),
        }
        risk_narrative = await self._ai_narrative(
            prompt=(
                "Write a brief risk assessment paragraph for a construction executive report. "
                "Mention the number of open constraints and high-severity items."
            ),
            data=risk_data,
        )
        sections.append(ReportSection(
            title="Risk Assessment",
            content=risk_narrative,
            data=risk_data,
        ))

        # 5. Financial Summary
        budget = _safe_get(financial, "budget", default=0)
        spent = _safe_get(financial, "spent", default=0)
        forecast_total = _safe_get(financial, "forecast_total", default=0)
        variance = budget - forecast_total if budget and forecast_total else 0
        financial_content = (
            f"| Item | Amount |\n"
            f"| --- | --- |\n"
            f"| Budget | ${budget:,.0f} |\n"
            f"| Spent to Date | ${spent:,.0f} |\n"
            f"| Forecast at Completion | ${forecast_total:,.0f} |\n"
            f"| Variance | ${variance:,.0f} |"
        ) if budget else "Financial data not provided."
        sections.append(ReportSection(
            title="Financial Summary",
            content=financial_content,
            data=financial if financial else None,
        ))

        recommendations = self._build_executive_recommendations(
            overall_progress, ppc_current, high_severity, milestones
        )
        summary = (
            f"Executive summary for {project_name}. "
            f"Overall progress: {_fmt_pct(overall_progress)}, PPC: {_fmt_pct(ppc_current)}."
        )

        return ReportContent(
            metadata=ReportMetadata(
                id="", project_id="", report_type="executive_summary",
                title="", format="html", created_at=datetime.utcnow(),
            ),
            sections=sections,
            summary=summary,
            recommendations=recommendations,
        )

    # ------------------------------------------------------------------
    # Variance Analysis Report
    # ------------------------------------------------------------------

    async def _generate_variance_analysis(self, project_data: dict) -> ReportContent:
        sections: list[ReportSection] = []

        trades_status = _safe_get(project_data, "trades_status", default=[])
        zones = _safe_get(project_data, "zones", default=[])
        variances = _safe_get(project_data, "variances", default=[])
        ppc_current = _safe_get(project_data, "ppc_current", default=0)
        ppc_history = _safe_get(project_data, "ppc_history", default=[])

        # 1. Variance Overview
        total_variances = len(variances)
        positive = [v for v in variances if _safe_get(v, "days", default=0) <= 0]
        negative = [v for v in variances if _safe_get(v, "days", default=0) > 0]
        overview_data = {
            "total_variances": total_variances,
            "on_or_ahead": len(positive),
            "behind_schedule": len(negative),
            "ppc_current": ppc_current,
        }
        overview_narrative = await self._ai_narrative(
            prompt=(
                "Write a variance overview paragraph for a construction report. "
                "Cover total variances found, how many are behind schedule vs on/ahead, and current PPC."
            ),
            data=overview_data,
        )
        sections.append(ReportSection(
            title="Variance Overview",
            content=overview_narrative,
            data=overview_data,
        ))

        # 2. Variance By Trade
        trade_rows: list[str] = []
        for trade in trades_status:
            name = _safe_get(trade, "name", default="Unknown")
            planned = _safe_get(trade, "planned_progress_pct", default=0)
            actual = _safe_get(trade, "progress_pct", default=0)
            delta = actual - planned if planned is not None and actual is not None else 0
            status = "On Track" if delta >= 0 else "Behind"
            trade_rows.append(
                f"| {name} | {_fmt_pct(planned)} | {_fmt_pct(actual)} | {delta:+.1f}% | {status} |"
            )
        trade_table = (
            "| Trade | Planned | Actual | Delta | Status |\n"
            "| --- | --- | --- | --- | --- |\n"
            + ("\n".join(trade_rows) if trade_rows else "| No trade data | - | - | - | - |")
        )
        sections.append(ReportSection(
            title="Variance By Trade",
            content=trade_table,
            data={"trades": trades_status},
        ))

        # 3. Variance By Zone
        zone_rows: list[str] = []
        for zone in zones:
            name = _safe_get(zone, "name", default="Unknown")
            planned = _safe_get(zone, "planned_progress_pct", default=0)
            actual = _safe_get(zone, "progress_pct", default=0)
            delta = actual - planned if planned is not None and actual is not None else 0
            zone_rows.append(
                f"| {name} | {_fmt_pct(planned)} | {_fmt_pct(actual)} | {delta:+.1f}% |"
            )
        zone_table = (
            "| Zone | Planned | Actual | Delta |\n"
            "| --- | --- | --- | --- |\n"
            + ("\n".join(zone_rows) if zone_rows else "| No zone data | - | - | - |")
        )
        sections.append(ReportSection(
            title="Variance By Zone",
            content=zone_table,
            data={"zones": zones},
        ))

        # 4. Root Causes
        root_causes: dict[str, int] = {}
        for v in variances:
            cause = _safe_get(v, "root_cause", default="Unclassified")
            root_causes[cause] = root_causes.get(cause, 0) + 1
        cause_rows = [f"| {cause} | {count} |" for cause, count in sorted(root_causes.items(), key=lambda x: -x[1])]
        cause_table = (
            "| Root Cause | Occurrences |\n"
            "| --- | --- |\n"
            + ("\n".join(cause_rows) if cause_rows else "| No root cause data | - |")
        )
        sections.append(ReportSection(
            title="Root Causes",
            content=cause_table,
            data={"root_causes": root_causes},
        ))

        # 5. Trend Analysis
        trend_content = ""
        if len(ppc_history) >= 2:
            recent = ppc_history[-4:]
            trend_direction = "improving" if recent[-1] > recent[0] else "declining" if recent[-1] < recent[0] else "stable"
            avg_ppc = sum(recent) / len(recent)
            trend_content = (
                f"**PPC Trend (last {len(recent)} periods):** {trend_direction}\n\n"
                f"**Average PPC:** {_fmt_pct(avg_ppc)}\n\n"
                f"**Values:** {', '.join([_fmt_pct(v) for v in recent])}\n\n"
            )
            if trend_direction == "declining":
                trend_content += "The declining PPC trend indicates systemic planning reliability issues that require immediate attention.\n"
            elif trend_direction == "improving":
                trend_content += "The improving PPC trend shows that corrective actions are having a positive effect.\n"
            else:
                trend_content += "PPC has remained stable. Consider targeted improvements to raise plan reliability.\n"
        else:
            trend_content = "Insufficient historical data to establish a PPC trend. At least 2 periods of data are needed.\n"
        sections.append(ReportSection(
            title="Trend Analysis",
            content=trend_content,
            data={"ppc_history": ppc_history},
        ))

        # 6. Recovery Recommendations
        recommendations = self._build_variance_recommendations(negative, root_causes, ppc_current)
        recs_content = "\n".join([f"- {r}" for r in recommendations]) if recommendations else "No specific recovery actions required at this time."
        sections.append(ReportSection(
            title="Recovery Recommendations",
            content=recs_content,
        ))

        summary = (
            f"Variance analysis complete. {len(negative)} activities behind schedule out of {total_variances} tracked. "
            f"Current PPC: {_fmt_pct(ppc_current)}."
        )

        return ReportContent(
            metadata=ReportMetadata(
                id="", project_id="", report_type="variance_analysis",
                title="", format="html", created_at=datetime.utcnow(),
            ),
            sections=sections,
            summary=summary,
            recommendations=recommendations,
        )

    # ------------------------------------------------------------------
    # Custom Report
    # ------------------------------------------------------------------

    async def _generate_custom(self, project_data: dict, custom_sections: list[str]) -> ReportContent:
        sections: list[ReportSection] = []

        if not custom_sections:
            custom_sections = ["Summary"]

        for section_name in custom_sections:
            section_data = _safe_get(project_data, section_name.lower().replace(" ", "_"), default={})
            if isinstance(section_data, dict) and section_data:
                content = self._format_dict_as_table(section_data)
            elif isinstance(section_data, list) and section_data:
                content = self._format_list_as_content(section_data)
            else:
                content_narrative = await self._ai_narrative(
                    prompt=f"Write a brief section about '{section_name}' for a construction project report.",
                    data=project_data,
                )
                content = content_narrative

            sections.append(ReportSection(
                title=section_name,
                content=content,
                data=section_data if isinstance(section_data, dict) else None,
            ))

        summary = f"Custom report with {len(sections)} section(s) generated."

        return ReportContent(
            metadata=ReportMetadata(
                id="", project_id="", report_type="custom",
                title="", format="html", created_at=datetime.utcnow(),
            ),
            sections=sections,
            summary=summary,
            recommendations=[],
        )

    # ------------------------------------------------------------------
    # AI Narrative (Layer 2) / Fallback (Layer 1)
    # ------------------------------------------------------------------

    async def _ai_narrative(self, prompt: str, data: dict) -> str:
        """Use Gemini to generate a narrative from structured data.

        Falls back to a formatted data summary when no API key is configured.
        """
        if _has_gemini():
            try:
                full_prompt = (
                    f"{prompt}\n\n"
                    f"Use the following project data to write the narrative. "
                    f"Be concise, professional, and use construction management terminology.\n\n"
                    f"Data:\n{self._format_data_for_prompt(data)}"
                )
                response = await _gemini_model.generate_content_async(full_prompt)
                return response.text.strip()
            except Exception as exc:
                logger.warning("Gemini API call failed: %s — falling back to template", exc)

        # Layer 1 fallback: structured data summary
        return self._template_narrative(data)

    def _template_narrative(self, data: dict) -> str:
        """Generate a plain-text narrative from structured data without AI."""
        if not data:
            return "No data available for this section."

        parts: list[str] = []
        for key, value in data.items():
            label = key.replace("_", " ").title()
            if isinstance(value, float):
                parts.append(f"**{label}:** {value:.1f}")
            elif isinstance(value, (int, str)):
                parts.append(f"**{label}:** {value}")
            elif isinstance(value, list):
                parts.append(f"**{label}:** {len(value)} item(s)")
            elif isinstance(value, dict):
                parts.append(f"**{label}:** {len(value)} entries")
        return "\n\n".join(parts) if parts else "No data available for this section."

    def _format_data_for_prompt(self, data: dict) -> str:
        """Format a dict as a readable string for inclusion in an LLM prompt."""
        lines: list[str] = []
        for key, value in data.items():
            label = key.replace("_", " ").title()
            if isinstance(value, (list, dict)):
                import json
                lines.append(f"- {label}: {json.dumps(value, default=str)}")
            else:
                lines.append(f"- {label}: {value}")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Recommendation builders
    # ------------------------------------------------------------------

    def _build_weekly_recommendations(
        self,
        ppc: float | int | None,
        open_constraints: list[dict],
        trades: list[dict],
    ) -> list[str]:
        recs: list[str] = []
        if ppc is not None and ppc < 80:
            recs.append(
                f"PPC is at {_fmt_pct(ppc)}, below the 80% target. "
                "Conduct a root cause analysis of incomplete commitments in the weekly planning meeting."
            )
        if ppc is not None and ppc < 60:
            recs.append(
                "PPC is critically low. Consider a constraint removal blitz and rebaseline the lookahead plan."
            )

        high_constraints = [c for c in open_constraints if _safe_get(c, "severity") in ("high", "critical")]
        if high_constraints:
            recs.append(
                f"{len(high_constraints)} high/critical constraint(s) require immediate attention. "
                "Escalate to project leadership for resolution."
            )

        behind_trades = [t for t in trades if _safe_get(t, "status") in ("behind", "delayed", "critical")]
        if behind_trades:
            names = ", ".join([_safe_get(t, "name", default="Unknown") for t in behind_trades[:3]])
            recs.append(
                f"Trades behind schedule: {names}. "
                "Review crew sizing and consider acceleration measures."
            )

        if not recs:
            recs.append("Project is performing within acceptable parameters. Continue current monitoring cadence.")

        return recs

    def _build_executive_recommendations(
        self,
        overall_progress: float | int,
        ppc: float | int | None,
        high_severity_constraints: list[dict],
        milestones: list[dict],
    ) -> list[str]:
        recs: list[str] = []

        if ppc is not None and ppc < 70:
            recs.append(
                f"Plan reliability (PPC: {_fmt_pct(ppc)}) is significantly below target. "
                "A structured improvement programme is recommended."
            )

        if high_severity_constraints:
            recs.append(
                f"{len(high_severity_constraints)} high-severity risk(s) identified. "
                "Senior leadership review required."
            )

        delayed_milestones = [
            m for m in milestones
            if _safe_get(m, "status") in ("delayed", "at_risk")
        ]
        if delayed_milestones:
            names = ", ".join([_safe_get(m, "name", default="Unknown") for m in delayed_milestones[:3]])
            recs.append(f"At-risk milestones: {names}. Recovery plans should be developed.")

        if not recs:
            recs.append("Project is on track. Maintain current management approach.")

        return recs

    def _build_variance_recommendations(
        self,
        behind_items: list[dict],
        root_causes: dict[str, int],
        ppc: float | int | None,
    ) -> list[str]:
        recs: list[str] = []

        if behind_items:
            recs.append(
                f"{len(behind_items)} activity/ies are behind schedule. "
                "Prioritise recovery actions for the most critical items."
            )

        if root_causes:
            top_cause = max(root_causes, key=root_causes.get)  # type: ignore[arg-type]
            recs.append(
                f"Most frequent root cause: '{top_cause}' ({root_causes[top_cause]} occurrences). "
                "Implement targeted countermeasures for this category."
            )

        if ppc is not None and ppc < 70:
            recs.append(
                "Low PPC combined with variances indicates systemic issues. "
                "Consider a full schedule health check and recovery workshop."
            )

        if not recs:
            recs.append("Variance levels are acceptable. Continue monitoring.")

        return recs

    # ------------------------------------------------------------------
    # HTML Rendering
    # ------------------------------------------------------------------

    def _render_html(
        self,
        title: str,
        project_id: str,
        date_range_start: Optional[object],
        date_range_end: Optional[object],
        sections: list[ReportSection],
        summary: str,
        recommendations: list[str],
        report_type: str,
    ) -> str:
        """Render the full HTML report using the Jinja2 base template."""
        md = markdown.Markdown(extensions=["tables", "fenced_code"])

        rendered_sections = []
        for section in sections:
            html_content = md.convert(section.content)
            md.reset()
            rendered_sections.append({
                "title": section.title,
                "content": html_content,
                "data": section.data,
            })

        template = self._jinja.get_template("base.html")
        return template.render(
            title=title,
            project_id=project_id,
            report_type=report_type.replace("_", " ").title(),
            generated_at=datetime.utcnow().strftime("%d %B %Y, %H:%M UTC"),
            date_range_start=str(date_range_start) if date_range_start else None,
            date_range_end=str(date_range_end) if date_range_end else None,
            sections=rendered_sections,
            summary=summary,
            recommendations=recommendations,
        )

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _default_title(report_type: ReportType) -> str:
        titles = {
            ReportType.weekly_progress: "Weekly Progress Report",
            ReportType.executive_summary: "Executive Summary Report",
            ReportType.variance_analysis: "Variance Analysis Report",
            ReportType.custom: "Custom Report",
        }
        return titles.get(report_type, "Report")

    @staticmethod
    def _format_dict_as_table(data: dict) -> str:
        rows = [f"| {k.replace('_', ' ').title()} | {v} |" for k, v in data.items()]
        return (
            "| Field | Value |\n"
            "| --- | --- |\n"
            + "\n".join(rows)
        )

    @staticmethod
    def _format_list_as_content(items: list) -> str:
        parts: list[str] = []
        for item in items:
            if isinstance(item, dict):
                label = _safe_get(item, "name") or _safe_get(item, "title") or str(item)
                parts.append(f"- {label}")
            else:
                parts.append(f"- {item}")
        return "\n".join(parts)
