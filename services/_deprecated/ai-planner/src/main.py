"""TaktFlow AI — AI Planner Service (Port 8002)

Layer 2 microservice providing AI-enhanced plan generation, optimization,
delay prediction, and project health scoring. Uses Google Gemini API via
LangChain when available; falls back to deterministic algorithmic planning
(Layer 1) when no API key is configured.

Start locally:
    uvicorn src.main:app --reload --port 8002
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as ai_router

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai-planner")


# ── Lifespan ────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup / shutdown hooks."""

    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    layer = "Layer 2 (Gemini AI)" if gemini_configured else "Layer 1 (Template/Algorithmic)"

    logger.info("=" * 60)
    logger.info("  TaktFlow AI Planner starting")
    logger.info("  Port  : %s", os.environ.get("PORT", "8002"))
    logger.info("  Mode  : %s", layer)
    logger.info("  Model : %s", os.environ.get("AI_MODEL", "gemini-2.0-flash"))
    logger.info("=" * 60)

    yield  # Application is running

    logger.info("AI Planner shutting down")


# ── FastAPI App ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="TaktFlow AI Planner",
    description=(
        "AI-enhanced takt plan generation, optimization, and prediction service. "
        "Works fully offline in Layer 1 (template mode) and gains AI capabilities "
        "with a Google Gemini API key (Layer 2)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dev — restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ─────────────────────────────────────────────────────────────────

app.include_router(ai_router)


# ── Root & Health ───────────────────────────────────────────────────────────


@app.get("/")
async def root() -> dict:
    """Service info."""
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "service": "ai-planner",
        "version": "1.0.0",
        "layer": 2 if gemini_configured else 1,
        "mode": "ai-enhanced" if gemini_configured else "template",
        "model": os.environ.get("AI_MODEL", "gemini-2.0-flash") if gemini_configured else None,
        "endpoints": {
            "generate_plan": "POST /ai/generate-plan",
            "optimize_plan": "POST /ai/optimize-plan",
            "suggest_zones": "POST /ai/suggest-zones",
            "suggest_sequence": "POST /ai/suggest-sequence",
            "predict_delays": "POST /ai/predict/delays",
            "project_health": "GET /ai/predict/project-health/{project_id}",
            "refine_plan": "POST /ai/refine-plan",
            "health_check": "GET /health",
        },
    }


@app.get("/health")
async def health() -> dict:
    """Health check endpoint for orchestration / load balancers."""
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "service": "ai-planner",
        "layer": 2 if gemini_configured else 1,
    }


# ── Dev entrypoint ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8002")),
    )
