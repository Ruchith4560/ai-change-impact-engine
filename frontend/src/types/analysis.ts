export interface ChangedSymbol {
  entity_id: string;
  qualified_name: string;
  entity_type: string;
  file_path: string;
  change_nature: "SIGNATURE_MODIFIED" | "BODY_MODIFIED" | "ADDED" | "DELETED" | "STRUCTURAL";
  is_exported: boolean;
  is_breaking_candidate: boolean;
  diff_lines_intersected: number[];
  location: {
    start_line: number;
    end_line: number;
    start_col: number;
    end_col: number;
  };
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

export interface RunFullAnalysisPayload {
  repositoryId?: string;
  prNumber?: number;
  rawDiff: string;
  files: Record<string, string>;
  baseFiles?: Record<string, string>;
  commitMessages?: string[];
}

export interface AnalyticsTrendPoint {
  date: string;
  pr_number: number;
  title: string;
  commit_sha: string;
  risk_score: number;
  risk_level: string;
  impacted_count: number;
  tests_selected: number;
  tests_avoided: number;
}

export interface AnalyticsTrendResponse {
  repository_id?: string;
  total_analyses: number;
  average_risk_score: number;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  total_tests_executed: number;
  total_tests_avoided: number;
  ci_minutes_saved: number;
  average_test_reduction_ratio: number;
  top_hotspots: Array<{
    file: string;
    frequency: number;
    avgRiskContribution: number;
  }>;
  time_series: AnalyticsTrendPoint[];
}

