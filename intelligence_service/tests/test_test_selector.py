"""Unit tests for IntelligentTestSelector and synthetic benchmark evaluation."""
import json
from pathlib import Path
from app.test_selection.selector import IntelligentTestSelector
from app.models.graph_models import ImpactedEntity, ImpactType
from app.models.risk_models import TestPriority

BENCHMARK_DIR = Path(__file__).resolve().parent.parent.parent / "synthetic_benchmarks" / "ecommerce_service"


def test_ecommerce_test_selection_benchmark():
    payment_spec = (BENCHMARK_DIR / "tests" / "payment_service.spec.ts").read_text(encoding="utf-8")
    checkout_spec = (BENCHMARK_DIR / "tests" / "checkout_service.spec.ts").read_text(encoding="utf-8")
    ground_truth = json.loads((BENCHMARK_DIR / "ground_truth.json").read_text(encoding="utf-8"))

    # Include an unrelated test file to verify test reduction ratio
    unrelated_spec = """
    describe("Unrelated Inventory Tests", () => {
        it("checks stock levels", () => { expect(true).toBe(true); });
    });
    """

    repo_files = {
        "tests/payment_service.spec.ts": payment_spec,
        "tests/checkout_service.spec.ts": checkout_spec,
        "tests/inventory_service.spec.ts": unrelated_spec,
    }

    changed_symbol = "src/payment_service.ts::PaymentService.processTransaction"
    impacted_entities = [
        ImpactedEntity(
            entity_id="src/checkout_service.ts::CheckoutService.executeCheckout",
            qualified_name="CheckoutService.executeCheckout",
            entity_type="METHOD",
            file_path="src/checkout_service.ts",
            impact_type=ImpactType.DIRECT,
            depth=1,
            causal_path=[changed_symbol, "src/checkout_service.ts::CheckoutService.executeCheckout"],
        ),
        ImpactedEntity(
            entity_id="src/order_controller.ts::OrderController.handlePostOrder",
            qualified_name="OrderController.handlePostOrder",
            entity_type="METHOD",
            file_path="src/order_controller.ts",
            impact_type=ImpactType.TRANSITIVE,
            depth=2,
            causal_path=[
                changed_symbol,
                "src/checkout_service.ts::CheckoutService.executeCheckout",
                "src/order_controller.ts::OrderController.handlePostOrder",
            ],
        ),
    ]

    test_plan = IntelligentTestSelector.select_tests(
        changed_symbol_ids=[changed_symbol],
        impacted_entities=impacted_entities,
        repo_files=repo_files,
    )

    assert test_plan.total_repo_tests == 3
    assert test_plan.selected_tests_count == 2
    # 1 of 3 tests omitted -> reduction ratio = ~0.333
    assert test_plan.test_reduction_ratio > 0.30

    test_map = {t.test_file_path: t for t in test_plan.selected_tests}

    # Verify P1: payment_service.spec.ts
    assert "tests/payment_service.spec.ts" in test_map
    p1_test = test_map["tests/payment_service.spec.ts"]
    assert p1_test.priority == TestPriority.P1
    assert "processTransaction" in p1_test.rationale

    # Verify P2: checkout_service.spec.ts
    assert "tests/checkout_service.spec.ts" in test_map
    p2_test = test_map["tests/checkout_service.spec.ts"]
    assert p2_test.priority == TestPriority.P2
    assert p2_test.path_distance == 1

    # Verify ground truth compliance
    gt_tests = {item["test_file"]: item["priority"] for item in ground_truth["ground_truth_test_selection"]}
    for test_path, expected_prio in gt_tests.items():
        assert test_path in test_map
        assert test_map[test_path].priority.value == expected_prio
