"""Verification test against the synthetic ecommerce benchmark codebase."""
from pathlib import Path
from app.parsing.typescript_ast_parser import TypeScriptASTParser
from app.models.ast_models import EntityType

BENCHMARK_DIR = Path(__file__).resolve().parent.parent.parent / "synthetic_benchmarks" / "ecommerce_service"


def test_synthetic_payment_service_ast():
    payment_file = BENCHMARK_DIR / "src" / "payment_service.ts"
    assert payment_file.exists(), f"Missing {payment_file}"

    code = payment_file.read_text(encoding="utf-8")
    parser = TypeScriptASTParser(is_tsx=False)
    analysis = parser.parse_source("src/payment_service.ts", code)

    assert len(analysis.parse_errors) == 0
    entities = {e.qualified_name: e for e in analysis.entities}

    # Interface
    assert "PaymentResult" in entities
    assert entities["PaymentResult"].entity_type == EntityType.INTERFACE

    # Class
    assert "PaymentService" in entities
    assert entities["PaymentService"].entity_type == EntityType.CLASS
    assert entities["PaymentService"].is_exported is True

    # Method
    assert "PaymentService.processTransaction" in entities
    m = entities["PaymentService.processTransaction"]
    assert m.entity_type == EntityType.METHOD
    assert m.is_exported is True
    assert "orderId" in m.parameters
    assert "amount" in m.parameters


def test_synthetic_checkout_service_ast():
    checkout_file = BENCHMARK_DIR / "src" / "checkout_service.ts"
    assert checkout_file.exists(), f"Missing {checkout_file}"

    code = checkout_file.read_text(encoding="utf-8")
    parser = TypeScriptASTParser(is_tsx=False)
    analysis = parser.parse_source("src/checkout_service.ts", code)

    entities = {e.qualified_name: e for e in analysis.entities}
    assert "CheckoutService" in entities
    assert "CheckoutService.executeCheckout" in entities

    exec_m = entities["CheckoutService.executeCheckout"]
    call_targets = [c.target_name for c in exec_m.calls]
    assert "processTransaction" in call_targets


def test_synthetic_order_controller_ast():
    order_file = BENCHMARK_DIR / "src" / "order_controller.ts"
    assert order_file.exists(), f"Missing {order_file}"

    code = order_file.read_text(encoding="utf-8")
    parser = TypeScriptASTParser(is_tsx=False)
    analysis = parser.parse_source("src/order_controller.ts", code)

    entities = {e.qualified_name: e for e in analysis.entities}
    assert "OrderController" in entities
    assert "OrderController.handlePostOrder" in entities

    ctrl_m = entities["OrderController.handlePostOrder"]
    call_targets = [c.target_name for c in ctrl_m.calls]
    assert "executeCheckout" in call_targets
