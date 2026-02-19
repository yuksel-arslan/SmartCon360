"""TaktFlow AI — Reporting Service (Port 8004)

Generates construction project reports in HTML and JSON formats.
Layer 1: Template-based data reports (no external dependency).
Layer 2: AI-enhanced narrative reports via Google Gemini API.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as reports_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("reporting-service")

app = FastAPI(
    title="TaktFlow AI — Reporting Service",
    description="AI-powered report generation for construction projects",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ──
app.include_router(reports_router)


# ── Health check ──

@app.get("/health")
def health() -> dict:
    gemini_available = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "service": "reporting-service",
        "layer": 2 if gemini_available else 1,
        "ai_enabled": gemini_available,
    }


# ── Startup logging ──

@app.on_event("startup")
async def on_startup() -> None:
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        logger.info("Gemini API key detected — Layer 2 AI narratives enabled")
    else:
        logger.info("No Gemini API key — running in Layer 1 (template-only) mode")
    logger.info("Reporting service started on port %s", os.environ.get("PORT", "8004"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8004)))
