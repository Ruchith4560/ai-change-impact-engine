import { config } from "../config/index.js";
import { ApiError } from "../middleware/errorHandler.js";

export interface ChangedLine {
  old_line_no: number | null;
  new_line_no: number | null;
  change_type: "ADD" | "DELETE" | "CONTEXT";
  content: string;
}

export interface DiffHunk {
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  header: string;
  lines: ChangedLine[];
  modified_new_lines: number[];
  modified_old_lines: number[];
}

export interface ChangedFile {
  old_path: string | null;
  new_path: string;
  change_type: "ADDED" | "MODIFIED" | "DELETED" | "RENAMED";
  is_binary: boolean;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffAnalysisResult {
  total_files_changed: number;
  total_additions: number;
  total_deletions: number;
  files: ChangedFile[];
}

export interface SymbolLocation {
  start_line: number;
  end_line: number;
  start_col: number;
  end_col: number;
  start_byte: number;
  end_byte: number;
}

export interface CodeEntity {
  id: string;
  file_path: string;
  entity_type: string;
  name: string;
  qualified_name: string;
  parent_name?: string | null;
  location: SymbolLocation;
  signature?: string | null;
  is_exported: boolean;
  docstring?: string | null;
  parameters: string[];
  return_type?: string | null;
}

export interface ASTFileAnalysis {
  file_path: string;
  language: string;
  entities: CodeEntity[];
  imports: Array<{
    source_module: string;
    imported_names: string[];
    alias_map: Record<string, string>;
    line_no: number;
  }>;
  exports: string[];
  parse_errors: string[];
}

export interface ChangedSymbol {
  entity_id: string;
  qualified_name: string;
  entity_type: string;
  file_path: string;
  change_nature: "SIGNATURE_MODIFIED" | "BODY_MODIFIED" | "ADDED" | "DELETED" | "STRUCTURAL";
  is_exported: boolean;
  is_breaking_candidate: boolean;
  diff_lines_intersected: number[];
  location: SymbolLocation;
}

export interface DiffToASTResult {
  total_changed_symbols: number;
  breaking_candidates_count: number;
  changed_symbols: ChangedSymbol[];
  unmapped_lines_by_file: Record<string, number[]>;
}

export class IntelligenceClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.INTELLIGENCE_SERVICE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async checkHealth(): Promise<{ status: string; service: string; version: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) {
        throw new ApiError(res.status, "Intelligence service reported unhealthy status");
      }
      return (await res.json()) as { status: string; service: string; version: string };
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(503, "Intelligence service unavailable", err);
    }
  }

  async parseDiff(rawDiff: string): Promise<DiffAnalysisResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/diff/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_diff: rawDiff }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to parse diff");
      }

      return (await res.json()) as DiffAnalysisResult;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for diff parsing", err);
    }
  }

  async parseFile(filePath: string, content: string): Promise<ASTFileAnalysis> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/ast/parse-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, content }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to parse file AST");
      }

      return (await res.json()) as ASTFileAnalysis;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for file AST", err);
    }
  }

  async mapDiff(
    rawDiff: string,
    filesContent: Record<string, string>,
    baseFilesContent?: Record<string, string>
  ): Promise<DiffToASTResult> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/ast/map-diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_diff: rawDiff,
          files_content: filesContent,
          base_files_content: baseFilesContent,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to map diff to AST");
      }

      return (await res.json()) as DiffToASTResult;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for diff-to-AST mapping", err);
    }
  }

  async buildGraph(files: Record<string, string>): Promise<GraphSummaryResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/graph/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to build dependency graph");
      }

      return (await res.json()) as GraphSummaryResponse;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for graph construction", err);
    }
  }

  async computeBlastRadius(
    files: Record<string, string>,
    changedSymbolIds: string[],
    maxDepth: number = 10
  ): Promise<BlastRadiusReport> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/graph/blast-radius`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          changed_symbol_ids: changedSymbolIds,
          max_depth: maxDepth,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to compute blast radius");
      }

      return (await res.json()) as BlastRadiusReport;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for blast radius analysis", err);
    }
  }

  async evaluateRisk(payload: EvaluateRiskRequest): Promise<RiskReport> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/risk/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to evaluate change risk");
      }

      return (await res.json()) as RiskReport;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for risk evaluation", err);
    }
  }

  async runFullAnalysis(payload: RunFullAnalysisRequest): Promise<FullAnalysisReport> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/pipeline/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({ detail: "Unknown error" }))) as { detail?: string };
        throw new ApiError(res.status, errorData.detail || "Failed to execute complete analysis pipeline");
      }

      return (await res.json()) as FullAnalysisReport;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Failed to connect to Intelligence service for full analysis", err);
    }
  }
}

export interface GraphNode {
  id: string;
  label: string;
  file_path: string;
  entity_type: string;
  is_exported: boolean;
  metadata?: Record<string, string>;
}

export interface GraphEdge {
  source_id: string;
  target_id: string;
  relation_type: string;
  confidence: number;
  is_dynamic: boolean;
}

export interface ImpactedEntity {
  entity_id: string;
  qualified_name: string;
  entity_type: string;
  file_path: string;
  impact_type: "DIRECT" | "TRANSITIVE";
  depth: number;
  causal_path: string[];
  confidence: number;
}

export interface BlastRadiusReport {
  changed_symbol_ids: string[];
  direct_impact_count: number;
  transitive_impact_count: number;
  total_impacted_count: number;
  max_depth_reached: number;
  impacted_entities: ImpactedEntity[];
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
  unresolved_calls: string[];
}

export interface GraphSummaryResponse {
  total_nodes: number;
  total_edges: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  unresolved_calls: string[];
}

export interface RiskFactorContribution {
  factor_id: string;
  name: string;
  weight: number;
  raw_value: number;
  contribution_points: number;
  evidence: string;
}

export interface HistoricalSignal {
  is_available: boolean;
  commits_analyzed: number;
  recent_bugfixes_count: number;
  high_churn_files: string[];
  co_changed_files: Record<string, string[]>;
  unavailability_reason?: string | null;
}

export interface SelectedTest {
  test_file_path: string;
  test_name?: string | null;
  priority: "P1" | "P2" | "P3";
  rationale: string;
  target_entity_id?: string | null;
  path_distance: number;
  confidence: number;
}

export interface TestPlan {
  total_repo_tests: number;
  selected_tests_count: number;
  test_reduction_ratio: number;
  p1_count: number;
  p2_count: number;
  p3_count: number;
  selected_tests: SelectedTest[];
}

export interface RiskReport {
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  factors: RiskFactorContribution[];
  historical_signal: HistoricalSignal;
  test_plan: TestPlan;
  limitations: string[];
}

export interface EvaluateRiskRequest {
  total_files_changed: number;
  total_additions: number;
  total_deletions: number;
  breaking_candidates_count: number;
  changed_symbol_ids: string[];
  impacted_entities_count: number;
  max_dependency_depth: number;
  impacted_file_paths?: string[];
  repo_files?: Record<string, string>;
  commit_messages?: string[];
  co_change_map?: Record<string, string[]>;
}

export interface AIExplanation {
  summary_markdown: string;
  review_checklist: string[];
  failure_modes: string[];
  is_generated_by_llm: boolean;
}

export interface ExecutionMetrics {
  diff_parse_ms: number;
  ast_parse_ms: number;
  graph_build_ms: number;
  traversal_ms: number;
  risk_eval_ms: number;
  ai_synthesis_ms: number;
  total_duration_ms: number;
}

export interface AnalysisSummary {
  risk_score: number;
  risk_level: string;
  total_files_changed: number;
  total_changed_symbols: number;
  breaking_candidates_count: number;
  direct_impact_count: number;
  transitive_impact_count: number;
  total_impacted_count: number;
  recommended_test_count: number;
  test_reduction_ratio: number;
}

export interface FullAnalysisReport {
  analysis_id: string;
  repository_id?: string | null;
  pr_number?: number | null;
  summary: AnalysisSummary;
  changed_symbols: ChangedSymbol[];
  blast_radius: BlastRadiusReport;
  risk_report: RiskReport;
  test_plan: TestPlan;
  ai_explanation: AIExplanation;
  limitations: string[];
  metrics: ExecutionMetrics;
  created_at: string;
}

export interface RunFullAnalysisRequest {
  repository_id?: string;
  pr_number?: number;
  raw_diff: string;
  files: Record<string, string>;
  base_files?: Record<string, string>;
  commit_messages?: string[];
}

export const intelligenceClient = new IntelligenceClient();
