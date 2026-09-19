"""Unit tests for TypeScript/JavaScript AST intelligence parser."""
from app.parsing.typescript_ast_parser import TypeScriptASTParser
from app.models.ast_models import EntityType

SAMPLE_TS_CODE = """import { PaymentService, PaymentResult } from "./payment_service.js";

export interface CheckoutRequest {
  orderId: string;
  amount: number;
  customerId: string;
}

export type OrderStatus = "PENDING" | "COMPLETED" | "FAILED";

export class CheckoutService {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService = new PaymentService()) {
    this.paymentService = paymentService;
  }

  public async executeCheckout(request: CheckoutRequest): Promise<PaymentResult> {
    console.log("Checking out order", request.orderId);
    return await this.paymentService.processTransaction(request.orderId, request.amount);
  }

  private _internalAudit(orderId: string): void {
    // internal audit logic
  }
}

export function formatOrderId(id: string): string {
  return `ORD-${id}`;
}
"""


def test_typescript_ast_extraction():
    parser = TypeScriptASTParser(is_tsx=False)
    analysis = parser.parse_source("src/checkout_service.ts", SAMPLE_TS_CODE)

    assert analysis.language == "typescript"
    assert len(analysis.parse_errors) == 0

    # Verify imports
    assert len(analysis.imports) == 1
    imp = analysis.imports[0]
    assert imp.source_module == "./payment_service.js"
    assert "PaymentService" in imp.imported_names
    assert "PaymentResult" in imp.imported_names

    entities_by_name = {e.qualified_name: e for e in analysis.entities}

    # Verify Interface
    assert "CheckoutRequest" in entities_by_name
    assert entities_by_name["CheckoutRequest"].entity_type == EntityType.INTERFACE
    assert entities_by_name["CheckoutRequest"].is_exported is True

    # Verify Type Alias
    assert "OrderStatus" in entities_by_name
    assert entities_by_name["OrderStatus"].entity_type == EntityType.TYPE_ALIAS

    # Verify Class
    assert "CheckoutService" in entities_by_name
    assert entities_by_name["CheckoutService"].entity_type == EntityType.CLASS
    assert entities_by_name["CheckoutService"].is_exported is True

    # Verify Method
    assert "CheckoutService.executeCheckout" in entities_by_name
    exec_m = entities_by_name["CheckoutService.executeCheckout"]
    assert exec_m.entity_type == EntityType.METHOD
    assert exec_m.is_exported is True
    assert "request" in exec_m.parameters
    assert "Promise<PaymentResult>" in (exec_m.return_type or "")

    # Verify Calls inside executeCheckout
    calls = [c.target_name for c in exec_m.calls]
    assert "processTransaction" in calls
    assert "log" in calls

    # Verify Private Method
    assert "CheckoutService._internalAudit" in entities_by_name
    audit_m = entities_by_name["CheckoutService._internalAudit"]
    assert audit_m.is_exported is False

    # Verify Function
    assert "formatOrderId" in entities_by_name
    assert entities_by_name["formatOrderId"].entity_type == EntityType.FUNCTION
    assert entities_by_name["formatOrderId"].is_exported is True
