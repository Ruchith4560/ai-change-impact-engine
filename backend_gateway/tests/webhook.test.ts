import request from "supertest";
import crypto from "crypto";
import { createApp } from "../src/app.js";
import { config } from "../src/config/index.js";
import { verifyGitHubHmac } from "../src/routes/webhook.routes.js";
import { intelligenceClient } from "../src/services/intelligenceClient.js";

const app = createApp();

function generateSignature(payload: object | string, secret: string): string {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret).update(content).digest("hex");
  return `sha256=${hmac}`;
}

describe("GitHub Webhook Ingestion & Cryptographic Verification", () => {
  const testSecret = config.GITHUB_WEBHOOK_SECRET;

  describe("verifyGitHubHmac pure helper", () => {
    it("should reject missing signature header", () => {
      const res = verifyGitHubHmac("test body", undefined, testSecret);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("Missing");
    });

    it("should reject invalid signature format missing sha256= prefix", () => {
      const res = verifyGitHubHmac("test body", "invalidprefix12345", testSecret);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("sha256=");
    });

    it("should reject mismatched HMAC signature", () => {
      const fakeSig = "sha256=" + "a".repeat(64);
      const res = verifyGitHubHmac("test body", fakeSig, testSecret);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("mismatch");
    });

    it("should accept authentic HMAC signature", () => {
      const payload = JSON.stringify({ action: "opened", number: 42 });
      const validSig = generateSignature(payload, testSecret);
      const res = verifyGitHubHmac(payload, validSig, testSecret);
      expect(res.valid).toBe(true);
      expect(res.reason).toBeUndefined();
    });
  });

  describe("POST /api/v1/webhooks/github HTTP endpoint", () => {
    it("should reject webhook request without signature with 401", async () => {
      const res = await request(app)
        .post("/api/v1/webhooks/github")
        .set("x-github-event", "ping")
        .send({ zen: "Responsive is better than fast." });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain("Unauthorized");
    });

    it("should reject webhook request with corrupted signature with 401", async () => {
      const payload = { zen: "Responsive is better than fast." };
      const badSig = "sha256=" + "b".repeat(64);

      const res = await request(app)
        .post("/api/v1/webhooks/github")
        .set("x-github-event", "ping")
        .set("x-hub-signature-256", badSig)
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should successfully respond to authentic 'ping' event", async () => {
      const payload = { hook_id: 123456, zen: "Practicality beats purity." };
      const rawString = JSON.stringify(payload);
      const validSig = generateSignature(rawString, testSecret);

      const res = await request(app)
        .post("/api/v1/webhooks/github")
        .set("x-github-event", "ping")
        .set("x-hub-signature-256", validSig)
        .set("content-type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("PONG");
      expect(res.body.hook_id).toBe(123456);
    });

    it("should successfully process authentic 'pull_request' opened event", async () => {
      // Mock intelligenceClient.runFullAnalysis to avoid needing live python daemon in unit test
      jest.spyOn(intelligenceClient, "runFullAnalysis").mockResolvedValueOnce({
        analysis_id: "webhook-test-an-01",
        repository_id: "acme/ecommerce",
        pr_number: 42,
        summary: {
          risk_score: 65,
          risk_level: "HIGH",
          total_files_changed: 1,
          total_changed_symbols: 1,
          breaking_candidates_count: 1,
          direct_impact_count: 2,
          transitive_impact_count: 1,
          total_impacted_count: 3,
          recommended_test_count: 2,
          test_reduction_ratio: 0.33,
        },
        changed_symbols: [],
        blast_radius: {
          changed_symbol_ids: [],
          direct_impact_count: 2,
          transitive_impact_count: 1,
          total_impacted_count: 3,
          max_depth_reached: 2,
          impacted_entities: [],
          subgraph_nodes: [],
          subgraph_edges: [],
          unresolved_calls: [],
        },
        risk_report: {
          risk_score: 65,
          risk_level: "HIGH",
          factors: [],
          historical_signal: {
            is_available: false,
            commits_analyzed: 0,
            recent_bugfixes_count: 0,
            high_churn_files: [],
            co_changed_files: {},
          },
          test_plan: {
            total_repo_tests: 3,
            selected_tests_count: 2,
            test_reduction_ratio: 0.33,
            p1_count: 1,
            p2_count: 1,
            p3_count: 0,
            selected_tests: [],
          },
          limitations: [],
        },
        test_plan: {
          total_repo_tests: 3,
          selected_tests_count: 2,
          test_reduction_ratio: 0.33,
          p1_count: 1,
          p2_count: 1,
          p3_count: 0,
          selected_tests: [],
        },
        ai_explanation: {
          summary_markdown: "PR 42 Analysis",
          review_checklist: [],
          failure_modes: [],
          is_generated_by_llm: false,
        },
        limitations: [],
        metrics: {
          diff_parse_ms: 1,
          ast_parse_ms: 2,
          graph_build_ms: 3,
          traversal_ms: 1,
          risk_eval_ms: 2,
          ai_synthesis_ms: 1,
          total_duration_ms: 10,
        },
        created_at: new Date().toISOString(),
      });

      const payload = {
        action: "opened",
        number: 42,
        repository: { full_name: "acme/ecommerce" },
        pull_request: {
          number: 42,
          title: "feat: add secure checkout token validation",
          head: { sha: "feedbeef123" },
          base: { sha: "base0000" },
        },
        files: {
          "src/checkout.ts": "export function checkout() {}",
        },
      };

      const rawString = JSON.stringify(payload);
      const validSig = generateSignature(rawString, testSecret);

      const res = await request(app)
        .post("/api/v1/webhooks/github")
        .set("x-github-event", "pull_request")
        .set("x-hub-signature-256", validSig)
        .set("content-type", "application/json")
        .send(rawString);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.analysis_id).toBe("webhook-test-an-01");
      expect(res.body.risk_level).toBe("HIGH");
      expect(res.body.risk_score).toBe(65);
      expect(res.body.tests_selected).toBe(2);
    });
  });
});
