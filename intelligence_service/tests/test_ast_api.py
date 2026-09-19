"""Integration tests for AST API endpoints."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

SAMPLE_CODE = """
export function addNumbers(a: number, b: number): number {
    return a + b;
}
"""

SAMPLE_DIFF = """diff --git a/src/math.ts b/src/math.ts
index 1111111..2222222 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -2,3 +2,3 @@
-export function addNumbers(a: number, b: number): number {
+export function addNumbers(a: number, b: number, factor: number = 1): number {
"""

SAMPLE_HEAD = """
export function addNumbers(a: number, b: number, factor: number = 1): number {
    return (a + b) * factor;
}
"""


@pytest.mark.anyio
async def test_api_parse_file():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ast/parse-file",
            json={"file_path": "src/math.ts", "content": SAMPLE_CODE},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["file_path"] == "src/math.ts"
        assert data["language"] == "typescript"
        assert len(data["entities"]) == 1
        assert data["entities"][0]["name"] == "addNumbers"
        assert data["entities"][0]["is_exported"] is True


@pytest.mark.anyio
async def test_api_map_diff():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/ast/map-diff",
            json={
                "raw_diff": SAMPLE_DIFF,
                "files_content": {"src/math.ts": SAMPLE_HEAD},
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_changed_symbols"] >= 1
        sym = next(s for s in data["changed_symbols"] if s["qualified_name"] == "addNumbers")
        assert sym["change_nature"] == "SIGNATURE_MODIFIED"
        assert sym["is_breaking_candidate"] is True
