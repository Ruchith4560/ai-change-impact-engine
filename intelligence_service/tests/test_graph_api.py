"""Integration tests for Graph API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

SAMPLE_A = """
export function serviceA() {
    return 100;
}
"""

SAMPLE_B = """
import { serviceA } from "./service_a.js";

export function serviceB() {
    return serviceA() + 50;
}
"""


@pytest.mark.anyio
async def test_api_build_graph():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/graph/build",
            json={
                "files": {
                    "src/service_a.ts": SAMPLE_A,
                    "src/service_b.ts": SAMPLE_B,
                }
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_nodes"] >= 4  # 2 files + 2 functions
        assert data["total_edges"] >= 3  # 2 defines + 1 calls (plus import)


@pytest.mark.anyio
async def test_api_compute_blast_radius():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/graph/blast-radius",
            json={
                "files": {
                    "src/service_a.ts": SAMPLE_A,
                    "src/service_b.ts": SAMPLE_B,
                },
                "changed_symbol_ids": ["src/service_a.ts::serviceA"],
                "max_depth": 5,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["direct_impact_count"] == 1
        assert len(data["impacted_entities"]) == 1
        impact = data["impacted_entities"][0]
        assert impact["qualified_name"] == "serviceB"
        assert impact["depth"] == 1
