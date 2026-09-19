"""Unit tests for the DiffASTMapper."""
from app.parsing.typescript_ast_parser import TypeScriptASTParser
from app.parsing.diff_ast_mapper import DiffASTMapper
from app.git.diff_parser import UnifiedDiffParser
from app.models.ast_models import ChangeNature

PAYMENT_SERVICE_BASE = """export class PaymentService {
  constructor() {}

  public async processTransaction(orderId: string, amount: number): Promise<any> {
    if (amount <= 0) {
      throw new Error("Invalid");
    }
    return { status: "SUCCESS" };
  }
}
"""

PAYMENT_SERVICE_HEAD_SIG_CHANGE = """export class PaymentService {
  constructor() {}

  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<any> {
    if (amount <= 0) {
      throw new Error("Invalid");
    }
    return { status: "SUCCESS" };
  }
}
"""

DIFF_SIG_CHANGE = """diff --git a/src/payment_service.ts b/src/payment_service.ts
index 1111111..2222222 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -4,3 +4,3 @@ export class PaymentService {
-  public async processTransaction(orderId: string, amount: number): Promise<any> {
+  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<any> {
"""

DIFF_BODY_CHANGE = """diff --git a/src/payment_service.ts b/src/payment_service.ts
index 1111111..3333333 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -7,2 +7,3 @@ export class PaymentService {
-    return { status: "SUCCESS" };
+    console.log("Transaction audited:", orderId);
+    return { status: "SUCCESS", fee: 1.5 };
"""

PAYMENT_SERVICE_HEAD_BODY_CHANGE = """export class PaymentService {
  constructor() {}

  public async processTransaction(orderId: string, amount: number): Promise<any> {
    if (amount <= 0) {
      throw new Error("Invalid");
    }
    console.log("Transaction audited:", orderId);
    return { status: "SUCCESS", fee: 1.5 };
  }
}
"""


def test_map_signature_change():
    parser = TypeScriptASTParser()
    head_ast = parser.parse_source("src/payment_service.ts", PAYMENT_SERVICE_HEAD_SIG_CHANGE)
    diff_result = UnifiedDiffParser.parse(DIFF_SIG_CHANGE)

    result = DiffASTMapper.map_diff_to_ast(
        changed_files=diff_result.files,
        analyses_by_path={"src/payment_service.ts": head_ast},
    )

    assert result.total_changed_symbols >= 1
    # Check that processTransaction was mapped with SIGNATURE_MODIFIED and breaking candidate
    m = next(s for s in result.changed_symbols if s.qualified_name == "PaymentService.processTransaction")
    assert m.change_nature == ChangeNature.SIGNATURE_MODIFIED
    assert m.is_exported is True
    assert m.is_breaking_candidate is True
    assert result.breaking_candidates_count >= 1


def test_map_body_change():
    parser = TypeScriptASTParser()
    head_ast = parser.parse_source("src/payment_service.ts", PAYMENT_SERVICE_HEAD_BODY_CHANGE)
    diff_result = UnifiedDiffParser.parse(DIFF_BODY_CHANGE)

    result = DiffASTMapper.map_diff_to_ast(
        changed_files=diff_result.files,
        analyses_by_path={"src/payment_service.ts": head_ast},
    )

    m = next(s for s in result.changed_symbols if s.qualified_name == "PaymentService.processTransaction")
    assert m.change_nature == ChangeNature.BODY_MODIFIED
    # Body change on existing parameters should NOT be flagged as breaking candidate
    assert m.is_breaking_candidate is False
