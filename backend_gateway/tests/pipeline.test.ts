import request from "supertest";
import { createApp } from "../src/app.js";
import { recentAnalysesCache } from "../src/routes/analysis.routes.js";
import { FullAnalysisReport } from "../src/services/intelligenceClient.js";

const app = createApp();

describe("Master Analysis Pipeline API Gateway", () => {
  it("POST /api/v1/analyses should reject missing rawDiff and files with 400", async () => {
    const res = await request(app).post("/api/v1/analyses").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/analyses should reject empty files dictionary with 400", async () => {
    const res = await request(app).post("/api/v1/analyses").send({
      rawDiff: "diff --git a/a.ts b/a.ts",
      files: {},
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/v1/analyses should accept valid payload structure through validation", async () => {
    const res = await request(app)
      .post("/api/v1/analyses")
      .send({
        repositoryId: "test-repo",
        prNumber: 101,
        rawDiff: "diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,1 +1,1 @@\n-export const a = 1;\n+export const a = 2;\n",
        files: {
          "src/index.ts": "export const a = 2;\n",
        },
      });
    // Passes Zod validation layer (status will be 201 if intelligence service is running or 500/503 if disconnected)
    expect(res.status).not.toBe(400);
  });

  it("GET /api/v1/analyses/:id should return 404 for unknown analysis ID", async () => {
    const res = await request(app).get("/api/v1/analyses/unknown_analysis_999");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/analyses/:id should return cached analysis report when present", async () => {
    const mockReport: FullAnalysisReport = {
      analysis_id: "analysis_test_cache_123",
      repository_id: "test-repo",
      pr_number: 1,
      summary: {
        risk_score: 45,
        risk_level: "MEDIUM",
        total_files_changed: 1,
        total_changed_symbols: 1,
        breaking_candidates_count: 0,
        direct_impact_count: 1,
        transitive_impact_count: 0,
        total_impacted_count: 1,
        recommended_test_count: 1,
        test_reduction_ratio: 0.5,
      },
      changed_symbols: [],
      blast_radius: {
        changed_symbol_ids: [],
        direct_impact_count: 1,
        transitive_impact_count: 0,
        total_impacted_count: 1,
        max_depth_reached: 1,
        impacted_entities: [],
        subgraph_nodes: [],
        subgraph_edges: [],
        unresolved_calls: [],
      },
      risk_report: {
        risk_score: 45,
        risk_level: "MEDIUM",
        factors: [],
        historical_signal: {
          is_available: false,
          commits_analyzed: 0,
          recent_bugfixes_count: 0,
          high_churn_files: [],
          co_changed_files: {},
        },
        test_plan: {
          total_repo_tests: 2,
          selected_tests_count: 1,
          test_reduction_ratio: 0.5,
          p1_count: 1,
          p2_count: 0,
          p3_count: 0,
          selected_tests: [],
        },
        limitations: [],
      },
      test_plan: {
        total_repo_tests: 2,
        selected_tests_count: 1,
        test_reduction_ratio: 0.5,
        p1_count: 1,
        p2_count: 0,
        p3_count: 0,
        selected_tests: [],
      },
      ai_explanation: {
        summary_markdown: "Test summary",
        review_checklist: ["Check test"],
        failure_modes: ["None"],
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
    };

    recentAnalysesCache.set("analysis_test_cache_123", mockReport);

    const res = await request(app).get("/api/v1/analyses/analysis_test_cache_123");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.analysis_id).toBe("analysis_test_cache_123");
    expect(res.body.data.summary.risk_score).toBe(45);
  });

  it("GET /api/v1/analyses/:id/stream should stream Server-Sent Events", async () => {
    const res = await request(app).get("/api/v1/analyses/analysis_stream_test/stream");
    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("data: ");
    expect(res.text).toContain("progress");
  });
});
