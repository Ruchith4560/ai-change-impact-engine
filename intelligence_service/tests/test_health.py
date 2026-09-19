"""Unit tests for health endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_liveness_probe():
    """Verify /health returns 200 and status ok."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "Intelligence Service" in data["service"]


@pytest.mark.anyio
async def test_readiness_probe():
    """Verify /health/ready returns 200 and status ready."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
