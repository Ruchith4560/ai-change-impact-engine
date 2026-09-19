import { FullAnalysisReport, RunFullAnalysisPayload, AnalyticsTrendResponse } from "../types/analysis";
import { ECOMMERCE_BENCHMARK_REPORT, DOC_UPDATE_REPORT } from "./mockData";

const API_BASE = "http://localhost:5000/api/v1";

export const DEFAULT_TREND_DATA: AnalyticsTrendResponse = {
  repository_id: "ecommerce_service",
  total_analyses: 5,
  average_risk_score: 42,
  risk_distribution: {
    LOW: 2,
    MEDIUM: 2,
    HIGH: 1,
    CRITICAL: 0,
  },
  total_tests_executed: 7,
  total_tests_avoided: 8,
  ci_minutes_saved: 28,
  average_test_reduction_ratio: 0.53,
  top_hotspots: [
    { file: "services/cart_service.py", frequency: 4, avgRiskContribution: 55 },
    { file: "services/checkout_service.py", frequency: 3, avgRiskContribution: 45 },
    { file: "services/order_service.py", frequency: 2, avgRiskContribution: 30 },
    { file: "models/user.py", frequency: 2, avgRiskContribution: 25 },
    { file: "services/coupon_validator.py", frequency: 1, avgRiskContribution: 24 },
  ],
  time_series: [
    {
      date: "2026-09-05",
      pr_number: 98,
      title: "chore: update documentation and readme",
      commit_sha: "a1c70e1",
      risk_score: 6,
      risk_level: "LOW",
      impacted_count: 0,
      tests_selected: 0,
      tests_avoided: 3,
    },
    {
      date: "2026-09-08",
      pr_number: 99,
      title: "fix: add boundary check in discount voucher validator",
      commit_sha: "b3f91a2",
      risk_score: 24,
      risk_level: "LOW",
      impacted_count: 1,
      tests_selected: 1,
      tests_avoided: 2,
    },
    {
      date: "2026-09-12",
      pr_number: 100,
      title: "feat: add user notification preference toggles",
      commit_sha: "c8e23d4",
      risk_score: 48,
      risk_level: "MEDIUM",
      impacted_count: 3,
      tests_selected: 2,
      tests_avoided: 1,
    },
    {
      date: "2026-09-15",
      pr_number: 101,
      title: "refactor: optimize cart item serialization format",
      commit_sha: "d9e41b5",
      risk_score: 56,
      risk_level: "MEDIUM",
      impacted_count: 2,
      tests_selected: 2,
      tests_avoided: 1,
    },
    {
      date: "2026-09-18",
      pr_number: 102,
      title: "breaking: update CartService.add_item signature with currency",
      commit_sha: "e4f88c9",
      risk_score: 78,
      risk_level: "HIGH",
      impacted_count: 3,
      tests_selected: 2,
      tests_avoided: 1,
    },
  ],
};

export class AnalysisApiClient {
  static async checkGatewayHealth(): Promise<boolean> {
    try {
      const res = await fetch("http://localhost:5000/health", { method: "GET" });
      return res.ok;
    } catch {
      return false;
    }
  }

  static async runAnalysis(payload: RunFullAnalysisPayload): Promise<FullAnalysisReport> {
    try {
      const res = await fetch(`${API_BASE}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Analysis request failed with status ${res.status}`);
      }

      const json = await res.json();
      return json.data as FullAnalysisReport;
    } catch (err) {
      console.warn("API Gateway offline or unreachable, falling back to benchmark simulation:", err);
      // Fallback based on diff payload
      if (payload.rawDiff.includes("README.md")) {
        return DOC_UPDATE_REPORT;
      }
      return ECOMMERCE_BENCHMARK_REPORT;
    }
  }

  static async fetchAnalysisById(id: string): Promise<FullAnalysisReport | null> {
    try {
      const res = await fetch(`${API_BASE}/analyses/${id}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as FullAnalysisReport;
    } catch {
      return null;
    }
  }

  static async getAnalyticsTrends(repositoryId?: string, days = 30): Promise<AnalyticsTrendResponse> {
    try {
      const url = `${API_BASE}/analytics/trends?days=${days}${
        repositoryId ? `&repositoryId=${encodeURIComponent(repositoryId)}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Analytics fetch failed with status ${res.status}`);
      }
      const json = await res.json();
      return json.data as AnalyticsTrendResponse;
    } catch {
      return DEFAULT_TREND_DATA;
    }
  }

  static streamAnalysisProgress(
    analysisId: string,
    onProgress: (data: { stage: string; progress: number; report?: FullAnalysisReport }) => void,
    onComplete: () => void
  ): () => void {
    const eventSource = new EventSource(`${API_BASE}/analyses/${analysisId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onProgress(data);
        if (data.progress >= 100 || data.stage === "DONE" || data.stage === "COMPLETED") {
          eventSource.close();
          onComplete();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      onComplete();
    };

    return () => eventSource.close();
  }
}
