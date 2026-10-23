from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "beacon-pilot"}


@router.get("/health/ready")
async def readiness_check():
    return {"status": "ready", "service": "beacon-pilot"}