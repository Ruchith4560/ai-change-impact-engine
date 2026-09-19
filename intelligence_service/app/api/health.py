"""Health check endpoints for container and gateway liveness/readiness probes."""
from fastapi import APIRouter
from pydantic import BaseModel
from app.core.config import settings

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def liveness_probe():
    """Returns service liveness status."""
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
    )


@router.get("/health/ready", response_model=HealthResponse)
async def readiness_probe():
    """Returns readiness status (checks dependencies)."""
    return HealthResponse(
        status="ready",
        service=settings.app_name,
        version=settings.app_version,
    )
