"""SmartCon360 — Takt Service (Port 8001)

Consolidates: takt-engine, flowline, simulation
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers from each module
# takt-engine has routes directly in main.py, so we need to import its app's routes
# Actually the takt-engine routes are defined on its own app object, so we create a router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("takt-service")

app = FastAPI(
    title="SmartCon360 Takt Service",
    description="Takt planning, flowline visualization, and simulation",
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
    return {"status": "ok", "service": "takt-service"}


# Mount takt-engine - it uses its own FastAPI app, mount it as sub-application
from .modules.takt.main import app as takt_app
app.mount("/takt-engine", takt_app)

# Mount flowline stub
from .modules.flowline.router import router as flowline_router
app.include_router(flowline_router, prefix="/api/v1/flowline", tags=["flowline"])

# Mount simulation
from .modules.simulation.main import app as simulation_app
app.mount("/simulation-engine", simulation_app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8001")))
