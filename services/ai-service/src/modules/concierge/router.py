"""Concierge AI — conversational project assistant endpoint."""

import logging
import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger("ai-service.concierge")

router = APIRouter()


# ── Request / Response Models ──────────────────────────────

class AskRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    project_id: Optional[str] = None


class ConciergeData(BaseModel):
    response: str
    content: str
    sources: list[str]
    suggestions: list[str]
    confidence: float
    intent: str
    session_id: Optional[str] = None


class ConciergeResponse(BaseModel):
    data: ConciergeData
    error: None = None


# ── Intent Detection ───────────────────────────────────────

INTENTS = {
    "TAKT_QUERY": r"when|start|finish|schedule|takt|period|zone.*trade|trade.*zone",
    "WHAT_IF": r"what.?if|scenario|change.*to|move.*trade|add.*crew|what happens",
    "CONSTRAINT_CHECK": r"constraint|block|issue|problem|open.*issue|unresolved",
    "PPC_QUERY": r"ppc|percent.*complete|progress|behind|ahead|performance",
    "REPORT_GENERATE": r"report|generate.*report|summary|weekly.*report",
    "RESOURCE_QUERY": r"resource|crew|worker|equipment|labor|material",
    "PROJECT_STATUS": r"status|overview|how.*project|dashboard|health",
}


def detect_intent(message: str) -> str:
    lower = message.lower()
    for intent, pattern in INTENTS.items():
        if re.search(pattern, lower):
            return intent
    return "GENERAL_CHAT"


# ── Template Responses ─────────────────────────────────────

TEMPLATE_RESPONSES: dict[str, dict] = {
    "TAKT_QUERY": {
        "answer": (
            "**Schedule Overview:**\n\n"
            "- **Takt Time:** 5 business days per zone\n"
            "- **Current Period:** T7 (Week of March 23)\n"
            "- **Active Trades:** MEP Rough-in in Zones 3-4, Drywall in Zones 1-2\n"
            "- **Next Milestone:** MEP Finish starts Zone 1 on March 30\n\n"
            "**Key Points:**\n"
            "- Structure is complete through Zone 6\n"
            "- MEP Rough-in is on track (2 zones completed this week)\n"
            "- Buffer between Structure and MEP: 85% healthy\n\n"
            "Would you like details on a specific trade or zone?"
        ),
        "sources": ["takt-engine", "flowline-service"],
        "suggestions": ["Show flowline chart", "Check MEP schedule", "View zone status"],
        "confidence": 0.91,
    },
    "WHAT_IF": {
        "answer": (
            "**Simulation Results:**\n\n"
            "I can run these scenarios for you:\n\n"
            "1. **Add 2 crew to MEP** → Estimated 4-day recovery, +$8,500 cost\n"
            "2. **Extend takt to 6 days** → Adds 6 days total, reduces stacking risk by 40%\n"
            "3. **Add weekend shift** → Recovers 3 days, +$12,000 overtime cost\n\n"
            "**Recommendation:** Option 1 (Add crew) provides the best cost-to-recovery ratio.\n\n"
            "Shall I run a detailed simulation on any of these?"
        ),
        "sources": ["simulation-service"],
        "suggestions": ["Run detailed simulation", "Compare all scenarios", "Show cost breakdown"],
        "confidence": 0.87,
    },
    "CONSTRAINT_CHECK": {
        "answer": (
            "**Open Constraints: 5**\n\n"
            "**Critical (2):**\n"
            "1. Steel delivery for Zone 8 — no confirmed date (Material)\n"
            "2. MEP shop drawings revision — pending architect response (Design)\n\n"
            "**Medium (2):**\n"
            "3. Inspection approval for Zone 5 MEP — submitted, awaiting (Permit)\n"
            "4. Crane schedule conflict Tuesday AM (Equipment)\n\n"
            "**Low (1):**\n"
            "5. Staging area cleanup for Zone 3 (Space)\n\n"
            "**Constraint Removal Rate:** 78% (target: 85%)\n\n"
            "**Recommendation:** Escalate steel delivery — it impacts 3 downstream trades."
        ),
        "sources": ["constraint-service"],
        "suggestions": ["View constraint details", "Assign constraint owner", "Check schedule impact"],
        "confidence": 0.94,
    },
    "PPC_QUERY": {
        "answer": (
            "**PPC Analysis — Week 12:**\n\n"
            "**Current PPC: 93%** (target: 85%)\n"
            "- Committed: 28 tasks\n"
            "- Completed: 26 tasks\n"
            "- Failed: 2 tasks\n\n"
            "**Trend:** Improving — up from 62% in Week 1\n\n"
            "**Failed Tasks:**\n"
            "1. Paint Zone-4: Material not on site (Material)\n"
            "2. Drywall Zone-6: Crew shortage, 2 of 6 absent (Labor)\n\n"
            "**Top Variance Reason:** Material (40% of all failures)\n\n"
            "**Trade Performance:**\n"
            "- Best: Structure (100% PPC)\n"
            "- Worst: Painting (75% PPC)\n\n"
            "**Recommendation:** Pre-order paint materials 2 weeks ahead to prevent recurrence."
        ),
        "sources": ["progress-service"],
        "suggestions": ["View PPC trend chart", "Analyze variance by trade", "Generate weekly report"],
        "confidence": 0.95,
    },
    "REPORT_GENERATE": {
        "answer": (
            "**Report Generation**\n\n"
            "I can generate the following reports:\n\n"
            "1. **Weekly Progress Report** — PPC, trade status, constraints, lookahead\n"
            "2. **Executive Summary** — High-level project overview for stakeholders\n"
            "3. **Variance Analysis** — Root cause breakdown of plan deviations\n"
            "4. **Custom Report** — Select your own sections\n\n"
            "Each report is generated as a professional PDF/HTML document "
            "with AI-written narrative sections.\n\n"
            "Which report would you like me to generate?"
        ),
        "sources": ["reporting-service"],
        "suggestions": ["Generate weekly report", "Generate executive summary", "View past reports"],
        "confidence": 0.90,
    },
    "RESOURCE_QUERY": {
        "answer": (
            "**Resource Overview — Next Week:**\n\n"
            "**Crew Allocation:**\n"
            "- Structure: 8 workers (Zone 5-6)\n"
            "- MEP Rough-in: 12 workers (Zone 3-4)\n"
            "- Drywall: 6 workers (Zone 1-2)\n"
            "- Total on site: 26 workers\n\n"
            "**Equipment:**\n"
            "- Tower crane: Fully allocated Mon-Fri\n"
            "- Boom lift: Available Wed-Fri\n"
            "- Concrete pump: Not needed this week\n\n"
            "**Materials:**\n"
            "- Drywall sheets: Delivered, on site\n"
            "- MEP conduits: Delivery confirmed Thursday\n"
            "- Paint: Pending order confirmation\n\n"
            "**Alert:** Paint materials need to be ordered today for next week's schedule."
        ),
        "sources": ["resource-service"],
        "suggestions": ["View crew schedule", "Check material deliveries", "Equipment availability"],
        "confidence": 0.85,
    },
    "PROJECT_STATUS": {
        "answer": (
            "**Hotel Sapphire Istanbul — Project Status**\n\n"
            "**Overall Health Score: 87/100**\n\n"
            "**Key Metrics:**\n"
            "- Schedule: 92% on track (2 zones slightly behind)\n"
            "- PPC: 93% (12-week trend: improving)\n"
            "- Constraints: 5 open (2 critical)\n"
            "- Budget: 96% within plan\n\n"
            "**Progress:**\n"
            "- Phase 1 (Structure): 100% complete\n"
            "- Phase 2 (MEP Rough-in): 67% complete\n"
            "- Phase 3 (Finishing): 15% complete\n\n"
            "**Risks:**\n"
            "- Steel delivery delay could impact Zones 7-8\n"
            "- MEP subcontractor capacity concern for April\n\n"
            "**Next Milestone:** MEP Rough-in complete (April 10)"
        ),
        "sources": ["project-service", "progress-service", "constraint-service"],
        "suggestions": ["View detailed schedule", "Check risks", "Generate status report"],
        "confidence": 0.92,
    },
    "GENERAL_CHAT": {
        "answer": (
            "I'm the SmartCon360 AI Concierge — your intelligent construction project assistant.\n\n"
            "**I can help you with:**\n\n"
            "- **Schedule Questions** — \"When does MEP start in Zone C?\"\n"
            "- **What-If Scenarios** — \"What happens if we add 2 crew to drywall?\"\n"
            "- **Constraint Management** — \"What constraints are blocking next week?\"\n"
            "- **Progress Analysis** — \"Why did PPC drop this week?\"\n"
            "- **Report Generation** — \"Generate a weekly progress report\"\n"
            "- **Resource Planning** — \"How many workers do we need next week?\"\n\n"
            "**Tip:** Ask me anything about your project in plain language. "
            "I'll query the relevant services and give you a comprehensive answer.\n\n"
            "What would you like to know?"
        ),
        "sources": [],
        "suggestions": ["Project status overview", "Check open constraints", "View PPC trend", "What-if analysis"],
        "confidence": 1.0,
    },
}


# ── Endpoints ──────────────────────────────────────────────

@router.post("/ask", response_model=ConciergeResponse)
async def ask_concierge(req: AskRequest) -> ConciergeResponse:
    """Ask the AI concierge a question about the project."""
    intent = detect_intent(req.message)
    template = TEMPLATE_RESPONSES.get(intent, TEMPLATE_RESPONSES["GENERAL_CHAT"])

    logger.info("Concierge query | intent=%s | message=%s", intent, req.message[:80])

    answer = template["answer"]
    return ConciergeResponse(
        data=ConciergeData(
            response=answer,
            content=answer,
            sources=template["sources"],
            suggestions=template["suggestions"],
            confidence=template["confidence"],
            intent=intent,
            session_id=req.session_id,
        )
    )


@router.get("/health")
async def concierge_health():
    return {"status": "ok", "module": "concierge"}
