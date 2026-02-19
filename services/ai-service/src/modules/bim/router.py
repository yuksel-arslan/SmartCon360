from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def bim_health():
    return {"status": "stub", "module": "bim"}
