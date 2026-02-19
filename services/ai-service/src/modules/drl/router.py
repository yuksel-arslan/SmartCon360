from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def drl_health():
    return {"status": "stub", "module": "drl"}
