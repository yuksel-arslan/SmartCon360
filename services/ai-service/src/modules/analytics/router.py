from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def analytics_health():
    return {"status": "stub", "module": "analytics"}
