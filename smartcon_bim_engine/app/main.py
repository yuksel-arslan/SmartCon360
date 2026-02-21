"""SmartCon360 BIM Intelligence Engine — FastAPI Application.

Standalone service (Port 8005) providing BIM-native intelligence:
- IFC parsing and element extraction
- Element graph construction
- Quantity takeoff (QTO)
- Uniclass / OmniClass classification
- WBS and LBS generation
- Takt-ready zone generation
- Cost item binding

Layer 1: No AI dependency. Fully deterministic.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import BIMEngineConfig

logging.basicConfig(
    level=getattr(logging, BIMEngineConfig.LOG_LEVEL, logging.INFO),
    format=BIMEngineConfig.LOG_FORMAT,
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("bim_engine")

app = FastAPI(
    title="SmartCon360 BIM Intelligence Engine",
    description=(
        "BIM-native intelligence engine for SmartCon360. "
        "Parses IFC files and produces structured output including "
        "element graphs, QTO, WBS, LBS, takt zones, and cost items."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=BIMEngineConfig.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Root health check."""
    return {
        "status": "ok",
        "service": "smartcon-bim-engine",
        "version": "1.0.0",
        "layer": 1,
    }


from .api.routes import router as bim_router

app.include_router(bim_router, prefix="/api/v1/bim", tags=["bim"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host=BIMEngineConfig.HOST,
        port=BIMEngineConfig.PORT,
    )
