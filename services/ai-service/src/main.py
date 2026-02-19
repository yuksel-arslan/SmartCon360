"""SmartCon360 — AI Service (Port 8002)

Consolidates: ai-planner, reporting-service, vision, analytics (stub), bim (stub), drl (stub)
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="SmartCon360 AI Service",
    description="AI planning, reporting, vision analysis, and intelligence services",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    gemini_configured = bool(os.environ.get("GEMINI_API_KEY"))
    return {
        "status": "ok",
        "service": "ai-service",
        "layer": 2 if gemini_configured else 1,
        "ai_enabled": gemini_configured,
    }


# Mount ai-planner as sub-application
from .modules.planner.main import app as planner_app

app.mount("/planner", planner_app)

# Mount reporting as sub-application
from .modules.reporting.main import app as reporting_app

app.mount("/reporting", reporting_app)

# Mount stub routers
from .modules.analytics.router import router as analytics_router
from .modules.bim.router import router as bim_router
from .modules.drl.router import router as drl_router

app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(bim_router, prefix="/api/v1/bim", tags=["bim"])
app.include_router(drl_router, prefix="/api/v1/drl", tags=["drl"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8002")))
