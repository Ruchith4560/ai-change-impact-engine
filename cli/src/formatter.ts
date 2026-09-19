// Standard ANSI color codes for high-density terminal rendering without external bloat
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
};

export interface FormatterReport {
  analysis_id: string;
  repository_id?: string | null;
  pr_number?: number | null;
  summary: {
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
  };
  changed_symbols: Array<{
    qualified_name: string;
    change_nature: string;
    is_breaking_candidate: boolean;
  }>;
  blast_radius: {
    impacted_entities: Array<{
      qualified_name: string;
      impact_type: string;
      depth: number;
      causal_path: string[];
    }>;
  };
  risk_report: {
    factors: Array<{
      name: string;
      contribution_points: number;
      weight: number;
      evidence: string;
    }>;
  };
  test_plan: {
    selected_tests: Array<{
      test_file_path: string;
      priority: string;
      rationale: string;
    }>;
    test_reduction_ratio: number;
  };
  ai_explanation: {
    summary_markdown: string;
    review_checklist: string[];
    failure_modes: string[];
  };
  metrics: {
    total_duration_ms: number;
  };
}

export function formatTerminalReport(report: FormatterReport): string {
  const lines: string[] = [];
  const divider = `${colors.dim}─`.repeat(76) + colors.reset;

  // Header Banner
  lines.push("");
  lines.push(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  lines.push(`${colors.bold}${colors.cyan}║                     AI CHANGE IMPACT ENGINE CLI                          ║${colors.reset}`);
  lines.push(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  lines.push(
    `  ${colors.dim}Run ID:${colors.reset} ${report.analysis_id}  │  ${colors.dim}Duration:${colors.reset} ${report.metrics.total_duration_ms}ms  │  ${colors.dim}PR:${colors.reset} #${report.pr_number || "local"}`
  );
  lines.push(divider);

  // Executive KPI Summary
  const riskColor =
    report.summary.risk_level === "CRITICAL"
      ? colors.red
      : report.summary.risk_level === "HIGH"
      ? colors.yellow
      : report.summary.risk_level === "MEDIUM"
      ? colors.magenta
      : colors.green;

  lines.push(`${colors.bold}EXECUTIVE RISK SUMMARY${colors.reset}`);
  lines.push(
    `  Composite Score:  ${colors.bold}${riskColor}${report.summary.risk_score} / 100 [${report.summary.risk_level}]${colors.reset}`
  );
  lines.push(
    `  Blast Radius:     ${colors.bold}${report.summary.total_impacted_count} symbols${colors.reset} (${report.summary.direct_impact_count} direct, ${report.summary.transitive_impact_count} transitive)`
  );
  lines.push(
    `  Test Selection:   ${colors.bold}${report.summary.recommended_test_count} targeted suites${colors.reset} (${Math.round(report.summary.test_reduction_ratio * 100)}% CI reduction)`
  );
  lines.push(
    `  API Breaking:     ${report.summary.breaking_candidates_count > 0 ? `${colors.bold}${colors.red}YES (${report.summary.breaking_candidates_count} symbols altered)${colors.reset}` : `${colors.green}NO (Fully backward compatible)${colors.reset}`}`
  );
  lines.push(divider);

  // Changed Symbols
  if (report.changed_symbols.length > 0) {
    lines.push(`${colors.bold}SOURCE CODE MODIFICATIONS${colors.reset}`);
    report.changed_symbols.forEach((s) => {
      const badge = s.is_breaking_candidate ? `${colors.red}[BREAKING]${colors.reset}` : `${colors.dim}[SAFE]${colors.reset}`;
      lines.push(`  • ${colors.bold}${s.qualified_name}${colors.reset} ${badge} (${s.change_nature})`);
    });
    lines.push(divider);
  }

  // Downstream Blast Radius Causal Paths
  if (report.blast_radius.impacted_entities.length > 0) {
    lines.push(`${colors.bold}DOWNSTREAM IMPACTED ENTITIES (Gᴿ BFS CAUSAL PATHS)${colors.reset}`);
    report.blast_radius.impacted_entities.forEach((e) => {
      const hopBadge = e.impact_type === "DIRECT" ? `${colors.yellow}Hop 1 (Direct)${colors.reset}` : `${colors.magenta}Hop ${e.depth} (Transitive)${colors.reset}`;
      lines.push(`  ▶ ${colors.bold}${e.qualified_name}${colors.reset} [${hopBadge}]`);
      if (e.causal_path && e.causal_path.length > 1) {
        const pathStr = e.causal_path.map((h) => h.split("::").pop() || h).join(` ${colors.dim}─►${colors.reset} `);
        lines.push(`    ${colors.dim}Path:${colors.reset} ${pathStr}`);
      }
    });
    lines.push(divider);
  }

  // Risk Attribution Factors
  lines.push(`${colors.bold}EXPLAINABLE FACTOR ATTRIBUTION${colors.reset}`);
  report.risk_report.factors.forEach((f) => {
    lines.push(
      `  • ${f.name.padEnd(32)}: ${colors.bold}+${f.contribution_points.toString().padStart(2)} pts${colors.reset} ${colors.dim}(Weight: ${f.weight})${colors.reset}`
    );
  });
  lines.push(divider);

  // Regression Test Execution Commands
  if (report.test_plan.selected_tests.length > 0) {
    lines.push(`${colors.bold}INTELLIGENT REGRESSION TEST PLAN (RTS)${colors.reset}`);
    report.test_plan.selected_tests.forEach((t) => {
      const prioColor = t.priority === "P1" ? colors.red : colors.yellow;
      lines.push(`  [${prioColor}${t.priority}${colors.reset}] ${colors.bold}${t.test_file_path}${colors.reset}`);
      lines.push(`      ${colors.dim}Rationale:${colors.reset} ${t.rationale}`);
      const runnerCmd = t.test_file_path.endsWith(".py") ? `pytest ${t.test_file_path}` : `npm test -- ${t.test_file_path}`;
      lines.push(`      ${colors.cyan}${runnerCmd}${colors.reset}`);
    });
    lines.push(divider);
  }

  // AI Reviewer Checklist
  if (report.ai_explanation.review_checklist.length > 0) {
    lines.push(`${colors.bold}AI CODE REVIEW CHECKLIST${colors.reset}`);
    report.ai_explanation.review_checklist.forEach((item) => {
      lines.push(`  [ ] ${item}`);
    });
    lines.push(divider);
  }

  // Failure Modes
  if (report.ai_explanation.failure_modes.length > 0) {
    lines.push(`${colors.bold}${colors.red}HIGH-PROBABILITY REGRESSION FAILURE MODES${colors.reset}`);
    report.ai_explanation.failure_modes.forEach((fm) => {
      lines.push(`  ⚠  ${fm}`);
    });
    lines.push(divider);
  }

  lines.push("");
  return lines.join("\n");
}
