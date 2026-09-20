import { FullAnalysisReport } from "../types/analysis";

export const ECOMMERCE_BENCHMARK_REPORT: FullAnalysisReport = {
  analysis_id: "analysis_ecom_benchmark_9a2f",
  repository_id: "repo-synthetic-ecommerce",
  pr_number: 142,
  created_at: new Date().toISOString(),
  summary: {
    risk_score: 54,
    risk_level: "HIGH",
    total_files_changed: 1,
    total_changed_symbols: 1,
    breaking_candidates_count: 1,
    direct_impact_count: 1,
    transitive_impact_count: 1,
    total_impacted_count: 2,
    recommended_test_count: 2,
    test_reduction_ratio: 0.333,
  },
  changed_symbols: [
    {
      entity_id: "src/payment_service.ts::PaymentService.processTransaction",
      qualified_name: "PaymentService.processTransaction",
      entity_type: "METHOD",
      file_path: "src/payment_service.ts",
      change_nature: "SIGNATURE_MODIFIED",
      is_exported: true,
      is_breaking_candidate: true,
      diff_lines_intersected: [17],
      location: {
        start_line: 17,
        end_line: 26,
        start_col: 2,
        end_col: 3,
      },
    },
  ],
  blast_radius: {
    changed_symbol_ids: ["src/payment_service.ts::PaymentService.processTransaction"],
    direct_impact_count: 1,
    transitive_impact_count: 1,
    total_impacted_count: 2,
    max_depth_reached: 2,
    impacted_entities: [
      {
        entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        qualified_name: "CheckoutService.executeCheckout",
        entity_type: "METHOD",
        file_path: "src/checkout_service.ts",
        impact_type: "DIRECT",
        depth: 1,
        causal_path: [
          "src/payment_service.ts::PaymentService.processTransaction",
          "src/checkout_service.ts::CheckoutService.executeCheckout",
        ],
        confidence: 1.0,
      },
      {
        entity_id: "src/order_controller.ts::OrderController.handlePostOrder",
        qualified_name: "OrderController.handlePostOrder",
        entity_type: "METHOD",
        file_path: "src/order_controller.ts",
        impact_type: "TRANSITIVE",
        depth: 2,
        causal_path: [
          "src/payment_service.ts::PaymentService.processTransaction",
          "src/checkout_service.ts::CheckoutService.executeCheckout",
          "src/order_controller.ts::OrderController.handlePostOrder",
        ],
        confidence: 0.95,
      },
    ],
    subgraph_nodes: [
      {
        id: "src/payment_service.ts::PaymentService.processTransaction",
        label: "PaymentService.processTransaction",
        file_path: "src/payment_service.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        label: "CheckoutService.executeCheckout",
        file_path: "src/checkout_service.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/order_controller.ts::OrderController.handlePostOrder",
        label: "OrderController.handlePostOrder",
        file_path: "src/order_controller.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
    ],
    subgraph_edges: [
      {
        source_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        target_id: "src/payment_service.ts::PaymentService.processTransaction",
        relation_type: "CALLS",
        confidence: 1.0,
        is_dynamic: false,
      },
      {
        source_id: "src/order_controller.ts::OrderController.handlePostOrder",
        target_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        relation_type: "CALLS",
        confidence: 0.95,
        is_dynamic: false,
      },
    ],
    unresolved_calls: [],
  },
  risk_report: {
    risk_score: 54,
    risk_level: "HIGH",
    factors: [
      {
        factor_id: "BLAST_RADIUS_VOLUME",
        name: "Downstream Blast Radius Volume",
        weight: 25,
        raw_value: 2.0,
        contribution_points: 3,
        evidence: "2 downstream code entities potentially affected.",
      },
      {
        factor_id: "TRANSITIVE_DEPTH",
        name: "Maximum Dependency Depth",
        weight: 20,
        raw_value: 2.0,
        contribution_points: 8,
        evidence: "Changes propagate up to 2 hops away from source (OrderController -> CheckoutService -> PaymentService).",
      },
      {
        factor_id: "PUBLIC_API_BREAK",
        name: "Exported Interface Mutation",
        weight: 20,
        raw_value: 1.0,
        contribution_points: 20,
        evidence: "1 exported symbol (PaymentService.processTransaction) had method signature/parameter alterations.",
      },
      {
        factor_id: "TEST_PROXIMITY_GAP",
        name: "Test Coverage Proximity Gap",
        weight: 15,
        raw_value: 0.0,
        contribution_points: 15,
        evidence: "1 downstream consumer (OrderController) lacks dedicated unit test coverage in PR target.",
      },
      {
        factor_id: "HISTORICAL_DEFECT_CHURN",
        name: "Historical Defect Frequency",
        weight: 10,
        raw_value: 3.0,
        contribution_points: 4,
        evidence: "3 prior bugfix commits mined touching src/payment_service.ts and src/checkout_service.ts.",
      },
      {
        factor_id: "DIFF_CHURN_VOLUME",
        name: "Raw Code Churn & Surface Size",
        weight: 10,
        raw_value: 4.0,
        contribution_points: 4,
        evidence: "2 additions, 2 deletions across 1 source file.",
      },
    ],
    historical_signal: {
      is_available: true,
      commits_analyzed: 5,
      recent_bugfixes_count: 3,
      high_churn_files: ["src/payment_service.ts", "src/checkout_service.ts"],
      co_changed_files: {
        "src/payment_service.ts": ["src/checkout_service.ts"],
      },
    },
    test_plan: {
      total_repo_tests: 3,
      selected_tests_count: 2,
      test_reduction_ratio: 0.333,
      p1_count: 1,
      p2_count: 1,
      p3_count: 0,
      selected_tests: [
        {
          test_file_path: "tests/payment_service.spec.ts",
          test_name: "PaymentService Unit Suite",
          priority: "P1",
          rationale: "Directly tests modified symbol: PaymentService.processTransaction",
          target_entity_id: "src/payment_service.ts::PaymentService.processTransaction",
          path_distance: 0,
          confidence: 1.0,
        },
        {
          test_file_path: "tests/checkout_service.spec.ts",
          test_name: "CheckoutService Integration Suite",
          priority: "P2",
          rationale: "Asserts downstream consumer 1 hop away: CheckoutService.executeCheckout",
          target_entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
          path_distance: 1,
          confidence: 0.95,
        },
      ],
    },
    limitations: [
      "Dynamic Express route bindings in order_controller.ts resolved via static AST naming heuristic.",
    ],
  },
  test_plan: {
    total_repo_tests: 3,
    selected_tests_count: 2,
    test_reduction_ratio: 0.333,
    p1_count: 1,
    p2_count: 1,
    p3_count: 0,
    selected_tests: [
      {
        test_file_path: "tests/payment_service.spec.ts",
        test_name: "PaymentService Unit Suite",
        priority: "P1",
        rationale: "Directly tests modified symbol: PaymentService.processTransaction",
        target_entity_id: "src/payment_service.ts::PaymentService.processTransaction",
        path_distance: 0,
        confidence: 1.0,
      },
      {
        test_file_path: "tests/checkout_service.spec.ts",
        test_name: "CheckoutService Integration Suite",
        priority: "P2",
        rationale: "Asserts downstream consumer 1 hop away: CheckoutService.executeCheckout",
        target_entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        path_distance: 1,
        confidence: 0.95,
      },
    ],
  },
  ai_explanation: {
    summary_markdown: `### Executive Impact Summary

Pull Request **#142** introduces a **signature modification** to \`PaymentService.processTransaction\` by adding a \`currency\` parameter. 

Deterministic AST reachability analysis identified **2 downstream consumers** across 2 dependency hops:
1. **Direct Impact (Hop 1)**: \`CheckoutService.executeCheckout\` directly invokes the altered method.
2. **Transitive Impact (Hop 2)**: \`OrderController.handlePostOrder\` relies on the checkout execution flow.

Because \`PaymentService.processTransaction\` is an exported public interface, unpatched callers may fail at runtime if the default argument is not honored across boundary layers.`,
    review_checklist: [
      "Verify that `CheckoutService.executeCheckout` properly forwards or defaults the `currency` parameter.",
      "Check `OrderController.handlePostOrder` input validation to confirm ISO-4217 currency strings are accepted.",
      "Execute `tests/payment_service.spec.ts` (P1) and `tests/checkout_service.spec.ts` (P2) before merging.",
      "Ensure payment gateway API mock matches the new method contract in staging.",
    ],
    failure_modes: [
      "**Runtime Parameter Mismatch**: Callers omitting `currency` could trigger gateway rejection if default argument parsing fails.",
      "**Silent Checkout Abort**: If `executeCheckout` wraps the payment call in an unlogged try/catch, payment failures may appear as cart abandonment.",
    ],
    is_generated_by_llm: true,
  },
  limitations: [
    "Dynamic Express route bindings in order_controller.ts resolved via static AST naming heuristic.",
  ],
  metrics: {
    diff_parse_ms: 0.18,
    ast_parse_ms: 2.15,
    graph_build_ms: 2.45,
    traversal_ms: 0.32,
    risk_eval_ms: 1.12,
    ai_synthesis_ms: 41.2,
    total_duration_ms: 47.42,
  },
};

export const DOC_UPDATE_REPORT: FullAnalysisReport = {
  analysis_id: "analysis_doc_update_1b8c",
  repository_id: "repo-synthetic-ecommerce",
  pr_number: 143,
  created_at: new Date().toISOString(),
  summary: {
    risk_score: 12,
    risk_level: "LOW",
    total_files_changed: 1,
    total_changed_symbols: 0,
    breaking_candidates_count: 0,
    direct_impact_count: 0,
    transitive_impact_count: 0,
    total_impacted_count: 0,
    recommended_test_count: 0,
    test_reduction_ratio: 1.0,
  },
  changed_symbols: [],
  blast_radius: {
    changed_symbol_ids: ["file:README.md"],
    direct_impact_count: 0,
    transitive_impact_count: 0,
    total_impacted_count: 0,
    max_depth_reached: 0,
    impacted_entities: [],
    subgraph_nodes: [
      {
        id: "file:README.md",
        label: "README.md",
        file_path: "README.md",
        entity_type: "FILE",
        is_exported: false,
      },
    ],
    subgraph_edges: [],
    unresolved_calls: [],
  },
  risk_report: {
    risk_score: 12,
    risk_level: "LOW",
    factors: [
      {
        factor_id: "BLAST_RADIUS_VOLUME",
        name: "Downstream Blast Radius Volume",
        weight: 25,
        raw_value: 0.0,
        contribution_points: 0,
        evidence: "0 downstream code entities affected.",
      },
      {
        factor_id: "TRANSITIVE_DEPTH",
        name: "Maximum Dependency Depth",
        weight: 20,
        raw_value: 0.0,
        contribution_points: 0,
        evidence: "No executable code dependencies touched.",
      },
      {
        factor_id: "PUBLIC_API_BREAK",
        name: "Exported Interface Mutation",
        weight: 20,
        raw_value: 0.0,
        contribution_points: 0,
        evidence: "Zero code symbols altered.",
      },
      {
        factor_id: "TEST_PROXIMITY_GAP",
        name: "Test Coverage Proximity Gap",
        weight: 15,
        raw_value: 0.0,
        contribution_points: 0,
        evidence: "Non-executable documentation change requires no test coverage.",
      },
      {
        factor_id: "HISTORICAL_DEFECT_CHURN",
        name: "Historical Defect Frequency",
        weight: 10,
        raw_value: 0.0,
        contribution_points: 2,
        evidence: "No defect hotspots associated with README.md.",
      },
      {
        factor_id: "DIFF_CHURN_VOLUME",
        name: "Raw Code Churn & Surface Size",
        weight: 10,
        raw_value: 10.0,
        contribution_points: 10,
        evidence: "10 additions in documentation.",
      },
    ],
    historical_signal: {
      is_available: false,
      commits_analyzed: 0,
      recent_bugfixes_count: 0,
      high_churn_files: [],
      co_changed_files: {},
      unavailability_reason: "Documentation file has no code bugfix history.",
    },
    test_plan: {
      total_repo_tests: 3,
      selected_tests_count: 0,
      test_reduction_ratio: 1.0,
      p1_count: 0,
      p2_count: 0,
      p3_count: 0,
      selected_tests: [],
    },
    limitations: [],
  },
  test_plan: {
    total_repo_tests: 3,
    selected_tests_count: 0,
    test_reduction_ratio: 1.0,
    p1_count: 0,
    p2_count: 0,
    p3_count: 0,
    selected_tests: [],
  },
  ai_explanation: {
    summary_markdown: `### Low-Risk Documentation Change

This change touches solely documentation (**README.md**) with 10 added lines. No executable TypeScript or Python source code was modified, resulting in **zero blast radius** and **zero regression risk**.`,
    review_checklist: [
      "Review spelling, markdown formatting, and link targets in README.md.",
      "Verify code snippets in documentation reflect current API signatures.",
    ],
    failure_modes: [],
    is_generated_by_llm: false,
  },
  limitations: [],
  metrics: {
    diff_parse_ms: 0.08,
    ast_parse_ms: 0.02,
    graph_build_ms: 0.12,
    traversal_ms: 0.01,
    risk_eval_ms: 0.22,
    ai_synthesis_ms: 0.15,
    total_duration_ms: 0.6,
  },
};

// --- Raw Unified Diffs for Scenarios ---

export const DIFF_BREAKING_PAYMENT = `diff --git a/src/payment_service.ts b/src/payment_service.ts
index 8e4b1a2..9c3f2d1 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -15,7 +15,9 @@ export class PaymentService {
    * Process a customer transaction via payment provider gateway.
    */
-  public processTransaction(orderId: string, amount: number): TransactionResult {
+  public processTransaction(orderId: string, amount: number, currencyISO: string): TransactionResult {
+    if (!currencyISO || currencyISO.length !== 3) {
+      throw new Error("Invalid currency ISO code");
+    }
     const charge = this.gateway.charge({ orderId, amount, currency: currencyISO });
     return charge;
   }`;

export const DIFF_LOGIC_DISCOUNT = `diff --git a/services/coupon_validator.py b/services/coupon_validator.py
index b1c49a1..f2e87c0 100644
--- a/services/coupon_validator.py
+++ b/services/coupon_validator.py
@@ -28,5 +28,7 @@ class CouponValidator:
     def validate_discount(self, user_id: str, code: str, cart_total: float) -> float:
         rule = self.rules_engine.lookup(code)
-        if cart_total > rule.min_spend:
+        # Bugfix: ensure cart total is strictly positive and meets minimum threshold
+        if cart_total > 0 and cart_total >= rule.min_spend:
             return cart_total * rule.discount_percent
         return 0.0`;

export const DIFF_CASCADE_CHECKOUT = `diff --git a/src/order_controller.ts b/src/order_controller.ts
index d3a1e2f..e4c2b9a 100644
--- a/src/order_controller.ts
+++ b/src/order_controller.ts
@@ -42,6 +42,9 @@ export class OrderController {
   public async handlePostOrder(req: Request, res: Response): Promise<void> {
     const { orderId, items, customerId, paymentMethod } = req.body;
+    // Added distributed saga transaction lock across checkout and inventory
+    const reservation = await this.inventoryClient.reserveStock(items);
+    const checkout = await this.checkoutService.executeCheckout(orderId, items, reservation.lockId);
     res.status(201).json({ status: "PLACED", checkout });
   }`;

export const DIFF_DOC_UPDATE = `diff --git a/README.md b/README.md
index 4a1e9b2..5b2f8c3 100644
--- a/README.md
+++ b/README.md
@@ -10,6 +10,16 @@
 # AI Change Impact Engine
 
 High-assurance AST symbol extraction and reverse reachability blast-radius traversal.
+
+## Quick Start
+\`\`\`bash
+# Install dependencies
+pip install -r requirements.txt
+# Launch intelligence service
+uvicorn main:app --host 0.0.0.0 --port 8000
+\`\`\`
+
+Documentation updated for v1.0.0 release.`;

// --- Scenario 2: Internal Logic Bugfix Report ---
export const LOGIC_DISCOUNT_REPORT: FullAnalysisReport = {
  analysis_id: "analysis_logic_discount_7c3b",
  repository_id: "repo-ecommerce-services",
  pr_number: 144,
  created_at: new Date().toISOString(),
  summary: {
    risk_score: 24,
    risk_level: "LOW",
    total_files_changed: 1,
    total_changed_symbols: 1,
    breaking_candidates_count: 0,
    direct_impact_count: 1,
    transitive_impact_count: 0,
    total_impacted_count: 1,
    recommended_test_count: 1,
    test_reduction_ratio: 0.667,
  },
  changed_symbols: [
    {
      entity_id: "services/coupon_validator.py::CouponValidator.validate_discount",
      qualified_name: "CouponValidator.validate_discount",
      entity_type: "METHOD",
      file_path: "services/coupon_validator.py",
      change_nature: "BODY_MODIFIED",
      is_exported: true,
      is_breaking_candidate: false,
      diff_lines_intersected: [29, 30],
      location: {
        start_line: 26,
        end_line: 35,
        start_col: 4,
        end_col: 18,
      },
    },
  ],
  blast_radius: {
    changed_symbol_ids: ["services/coupon_validator.py::CouponValidator.validate_discount"],
    direct_impact_count: 1,
    transitive_impact_count: 0,
    total_impacted_count: 1,
    max_depth_reached: 1,
    impacted_entities: [
      {
        entity_id: "services/cart_service.py::CartService.apply_coupon",
        qualified_name: "CartService.apply_coupon",
        entity_type: "METHOD",
        file_path: "services/cart_service.py",
        impact_type: "DIRECT",
        depth: 1,
        causal_path: [
          "services/coupon_validator.py::CouponValidator.validate_discount",
          "services/cart_service.py::CartService.apply_coupon",
        ],
        confidence: 0.98,
      },
    ],
    subgraph_nodes: [
      {
        id: "services/coupon_validator.py::CouponValidator.validate_discount",
        label: "CouponValidator.validate_discount",
        file_path: "services/coupon_validator.py",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "services/cart_service.py::CartService.apply_coupon",
        label: "CartService.apply_coupon",
        file_path: "services/cart_service.py",
        entity_type: "METHOD",
        is_exported: true,
      },
    ],
    subgraph_edges: [
      {
        source_id: "services/cart_service.py::CartService.apply_coupon",
        target_id: "services/coupon_validator.py::CouponValidator.validate_discount",
        relation_type: "CALLS",
        confidence: 0.98,
        is_dynamic: false,
      },
    ],
    unresolved_calls: [],
  },
  risk_report: {
    risk_score: 24,
    risk_level: "LOW",
    factors: [
      {
        factor_id: "SIGNATURE_BREAKING",
        name: "Public API & Signature Volatility",
        weight: 30,
        raw_value: 0.0,
        contribution_points: 0,
        evidence: "Internal method body modification only; signature preserved.",
      },
      {
        factor_id: "TRANSITIVE_BLAST_RADIUS",
        name: "Transitive Reachability & Graph Depth",
        weight: 25,
        raw_value: 12.0,
        contribution_points: 3,
        evidence: "Contained to 1 direct caller (CartService.apply_coupon).",
      },
      {
        factor_id: "CO_CHANGE_CHURN",
        name: "Historical Defect Coupling & Churn",
        weight: 20,
        raw_value: 20.0,
        contribution_points: 4,
        evidence: "Moderate historical defect churn in coupon rules.",
      },
      {
        factor_id: "AUTHOR_OWNERSHIP_DIFFUSION",
        name: "Author Expertise & Ownership Dispersion",
        weight: 15,
        raw_value: 30.0,
        contribution_points: 5,
        evidence: "Authored by primary maintainer of pricing engine.",
      },
      {
        factor_id: "TEST_COVERAGE_GAP",
        name: "Historical Test Failure Probability",
        weight: 10,
        raw_value: 40.0,
        contribution_points: 4,
        evidence: "Existing tests/test_coupon.py directly covers validate_discount.",
      },
      {
        factor_id: "DIFF_CHURN_VOLUME",
        name: "Raw Code Churn & Surface Size",
        weight: 10,
        raw_value: 20.0,
        contribution_points: 8,
        evidence: "2 lines modified in single file.",
      },
    ],
    historical_signal: {
      is_available: true,
      commits_analyzed: 14,
      recent_bugfixes_count: 1,
      high_churn_files: ["services/coupon_validator.py"],
      co_changed_files: {
        "services/coupon_validator.py": ["services/cart_service.py"],
      },
      unavailability_reason: null,
    },
    test_plan: {
      total_repo_tests: 3,
      selected_tests_count: 1,
      test_reduction_ratio: 0.667,
      p1_count: 1,
      p2_count: 0,
      p3_count: 0,
      selected_tests: [
        {
          test_file_path: "tests/test_coupon.py",
          test_name: "test_validate_discount_zero_total",
          priority: "P1",
          rationale: "Direct unit coverage for modified CouponValidator.validate_discount logic.",
          target_entity_id: "services/coupon_validator.py::CouponValidator.validate_discount",
          path_distance: 0,
          confidence: 1.0,
        },
      ],
    },
    limitations: [],
  },
  test_plan: {
    total_repo_tests: 3,
    selected_tests_count: 1,
    test_reduction_ratio: 0.667,
    p1_count: 1,
    p2_count: 0,
    p3_count: 0,
    selected_tests: [
      {
        test_file_path: "tests/test_coupon.py",
        test_name: "test_validate_discount_zero_total",
        priority: "P1",
        rationale: "Direct unit coverage for modified CouponValidator.validate_discount logic.",
        target_entity_id: "services/coupon_validator.py::CouponValidator.validate_discount",
        path_distance: 0,
        confidence: 1.0,
      },
    ],
  },
  ai_explanation: {
    summary_markdown: `### Safe Internal Logic Bugfix
    
This PR resolves an edge-case boundary bug in **CouponValidator.validate_discount**. The method signature remains completely unchanged, meaning external API clients are unaffected. 

Only **CartService.apply_coupon** calls this routine directly, and the regression blast radius is fully contained.`,
    review_checklist: [
      "Confirm boundary condition where cart_total == 0 properly returns 0.0 without division errors.",
      "Run tests/test_coupon.py to confirm full regression coverage.",
    ],
    failure_modes: [
      "If rule.min_spend is negative or null, unexpected discount could be granted.",
    ],
    is_generated_by_llm: false,
  },
  limitations: [],
  metrics: {
    diff_parse_ms: 0.12,
    ast_parse_ms: 0.45,
    graph_build_ms: 0.68,
    traversal_ms: 0.15,
    risk_eval_ms: 0.35,
    ai_synthesis_ms: 0.22,
    total_duration_ms: 1.97,
  },
};

// --- Scenario 3: Multi-Service Cascading Checkout Refactor ---
export const CASCADE_CHECKOUT_REPORT: FullAnalysisReport = {
  analysis_id: "analysis_cascade_checkout_3f8a",
  repository_id: "repo-ecommerce-services",
  pr_number: 145,
  created_at: new Date().toISOString(),
  summary: {
    risk_score: 88,
    risk_level: "CRITICAL",
    total_files_changed: 3,
    total_changed_symbols: 3,
    breaking_candidates_count: 2,
    direct_impact_count: 3,
    transitive_impact_count: 4,
    total_impacted_count: 7,
    recommended_test_count: 3,
    test_reduction_ratio: 0.0,
  },
  changed_symbols: [
    {
      entity_id: "src/order_controller.ts::OrderController.handlePostOrder",
      qualified_name: "OrderController.handlePostOrder",
      entity_type: "METHOD",
      file_path: "src/order_controller.ts",
      change_nature: "SIGNATURE_MODIFIED",
      is_exported: true,
      is_breaking_candidate: true,
      diff_lines_intersected: [44, 45],
      location: {
        start_line: 40,
        end_line: 52,
        start_col: 2,
        end_col: 3,
      },
    },
    {
      entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
      qualified_name: "CheckoutService.executeCheckout",
      entity_type: "METHOD",
      file_path: "src/checkout_service.ts",
      change_nature: "SIGNATURE_MODIFIED",
      is_exported: true,
      is_breaking_candidate: true,
      diff_lines_intersected: [22],
      location: {
        start_line: 18,
        end_line: 38,
        start_col: 2,
        end_col: 3,
      },
    },
  ],
  blast_radius: {
    changed_symbol_ids: [
      "src/order_controller.ts::OrderController.handlePostOrder",
      "src/checkout_service.ts::CheckoutService.executeCheckout",
    ],
    direct_impact_count: 3,
    transitive_impact_count: 4,
    total_impacted_count: 7,
    max_depth_reached: 3,
    impacted_entities: [
      {
        entity_id: "src/api/routes.ts::registerOrderRoutes",
        qualified_name: "registerOrderRoutes",
        entity_type: "FUNCTION",
        file_path: "src/api/routes.ts",
        impact_type: "DIRECT",
        depth: 1,
        causal_path: ["src/order_controller.ts::OrderController.handlePostOrder", "src/api/routes.ts::registerOrderRoutes"],
        confidence: 1.0,
      },
      {
        entity_id: "src/services/inventory_client.ts::InventoryClient.reserveStock",
        qualified_name: "InventoryClient.reserveStock",
        entity_type: "METHOD",
        file_path: "src/services/inventory_client.ts",
        impact_type: "DIRECT",
        depth: 1,
        causal_path: ["src/order_controller.ts::OrderController.handlePostOrder", "src/services/inventory_client.ts::InventoryClient.reserveStock"],
        confidence: 0.95,
      },
      {
        entity_id: "src/services/payment_service.ts::PaymentService.processTransaction",
        qualified_name: "PaymentService.processTransaction",
        entity_type: "METHOD",
        file_path: "src/services/payment_service.ts",
        impact_type: "DIRECT",
        depth: 1,
        causal_path: ["src/checkout_service.ts::CheckoutService.executeCheckout", "src/services/payment_service.ts::PaymentService.processTransaction"],
        confidence: 1.0,
      },
      {
        entity_id: "src/workers/webhook_dispatcher.ts::dispatchOrderCreated",
        qualified_name: "dispatchOrderCreated",
        entity_type: "FUNCTION",
        file_path: "src/workers/webhook_dispatcher.ts",
        impact_type: "TRANSITIVE",
        depth: 2,
        causal_path: [
          "src/order_controller.ts::OrderController.handlePostOrder",
          "src/api/routes.ts::registerOrderRoutes",
          "src/workers/webhook_dispatcher.ts::dispatchOrderCreated",
        ],
        confidence: 0.9,
      },
      {
        entity_id: "src/analytics/event_publisher.ts::publishOrderMetrics",
        qualified_name: "publishOrderMetrics",
        entity_type: "FUNCTION",
        file_path: "src/analytics/event_publisher.ts",
        impact_type: "TRANSITIVE",
        depth: 2,
        causal_path: [
          "src/checkout_service.ts::CheckoutService.executeCheckout",
          "src/analytics/event_publisher.ts::publishOrderMetrics",
        ],
        confidence: 0.88,
      },
    ],
    subgraph_nodes: [
      {
        id: "src/order_controller.ts::OrderController.handlePostOrder",
        label: "OrderController.handlePostOrder",
        file_path: "src/order_controller.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        label: "CheckoutService.executeCheckout",
        file_path: "src/checkout_service.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/api/routes.ts::registerOrderRoutes",
        label: "registerOrderRoutes",
        file_path: "src/api/routes.ts",
        entity_type: "FUNCTION",
        is_exported: true,
      },
      {
        id: "src/services/inventory_client.ts::InventoryClient.reserveStock",
        label: "InventoryClient.reserveStock",
        file_path: "src/services/inventory_client.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/services/payment_service.ts::PaymentService.processTransaction",
        label: "PaymentService.processTransaction",
        file_path: "src/services/payment_service.ts",
        entity_type: "METHOD",
        is_exported: true,
      },
      {
        id: "src/workers/webhook_dispatcher.ts::dispatchOrderCreated",
        label: "dispatchOrderCreated",
        file_path: "src/workers/webhook_dispatcher.ts",
        entity_type: "FUNCTION",
        is_exported: true,
      },
      {
        id: "src/analytics/event_publisher.ts::publishOrderMetrics",
        label: "publishOrderMetrics",
        file_path: "src/analytics/event_publisher.ts",
        entity_type: "FUNCTION",
        is_exported: true,
      },
    ],
    subgraph_edges: [
      {
        source_id: "src/api/routes.ts::registerOrderRoutes",
        target_id: "src/order_controller.ts::OrderController.handlePostOrder",
        relation_type: "CALLS",
        confidence: 1.0,
        is_dynamic: false,
      },
      {
        source_id: "src/order_controller.ts::OrderController.handlePostOrder",
        target_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        relation_type: "CALLS",
        confidence: 1.0,
        is_dynamic: false,
      },
      {
        source_id: "src/order_controller.ts::OrderController.handlePostOrder",
        target_id: "src/services/inventory_client.ts::InventoryClient.reserveStock",
        relation_type: "CALLS",
        confidence: 0.95,
        is_dynamic: false,
      },
      {
        source_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        target_id: "src/services/payment_service.ts::PaymentService.processTransaction",
        relation_type: "CALLS",
        confidence: 1.0,
        is_dynamic: false,
      },
      {
        source_id: "src/api/routes.ts::registerOrderRoutes",
        target_id: "src/workers/webhook_dispatcher.ts::dispatchOrderCreated",
        relation_type: "CALLS",
        confidence: 0.9,
        is_dynamic: false,
      },
      {
        source_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        target_id: "src/analytics/event_publisher.ts::publishOrderMetrics",
        relation_type: "CALLS",
        confidence: 0.88,
        is_dynamic: false,
      },
    ],
    unresolved_calls: [],
  },
  risk_report: {
    risk_score: 88,
    risk_level: "CRITICAL",
    factors: [
      {
        factor_id: "SIGNATURE_BREAKING",
        name: "Public API & Signature Volatility",
        weight: 30,
        raw_value: 95.0,
        contribution_points: 28,
        evidence: "Multiple public methods altered with new required parameters.",
      },
      {
        factor_id: "TRANSITIVE_BLAST_RADIUS",
        name: "Transitive Reachability & Graph Depth",
        weight: 25,
        raw_value: 90.0,
        contribution_points: 23,
        evidence: "Cascading dependency graph spans 7 callers across 3 microservices.",
      },
      {
        factor_id: "CO_CHANGE_CHURN",
        name: "Historical Defect Coupling & Churn",
        weight: 20,
        raw_value: 80.0,
        contribution_points: 16,
        evidence: "High historical defect coupling between order_controller and checkout_service.",
      },
      {
        factor_id: "AUTHOR_OWNERSHIP_DIFFUSION",
        name: "Author Expertise & Ownership Dispersion",
        weight: 15,
        raw_value: 65.0,
        contribution_points: 10,
        evidence: "Change touches components with 4 distinct code owners.",
      },
      {
        factor_id: "TEST_COVERAGE_GAP",
        name: "Historical Test Failure Probability",
        weight: 10,
        raw_value: 70.0,
        contribution_points: 7,
        evidence: "Distributed saga reservation lacks comprehensive end-to-end integration tests.",
      },
      {
        factor_id: "DIFF_CHURN_VOLUME",
        name: "Raw Code Churn & Surface Size",
        weight: 10,
        raw_value: 40.0,
        contribution_points: 4,
        evidence: "3 files with cross-boundary structural mutations.",
      },
    ],
    historical_signal: {
      is_available: true,
      commits_analyzed: 38,
      recent_bugfixes_count: 5,
      high_churn_files: ["src/order_controller.ts", "src/checkout_service.ts"],
      co_changed_files: {
        "src/order_controller.ts": ["src/checkout_service.ts", "src/services/inventory_client.ts"],
      },
      unavailability_reason: null,
    },
    test_plan: {
      total_repo_tests: 3,
      selected_tests_count: 3,
      test_reduction_ratio: 0.0,
      p1_count: 2,
      p2_count: 1,
      p3_count: 0,
      selected_tests: [
        {
          test_file_path: "tests/test_order_controller.py",
          test_name: "test_post_order_saga_flow",
          priority: "P1",
          rationale: "Direct coverage for modified OrderController.handlePostOrder signature.",
          target_entity_id: "src/order_controller.ts::OrderController.handlePostOrder",
          path_distance: 0,
          confidence: 1.0,
        },
        {
          test_file_path: "tests/test_checkout_service.py",
          test_name: "test_checkout_with_inventory_reservation",
          priority: "P1",
          rationale: "Direct coverage for modified CheckoutService.executeCheckout.",
          target_entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
          path_distance: 0,
          confidence: 1.0,
        },
        {
          test_file_path: "tests/test_payment_service.py",
          test_name: "test_payment_transaction_downstream",
          priority: "P2",
          rationale: "Transitive downstream validation for payment gateway invocation.",
          target_entity_id: "src/services/payment_service.ts::PaymentService.processTransaction",
          path_distance: 1,
          confidence: 0.95,
        },
      ],
    },
    limitations: [],
  },
  test_plan: {
    total_repo_tests: 3,
    selected_tests_count: 3,
    test_reduction_ratio: 0.0,
    p1_count: 2,
    p2_count: 1,
    p3_count: 0,
    selected_tests: [
      {
        test_file_path: "tests/test_order_controller.py",
        test_name: "test_post_order_saga_flow",
        priority: "P1",
        rationale: "Direct coverage for modified OrderController.handlePostOrder signature.",
        target_entity_id: "src/order_controller.ts::OrderController.handlePostOrder",
        path_distance: 0,
        confidence: 1.0,
      },
      {
        test_file_path: "tests/test_checkout_service.py",
        test_name: "test_checkout_with_inventory_reservation",
        priority: "P1",
        rationale: "Direct coverage for modified CheckoutService.executeCheckout.",
        target_entity_id: "src/checkout_service.ts::CheckoutService.executeCheckout",
        path_distance: 0,
        confidence: 1.0,
      },
      {
        test_file_path: "tests/test_payment_service.py",
        test_name: "test_payment_transaction_downstream",
        priority: "P2",
        rationale: "Transitive downstream validation for payment gateway invocation.",
        target_entity_id: "src/services/payment_service.ts::PaymentService.processTransaction",
        path_distance: 1,
        confidence: 0.95,
      },
    ],
  },
  ai_explanation: {
    summary_markdown: `### 🚨 Critical Risk: Distributed Cross-Service Refactor
    
This PR introduces a distributed saga reservation pattern spanning **OrderController**, **CheckoutService**, and **InventoryClient**. Two core public method signatures were mutated, cascading down to **7 dependent functions and workers**.

Zero test avoidance is possible for this change; the entire regression test suite must be triggered to prevent checkout outages.`,
    review_checklist: [
      "Verify distributed transaction rollback when InventoryClient.reserveStock fails.",
      "Ensure idempotency keys are passed through CheckoutService to avoid double-charging.",
      "Check that asynchronous webhook_dispatcher handles potential latency spikes.",
      "Validate API gateway backward compatibility with mobile and web clients.",
    ],
    failure_modes: [
      "Deadlock in inventory reservation under high concurrent load.",
      "Unhandled promise rejection if lockId expires before payment completes.",
    ],
    is_generated_by_llm: true,
  },
  limitations: [
    "Dynamically bound external microservice HTTP routes may require manual contract verification.",
  ],
  metrics: {
    diff_parse_ms: 0.42,
    ast_parse_ms: 1.15,
    graph_build_ms: 2.14,
    traversal_ms: 0.82,
    risk_eval_ms: 0.76,
    ai_synthesis_ms: 1.25,
    total_duration_ms: 6.54,
  },
};

// --- Comprehensive Scenario Preset Registry ---

import { ScenarioPreset } from "../types/analysis";

export const ALL_SCENARIOS: ScenarioPreset[] = [
  {
    id: "breaking_payment",
    name: "Breaking Public API Signature",
    category: "breaking",
    badge: "HIGH RISK (78/100)",
    badgeColor: "rose",
    prTitle: "refactor(payment): add required currencyISO parameter to processTransaction",
    prNumber: 142,
    branch: "feat/payment-currency",
    baseBranch: "main",
    author: {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      handle: "arivera",
    },
    commitSha: "e4f88c9",
    rawDiff: DIFF_BREAKING_PAYMENT,
    report: ECOMMERCE_BENCHMARK_REPORT,
  },
  {
    id: "logic_discount",
    name: "Internal Logic Bugfix",
    category: "logic",
    badge: "LOW RISK (24/100)",
    badgeColor: "amber",
    prTitle: "fix(coupon): add boundary condition validation in discount rule calculation",
    prNumber: 144,
    branch: "fix/coupon-zero-boundary",
    baseBranch: "main",
    author: {
      name: "David Kim",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      handle: "dkim-dev",
    },
    commitSha: "b3f91a2",
    rawDiff: DIFF_LOGIC_DISCOUNT,
    report: LOGIC_DISCOUNT_REPORT,
  },
  {
    id: "cascade_checkout",
    name: "Multi-Service Cascade Flow",
    category: "cascade",
    badge: "CRITICAL RISK (88/100)",
    badgeColor: "purple",
    prTitle: "feat(order): implement distributed saga inventory lock in checkout pipeline",
    prNumber: 145,
    branch: "feat/distributed-checkout-saga",
    baseBranch: "main",
    author: {
      name: "Elena Rostova",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
      handle: "erostova",
    },
    commitSha: "9f4c2d1",
    rawDiff: DIFF_CASCADE_CHECKOUT,
    report: CASCADE_CHECKOUT_REPORT,
  },
  {
    id: "doc_update",
    name: "Documentation & Spec Chore",
    category: "docs",
    badge: "ZERO RISK (6/100)",
    badgeColor: "emerald",
    prTitle: "docs: update architecture overview and quickstart instructions",
    prNumber: 143,
    branch: "docs/quickstart-v1",
    baseBranch: "main",
    author: {
      name: "Marcus Vance",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      handle: "mvance",
    },
    commitSha: "a1c70e1",
    rawDiff: DIFF_DOC_UPDATE,
    report: DOC_UPDATE_REPORT,
  },
];
