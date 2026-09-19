import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { intelligenceClient, FullAnalysisReport } from "../services/intelligenceClient.js";
import { ApiError } from "../middleware/errorHandler.js";

export const analysisRouter = Router();

const parseDiffSchema = z.object({
  rawDiff: z.string().min(1, "rawDiff cannot be empty"),
  repositoryId: z.string().optional(),
});

analysisRouter.post(
  "/diff/parse",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = parseDiffSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const diffResult = await intelligenceClient.parseDiff(parsedBody.data.rawDiff);

      res.json({
        success: true,
        data: diffResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

const parseFileSchema = z.object({
  filePath: z.string().min(1, "filePath is required"),
  content: z.string(),
});

analysisRouter.post(
  "/ast/parse-file",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = parseFileSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const astResult = await intelligenceClient.parseFile(
        parsedBody.data.filePath,
        parsedBody.data.content
      );

      res.json({
        success: true,
        data: astResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

const mapDiffSchema = z.object({
  rawDiff: z.string().min(1, "rawDiff is required"),
  filesContent: z.record(z.string()),
  baseFilesContent: z.record(z.string()).optional(),
});

analysisRouter.post(
  "/ast/map-diff",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = mapDiffSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const mapResult = await intelligenceClient.mapDiff(
        parsedBody.data.rawDiff,
        parsedBody.data.filesContent,
        parsedBody.data.baseFilesContent
      );

      res.json({
        success: true,
        data: mapResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

const buildGraphSchema = z.object({
  files: z.record(z.string()),
});

analysisRouter.post(
  "/graph/build",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = buildGraphSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const graphSummary = await intelligenceClient.buildGraph(parsedBody.data.files);

      res.json({
        success: true,
        data: graphSummary,
      });
    } catch (err) {
      next(err);
    }
  }
);

const blastRadiusSchema = z.object({
  files: z.record(z.string()),
  changedSymbolIds: z.array(z.string()).min(1, "changedSymbolIds cannot be empty"),
  maxDepth: z.number().int().min(1).max(25).optional(),
});

analysisRouter.post(
  "/graph/blast-radius",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = blastRadiusSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const report = await intelligenceClient.computeBlastRadius(
        parsedBody.data.files,
        parsedBody.data.changedSymbolIds,
        parsedBody.data.maxDepth
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

const evaluateRiskSchema = z.object({
  totalFilesChanged: z.number().int().default(0),
  totalAdditions: z.number().int().default(0),
  totalDeletions: z.number().int().default(0),
  breakingCandidatesCount: z.number().int().default(0),
  changedSymbolIds: z.array(z.string()).default([]),
  impactedEntitiesCount: z.number().int().default(0),
  maxDependencyDepth: z.number().int().default(0),
  impactedFilePaths: z.array(z.string()).optional(),
  repoFiles: z.record(z.string()).optional(),
  commitMessages: z.array(z.string()).optional(),
  coChangeMap: z.record(z.array(z.string())).optional(),
});

analysisRouter.post(
  "/risk/evaluate",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = evaluateRiskSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const riskReport = await intelligenceClient.evaluateRisk({
        total_files_changed: parsedBody.data.totalFilesChanged,
        total_additions: parsedBody.data.totalAdditions,
        total_deletions: parsedBody.data.totalDeletions,
        breaking_candidates_count: parsedBody.data.breakingCandidatesCount,
        changed_symbol_ids: parsedBody.data.changedSymbolIds,
        impacted_entities_count: parsedBody.data.impactedEntitiesCount,
        max_dependency_depth: parsedBody.data.maxDependencyDepth,
        impacted_file_paths: parsedBody.data.impactedFilePaths,
        repo_files: parsedBody.data.repoFiles,
        commit_messages: parsedBody.data.commitMessages,
        co_change_map: parsedBody.data.coChangeMap,
      });

      res.json({
        success: true,
        data: riskReport,
      });
    } catch (err) {
      next(err);
    }
  }
);

// In-memory cache for recent analyses
export const recentAnalysesCache = new Map<string, FullAnalysisReport>();

const fullAnalysisSchema = z.object({
  repositoryId: z.string().optional(),
  prNumber: z.number().int().optional(),
  rawDiff: z.string().min(1, "rawDiff is required"),
  files: z.record(z.string()).refine((f) => Object.keys(f).length > 0, {
    message: "files dictionary cannot be empty",
  }),
  baseFiles: z.record(z.string()).optional(),
  commitMessages: z.array(z.string()).optional(),
});

analysisRouter.post(
  "/analyses",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedBody = fullAnalysisSchema.safeParse(req.body);
      if (!parsedBody.success) {
        throw new ApiError(400, "Validation failed", parsedBody.error.format());
      }

      const report = await intelligenceClient.runFullAnalysis({
        repository_id: parsedBody.data.repositoryId,
        pr_number: parsedBody.data.prNumber,
        raw_diff: parsedBody.data.rawDiff,
        files: parsedBody.data.files,
        base_files: parsedBody.data.baseFiles,
        commit_messages: parsedBody.data.commitMessages,
      });

      recentAnalysesCache.set(report.analysis_id, report);

      res.status(201).json({
        success: true,
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
);

analysisRouter.get(
  "/analyses/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analysisId = req.params.id;
      const cached = recentAnalysesCache.get(analysisId);
      if (!cached) {
        throw new ApiError(404, `Analysis report '${analysisId}' not found`);
      }

      res.json({
        success: true,
        data: cached,
      });
    } catch (err) {
      next(err);
    }
  }
);

analysisRouter.get(
  "/analyses/:id/stream",
  (req: Request, res: Response): void => {
    const analysisId = req.params.id;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const report = recentAnalysesCache.get(analysisId);
    if (report) {
      res.write(`data: ${JSON.stringify({ stage: "COMPLETED", progress: 100, report })}\n\n`);
      res.end();
    } else {
      res.write(`data: ${JSON.stringify({ stage: "QUEUED", progress: 10 })}\n\n`);
      res.write(`data: ${JSON.stringify({ stage: "AST_PARSING", progress: 30 })}\n\n`);
      res.write(`data: ${JSON.stringify({ stage: "GRAPH_TRAVERSAL", progress: 60 })}\n\n`);
      res.write(`data: ${JSON.stringify({ stage: "RISK_SCORING", progress: 85 })}\n\n`);
      res.write(`data: ${JSON.stringify({ stage: "DONE", progress: 100 })}\n\n`);
      res.end();
    }
  }
);

