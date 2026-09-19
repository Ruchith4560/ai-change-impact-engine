"""Unit and integration tests for ChangeImpactOrchestrator and end-to-end pipeline API."""
import json
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.models.analysis_models import RunFullAnalysisRequest
from app.orchestration.analyzer import ChangeImpactOrchestrator

BENCHMARK_DIR = Path(__file__).resolve().parent.parent.parent / "synthetic_benchmarks" / "ecommerce_service"


def test_pipeline_orchestrator_synthetic_benchmark():
    """Validates the full pipeline against the synthetic ecommerce benchmark."""
    base_payment_code = (BENCHMARK_DIR / "src" / "payment_service.ts").read_text(encoding="utf-8")
    checkout_code = (BENCHMARK_DIR / "src" / "checkout_service.ts").read_text(encoding="utf-8")
    order_code = (BENCHMARK_DIR / "src" / "order_controller.ts").read_text(encoding="utf-8")
    payment_spec = (BENCHMARK_DIR / "tests" / "payment_service.spec.ts").read_text(encoding="utf-8")
    checkout_spec = (BENCHMARK_DIR / "tests" / "checkout_service.spec.ts").read_text(encoding="utf-8")

    # Head code has modified signature on line 17
    head_payment_code = base_payment_code.replace(
        "public async processTransaction(orderId: string, amount: number): Promise<PaymentResult>",
        'public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult>',
    )

    # Construct unified diff targeting line 17
    raw_diff = """diff --git a/src/payment_service.ts b/src/payment_service.ts
index 1111111..2222222 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -17,2 +17,2 @@ export class PaymentService {
-  public async processTransaction(orderId: string, amount: number): Promise<PaymentResult> {
+  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult> {
"""

    files = {
        "src/payment_service.ts": head_payment_code,
        "src/checkout_service.ts": checkout_code,
        "src/order_controller.ts": order_code,
        "tests/payment_service.spec.ts": payment_spec,
        "tests/checkout_service.spec.ts": checkout_spec,
    }

    base_files = {
        "src/payment_service.ts": base_payment_code,
    }

    commit_messages = [
        "fix: payment gateway timeout bug",
        "feat: add stripe checkout support",
        "fix: resolve null check defect on order payment",
        "refactor: modularize order controller",
        "fix: race condition in checkout service",
    ]

    request = RunFullAnalysisRequest(
        repository_id="repo-synthetic-ecom",
        pr_number=42,
        raw_diff=raw_diff,
        files=files,
        base_files=base_files,
        commit_messages=commit_messages,
    )

    report = ChangeImpactOrchestrator.run_analysis(request)

    # Validate Core Identity and Summary KPIs
    assert report.analysis_id.startswith("analysis_")
    assert report.repository_id == "repo-synthetic-ecom"
    assert report.pr_number == 42
    assert report.summary.total_files_changed == 1
    assert report.summary.total_changed_symbols >= 1
    assert report.summary.breaking_candidates_count == 1
    assert report.summary.total_impacted_count >= 2
    assert report.summary.direct_impact_count >= 1
    assert report.summary.transitive_impact_count >= 1

    # Validate Blast Radius
    impacted_names = {e.qualified_name for e in report.blast_radius.impacted_entities}
    assert "CheckoutService.executeCheckout" in impacted_names
    assert "OrderController.handlePostOrder" in impacted_names

    # Validate Risk Scoring
    assert report.summary.risk_score >= 35
    assert report.summary.risk_level in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
    assert len(report.risk_report.factors) == 6
    assert report.risk_report.historical_signal.is_available is True

    # Validate Test Selection
    assert report.test_plan.selected_tests_count >= 2
    selected_test_files = [t.test_file_path for t in report.test_plan.selected_tests]
    assert "tests/payment_service.spec.ts" in selected_test_files
    assert "tests/checkout_service.spec.ts" in selected_test_files

    # Validate AI Explanation
    assert len(report.ai_explanation.summary_markdown) > 0
    assert len(report.ai_explanation.review_checklist) >= 1
    assert len(report.ai_explanation.failure_modes) >= 1

    # Validate Metrics
    assert report.metrics.total_duration_ms > 0
    assert report.metrics.diff_parse_ms >= 0
    assert report.metrics.ast_parse_ms >= 0
    assert report.metrics.graph_build_ms >= 0
    assert report.metrics.traversal_ms >= 0
    assert report.metrics.risk_eval_ms >= 0


def test_pipeline_orchestrator_non_code_change():
    """Verifies pipeline does not crash on non-code changes (e.g. Markdown or config)."""
    raw_diff = """--- a/README.md
+++ b/README.md
@@ -1,2 +1,3 @@
 # Project
+Documentation update
"""
    files = {"README.md": "# Project\nDocumentation update\n"}

    request = RunFullAnalysisRequest(
        repository_id="test-repo",
        raw_diff=raw_diff,
        files=files,
    )

    report = ChangeImpactOrchestrator.run_analysis(request)
    assert report.summary.total_files_changed == 1
    assert report.summary.total_changed_symbols == 0
    assert report.summary.risk_level == "LOW"
    assert report.summary.risk_score <= 30


@pytest.mark.anyio
async def test_api_pipeline_analyze_endpoint():
    """Verifies POST /api/v1/pipeline/analyze returns a valid FullAnalysisReport."""
    base_payment = (BENCHMARK_DIR / "src" / "payment_service.ts").read_text(encoding="utf-8")
    checkout_code = (BENCHMARK_DIR / "src" / "checkout_service.ts").read_text(encoding="utf-8")
    head_payment = base_payment.replace(
        "public async processTransaction(orderId: string, amount: number): Promise<PaymentResult>",
        'public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult>',
    )

    raw_diff = """diff --git a/src/payment_service.ts b/src/payment_service.ts
index 1111111..2222222 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -17,2 +17,2 @@
-  public async processTransaction(orderId: string, amount: number): Promise<PaymentResult> {
+  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult> {
"""

    payload = {
        "repository_id": "test-repo",
        "pr_number": 99,
        "raw_diff": raw_diff,
        "files": {
            "src/payment_service.ts": head_payment,
            "src/checkout_service.ts": checkout_code,
        },
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/v1/pipeline/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["analysis_id"].startswith("analysis_")
        assert data["summary"]["total_files_changed"] == 1
        assert "blast_radius" in data
        assert "risk_report" in data
        assert "test_plan" in data
        assert "ai_explanation" in data
        assert "metrics" in data
