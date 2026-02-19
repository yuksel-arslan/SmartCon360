"""TaktFlow AI — Simulation Service.

FastAPI application providing what-if scenario analysis, Monte Carlo risk
simulation, and multi-scenario comparison for takt construction plans.

Port: 8003
Layer: 1 (core parameter sweep) + 3 (DRL-enhanced, future)
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import router as simulation_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("simulation-service")

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="TaktFlow AI — Simulation Service",
    description=(
        "What-if scenario simulation, Monte Carlo risk analysis, and "
        "multi-scenario comparison for takt construction plans."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://localhost:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(simulation_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "simulation-service"}


# ---------------------------------------------------------------------------
# Startup / Shutdown
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    port = os.getenv("PORT", "8003")
    logger.info("Simulation service starting on port %s", port)
    logger.info("CORS origins: %s", ALLOWED_ORIGINS)
    logger.info("Log level: %s", LOG_LEVEL)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("Simulation service shutting down")
