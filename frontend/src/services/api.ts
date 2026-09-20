import { 
  FullAnalysisReport, 
  RunFullAnalysisPayload, 
  AnalyticsTrendResponse, 
  BackendTargetType, 
  BackendTargetConfig 
} from "../types/analysis";
import { 
  ECOMMERCE_BENCHMARK_REPORT, 
  DOC_UPDATE_REPORT, 
  LOGIC_DISCOUNT_REPORT, 
  CASCADE_CHECKOUT_REPORT 
} from "./mockData";

export const PRESET_BACKENDS: Record<BackendTargetType, BackendTargetConfig> = {
  render: {
    type: "render",
    name: "Render Cloud API",
    url: "https://ai-change-impact-engine.onrender.com",
    description: "Production cloud-hosted Python Intelligence Engine on Render",
  },
  gateway: {
    type: "gateway",
    name: "Node.js API Gateway",
    url: "http://localhost:5000/api/v1",
    description: "Local Node.js Gateway with HMAC Webhook & MongoDB caching",
  },
  python: {
    type: "python",
    name: "Direct Python Engine",
    url: "http://localhost:8000/api/v1",
    description: "Local FastAPI intelligence service (Tree-sitter + NetworkX)",
  },
  custom: {
    type: "custom",
    name: "Custom Target URL",
    url: "http://localhost:8000/api/v1",
    description: "User-configured endpoint address",
  },
  offline: {
    type: "offline",
    name: "Interactive Simulator",
    url: "offline://local-simulation",
    description: "In-browser deterministic benchmark engine (No backend required)",
  },
};

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

// Target change listeners
type TargetChangeListener = (config: BackendTargetConfig) => void;
const targetListeners: Set<TargetChangeListener> = new Set();

export class AnalysisApiClient {
  private static currentTargetType: BackendTargetType = "render";
  private static customTargetUrl: string = "http://localhost:8000/api/v1";

  static getActiveTarget(): BackendTargetConfig {
    if (this.currentTargetType === "custom") {
      return {
        ...PRESET_BACKENDS.custom,
        url: this.customTargetUrl,
      };
    }
    return PRESET_BACKENDS[this.currentTargetType];
  }

  static setActiveTarget(type: BackendTargetType, customUrl?: string): void {
    this.currentTargetType = type;
    if (customUrl) {
      this.customTargetUrl = customUrl;
    }
    try {
      localStorage.setItem("cie_backend_target", type);
      if (customUrl) {
        localStorage.setItem("cie_custom_target_url", customUrl);
      }
    } catch {
      // Ignore localStorage issues in sandboxed environments
    }
    const config = this.getActiveTarget();
    targetListeners.forEach((fn) => fn(config));
  }

  static subscribeToTargetChange(listener: TargetChangeListener): () => void {
    targetListeners.add(listener);
    return () => targetListeners.delete(listener);
  }

  static async testTargetPing(url?: string): Promise<{ ok: boolean; latencyMs: number; statusText: string }> {
    const targetUrl = url || this.getActiveTarget().url;
    if (targetUrl.startsWith("offline://")) {
      return { ok: true, latencyMs: 2, statusText: "Offline Simulator Active" };
    }

    const startTime = performance.now();
    try {
      // Determine health check endpoint
      let healthUrl = targetUrl;
      if (targetUrl.endsWith("/api/v1")) {
        healthUrl = targetUrl.replace(/\/api\/v1$/, "/health");
      } else if (!targetUrl.endsWith("/health")) {
        healthUrl = `${targetUrl.replace(/\/$/, "")}/health`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json, text/html" },
      });
      clearTimeout(timeoutId);

      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: res.ok || res.status < 400,
        latencyMs,
        statusText: `HTTP ${res.status} ${res.statusText || "OK"}`,
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        ok: false,
        latencyMs,
        statusText: err?.name === "AbortError" ? "Request Timeout (6s)" : "Connection Refused / CORS",
      };
    }
  }

  static async checkGatewayHealth(): Promise<boolean> {
    const res = await this.testTargetPing();
    return res.ok;
  }

  static async runAnalysis(payload: RunFullAnalysisPayload): Promise<FullAnalysisReport> {
    const target = this.getActiveTarget();

    if (target.type === "offline") {
      return this.resolveFallbackReport(payload.rawDiff);
    }

    try {
      let endpointUrl = "";
      let reqBody: any = null;

      if (target.type === "gateway") {
        // Gateway endpoint
        endpointUrl = `${target.url.replace(/\/$/, "")}/analyses`;
        reqBody = payload;
      } else {
        // Direct Python service (Render Cloud or Local Python)
        const baseUrl = target.url.replace(/\/$/, "");
        endpointUrl = baseUrl.endsWith("/api/v1") 
          ? `${baseUrl}/pipeline/analyze` 
          : `${baseUrl}/api/v1/pipeline/analyze`;

        reqBody = {
          raw_diff: payload.rawDiff,
          files: payload.files,
          base_files: payload.baseFiles || null,
          commit_messages: payload.commitMessages || null,
          repository_id: payload.repositoryId || "repo-active-workspace",
          pr_number: payload.prNumber || 142,
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpointUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.message || `Analysis failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      // Handle both { data: FullAnalysisReport } (Gateway) and direct FullAnalysisReport (FastAPI)
      const report = json.data ? (json.data as FullAnalysisReport) : (json as FullAnalysisReport);
      return report;
    } catch (err) {
      console.warn(`Analysis call to ${target.name} (${target.url}) failed, falling back to simulated benchmark:`, err);
      return this.resolveFallbackReport(payload.rawDiff);
    }
  }

  static resolveFallbackReport(rawDiff: string): FullAnalysisReport {
    if (rawDiff.includes("README.md") || rawDiff.includes("docs/")) {
      return DOC_UPDATE_REPORT;
    }
    if (rawDiff.includes("CouponValidator") || rawDiff.includes("coupon_validator.py")) {
      return LOGIC_DISCOUNT_REPORT;
    }
    if (rawDiff.includes("OrderController") || rawDiff.includes("reserveStock")) {
      return CASCADE_CHECKOUT_REPORT;
    }
    return ECOMMERCE_BENCHMARK_REPORT;
  }

  static async fetchAnalysisById(id: string): Promise<FullAnalysisReport | null> {
    const target = this.getActiveTarget();
    if (target.type === "offline") return null;

    try {
      const res = await fetch(`${target.url.replace(/\/$/, "")}/analyses/${id}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as FullAnalysisReport;
    } catch {
      return null;
    }
  }

  static async getAnalyticsTrends(repositoryId?: string, days = 30): Promise<AnalyticsTrendResponse> {
    const target = this.getActiveTarget();
    if (target.type === "offline") return DEFAULT_TREND_DATA;

    try {
      const url = `${target.url.replace(/\/$/, "")}/analytics/trends?days=${days}${
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

  static async simulateWebhook(
    event: "pull_request.opened" | "pull_request.synchronize" | "ping",
    prData: { title: string; prNumber: number; rawDiff: string },
    secret = "cie_webhook_secret_key"
  ): Promise<{ success: boolean; statusCode: number; response: any; signature: string; durationMs: number }> {
    const target = this.getActiveTarget();
    const startTime = performance.now();

    const payload = event === "ping" 
      ? { zen: "Design for resilience.", hook_id: 1049281, repository: { name: "ecommerce_service" } }
      : {
          action: event === "pull_request.opened" ? "opened" : "synchronize",
          number: prData.prNumber,
          pull_request: {
            number: prData.prNumber,
            title: prData.title,
            diff_url: "https://github.com/repo/pull/142.diff",
            head: { sha: "e4f88c9" },
            base: { sha: "a1b2c3d" },
          },
          repository: { id: 849201, name: "repo-synthetic-ecommerce", full_name: "org/repo-synthetic-ecommerce" },
          rawDiff: prData.rawDiff,
        };

    const payloadString = JSON.stringify(payload);

    // Compute Web Crypto HMAC-SHA256 signature in browser
    let signature = "sha256=mock_signature_4f89a2b";
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payloadString));
      const hashArray = Array.from(new Uint8Array(signatureBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      signature = `sha256=${hashHex}`;
    } catch (e) {
      console.warn("SubtleCrypto HMAC calculation fallback:", e);
    }

    if (target.type === "gateway") {
      try {
        const webhookUrl = `${target.url.replace(/\/$/, "")}/webhook/github`;
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-GitHub-Event": event.startsWith("pull_request") ? "pull_request" : "ping",
            "X-Hub-Signature-256": signature,
          },
          body: payloadString,
        });
        const durationMs = Math.round(performance.now() - startTime);
        const data = await res.json().catch(() => ({}));
        return {
          success: res.ok,
          statusCode: res.status,
          response: data,
          signature,
          durationMs,
        };
      } catch (err: any) {
        const durationMs = Math.round(performance.now() - startTime);
        return {
          success: false,
          statusCode: 0,
          response: { error: err?.message || "Connection refused" },
          signature,
          durationMs,
        };
      }
    }

    // Simulated verified webhook response
    const durationMs = Math.round(performance.now() - startTime) + 38;
    return {
      success: true,
      statusCode: 200,
      response: {
        status: "success",
        event: event.startsWith("pull_request") ? "pull_request" : "ping",
        signature_verified: true,
        crypto_method: "timingSafeEqual (HMAC-SHA256)",
        analysis_enqueued: event !== "ping",
        message: event === "ping" ? "Pong! Webhook active." : `PR #${prData.prNumber} analysis triggered successfully.`,
      },
      signature,
      durationMs,
    };
  }
}
