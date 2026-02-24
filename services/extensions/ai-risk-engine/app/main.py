"""
SmartCon360 — AI Risk Engine Service

Rule-based proactive risk detection and early warning system.
Stage 1: Deterministic, transparent, configurable rules.
AI ONLY RECOMMENDS — NEVER makes direct plan changes.

Port: 8010
Layer: Extension (Intelligence Layer)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as risk_router

app = FastAPI(
    title="SmartCon360 AI Risk Engine",
    description=(
        "Proactive risk detection and early warning system. "
        "Stage 1: Rule-based engine with transparent scoring. "
        "All outputs are recommendations — human approval required."
    ),
    version="1.0.0",
    docs_url="/risk-engine/docs",
    openapi_url="/risk-engine/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(risk_router)


@app.get("/health")
async def root_health() -> dict:
    return {
        "status": "ok",
        "service": "ai-risk-engine",
        "version": "1.0.0",
        "engine_stage": "rule_based_v1",
    }
