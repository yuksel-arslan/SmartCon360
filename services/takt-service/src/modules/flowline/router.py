"""Flowline module — stub for Phase 2 migration from Node.js."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def flowline_health():
    return {"status": "stub", "module": "flowline"}
