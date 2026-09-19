import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config/index.js";
import { intelligenceClient } from "../services/intelligenceClient.js";
import { analysisStore } from "../models/analysis.model.js";
import { recentAnalysesCache } from "./analysis.routes.js";
import { ApiError } from "../middleware/errorHandler.js";

export const webhookRouter = Router();

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates GitHub X-Hub-Signature-256 HMAC-SHA256 signature
 */
export function verifyGitHubHmac(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  secret: string
): WebhookVerificationResult {
  if (!signatureHeader) {
    return { valid: false, reason: "Missing X-Hub-Signature-256 header" };
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return { valid: false, reason: "Signature header must start with sha256=" };
  }

  const receivedDigest = signatureHeader.slice("sha256=".length);
  if (!receivedDigest || receivedDigest.length !== 64) {
    return { valid: false, reason: "Invalid digest length" };
  }

  const payload = Buffer.isBuffer(rawBody)
    ? rawBody
    : typeof rawBody === "string"
    ? Buffer.from(rawBody, "utf8")
    : Buffer.from(JSON.stringify(rawBody || {}), "utf8");

  const expectedDigest = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(receivedDigest, "hex"),
      Buffer.from(expectedDigest, "hex")
    );
    return { valid, reason: valid ? undefined : "HMAC digest mismatch" };
  } catch {
    return { valid: false, reason: "Malformed hexadecimal digest" };
  }
}

/**
 * Webhook Ingestion Route
 * POST /api/v1/webhooks/github
 */
webhookRouter.post(
  "/webhooks/github",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers["x-hub-signature-256"] as string | undefined;
      const event = (req.headers["x-github-event"] as string) || "pull_request";
      const rawBody = (req as any).rawBody || req.body;

      // 1. Verify Cryptographic Signature
      const verification = verifyGitHubHmac(rawBody, signature, config.GITHUB_WEBHOOK_SECRET);
      if (!verification.valid) {
        throw new ApiError(401, `Unauthorized webhook: ${verification.reason}`);
      }

      // 2. Handle 'ping' Event
      if (event === "ping") {
        res.status(200).json({
          success: true,
          message: "PONG: GitHub Webhook verified successfully",
          hook_id: req.body?.hook_id,
          zen: req.body?.zen || "Keep it logically awesome.",
        });
        return;
      }

      // 3. Handle 'pull_request' Event
      if (event === "pull_request") {
        const action = req.body?.action || "opened";
        const allowedActions = ["opened", "synchronize", "reopened", "ready_for_review"];

        if (!allowedActions.includes(action)) {
          res.status(200).json({
            success: true,
            message: `Event acknowledged but skipped action: ${action}`,
          });
          return;
        }

        const prData = req.body.pull_request || {};
        const repoData = req.body.repository || {};

        const repositoryId = repoData.full_name || repoData.name || "demo/repository";
        const prNumber = req.body.number || prData.number || 1;
        const commitSha = prData.head?.sha || "sha-" + Math.random().toString(36).substring(2, 8);
        const baseSha = prData.base?.sha || "base-sha";
        const title = prData.title || `PR #${prNumber}`;

        // Diffs & Files: Extracted from payload if provided (or fallback payload)
        const rawDiff =
          req.body.rawDiff ||
          req.body.diff ||
          `--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,3 +1,3 @@\n-export function run() {}\n+export function run(flag: boolean) {}\n`;

        const files = req.body.files || {
          "src/index.ts": "export function run(flag: boolean) {}",
        };
        const baseFiles = req.body.baseFiles;
        const commitMessages = req.body.commitMessages || [title];

        // 4. Run Analysis via Intelligence Client
        const report = await intelligenceClient.runFullAnalysis({
          repository_id: repositoryId,
          pr_number: prNumber,
          raw_diff: rawDiff,
          files,
          base_files: baseFiles,
          commit_messages: commitMessages,
        });

        // 5. Update Recent Caches & Persistent MongoDB Store
        recentAnalysesCache.set(report.analysis_id, report);

        await analysisStore.save({
          analysisId: report.analysis_id,
          repositoryId,
          prNumber,
          commitSha,
          baseSha,
          title,
          riskScore: report.summary.risk_score,
          riskLevel: (report.summary.risk_level as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") || "LOW",
          totalFilesChanged: report.summary.total_files_changed,
          totalAdditions: 0,
          totalDeletions: 0,
          impactedEntitiesCount: report.summary.total_impacted_count,
          maxDependencyDepth: report.blast_radius.max_depth_reached,
          testsSelectedCount: report.test_plan.selected_tests_count,
          totalTestsCount: report.test_plan.total_repo_tests,
          testReductionRatio: report.test_plan.test_reduction_ratio,
          breakingChangesCount: report.summary.breaking_candidates_count,
          report,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        res.status(201).json({
          success: true,
          event: "pull_request",
          action,
          repository: repositoryId,
          pr_number: prNumber,
          commit_sha: commitSha,
          analysis_id: report.analysis_id,
          risk_level: report.summary.risk_level,
          risk_score: report.summary.risk_score,
          impacted_count: report.summary.total_impacted_count,
          breaking_changes_count: report.summary.breaking_candidates_count,
          tests_selected: report.test_plan.selected_tests_count,
          test_reduction_ratio: report.test_plan.test_reduction_ratio,
        });
        return;
      }

      // Default fallback for any other events
      res.status(200).json({
        success: true,
        message: `Event '${event}' processed`,
      });
    } catch (err) {
      next(err);
    }
  }
);
