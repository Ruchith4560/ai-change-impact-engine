"""Unit tests for BlastRadiusTraverser and ground truth benchmark validation."""
import json
from pathlib import Path
from app.graph.builder import DependencyGraphBuilder
from app.graph.traverser import BlastRadiusTraverser
from app.models.graph_models import ImpactType

BENCHMARK_DIR = Path(__file__).resolve().parent.parent.parent / "synthetic_benchmarks" / "ecommerce_service"


def test_ecommerce_benchmark_blast_radius():
    # Load files from synthetic benchmark
    payment_code = (BENCHMARK_DIR / "src" / "payment_service.ts").read_text(encoding="utf-8")
    checkout_code = (BENCHMARK_DIR / "src" / "checkout_service.ts").read_text(encoding="utf-8")
    order_code = (BENCHMARK_DIR / "src" / "order_controller.ts").read_text(encoding="utf-8")
    ground_truth = json.loads((BENCHMARK_DIR / "ground_truth.json").read_text(encoding="utf-8"))

    files = {
        "src/payment_service.ts": payment_code,
        "src/checkout_service.ts": checkout_code,
        "src/order_controller.ts": order_code,
    }

    builder = DependencyGraphBuilder()
    graph = builder.build_from_files(files)

    changed_symbol = "src/payment_service.ts::PaymentService.processTransaction"
    assert graph.has_node(changed_symbol)

    report = BlastRadiusTraverser.compute_blast_radius(
        graph=graph,
        changed_symbol_ids=[changed_symbol],
        max_depth=5,
    )

    # Validate direct and transitive counts
    assert report.total_impacted_count >= 2
    assert report.direct_impact_count >= 1
    assert report.transitive_impact_count >= 1

    impacted_map = {e.qualified_name: e for e in report.impacted_entities}

    # 1. CheckoutService.executeCheckout must be DIRECT impact (depth 1)
    assert "CheckoutService.executeCheckout" in impacted_map
    checkout_impact = impacted_map["CheckoutService.executeCheckout"]
    assert checkout_impact.impact_type == ImpactType.DIRECT
    assert checkout_impact.depth == 1
    assert checkout_impact.causal_path[0] == changed_symbol

    # 2. OrderController.handlePostOrder must be TRANSITIVE impact (depth 2)
    assert "OrderController.handlePostOrder" in impacted_map
    order_impact = impacted_map["OrderController.handlePostOrder"]
    assert order_impact.impact_type == ImpactType.TRANSITIVE
    assert order_impact.depth == 2

    # Causal path: Payment.processTransaction -> Checkout.executeCheckout -> Order.handlePostOrder
    assert len(order_impact.causal_path) == 3
    assert order_impact.causal_path[0] == changed_symbol
    assert "CheckoutService.executeCheckout" in order_impact.causal_path[1]
    assert "OrderController.handlePostOrder" in order_impact.causal_path[2]

    # Ground truth precision and recall evaluation
    gt_blast = ground_truth["ground_truth_blast_radius"]
    expected_symbols = {
        item["symbol"] for item in gt_blast["direct_impacts"] + gt_blast["transitive_impacts"]
    }
    predicted_symbols = set(impacted_map.keys())

    intersection = expected_symbols.intersection(predicted_symbols)
    precision = len(intersection) / len(predicted_symbols)
    recall = len(intersection) / len(expected_symbols)

    assert recall == 1.0, f"Expected 100% recall on synthetic benchmark, got {recall}"
    assert precision == 1.0, f"Expected 100% precision on synthetic benchmark, got {precision}"
