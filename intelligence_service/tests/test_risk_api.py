"""Integration tests for Risk Evaluation API endpoint."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.anyio
async def test_api_evaluate_risk():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "total_files_changed": 2,
            "total_additions": 45,
            "total_deletions": 10,
            "breaking_candidates_count": 1,
            "changed_symbol_ids": ["src/payment.ts::PaymentService.charge"],
            "impacted_entities_count": 5,
            "max_dependency_depth": 2,
            "impacted_file_paths": ["src/checkout.ts", "src/billing.ts"],
            "repo_files": {
                "tests/payment.spec.ts": "import { PaymentService } from './payment'; PaymentService.charge();",
                "tests/unrelated.spec.ts": "test('dummy', () => {});",
            },
            "commit_messages": [
                "fix: payment timeout defect",
                "feat: add stripe support",
                "fix: resolve currency mismatch bug",
                "refactor: clean models",
                "fix: patch billing race condition",
            ],
        }

        res = await client.post("/api/v1/risk/evaluate", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert "risk_score" in data
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_level"] in ("MEDIUM", "HIGH", "CRITICAL")
        assert len(data["factors"]) == 6
        assert data["historical_signal"]["is_available"] is True
        assert data["historical_signal"]["recent_bugfixes_count"] == 3
        assert data["test_plan"]["selected_tests_count"] >= 1
