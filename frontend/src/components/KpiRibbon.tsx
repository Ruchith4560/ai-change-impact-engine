import React from "react";
import { 
  ShieldAlert, 
  GitCommit, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Clock
} from "lucide-react";
import { AnalysisSummary } from "../types/analysis";

interface KpiRibbonProps {
  summary: AnalysisSummary;
}

export const KpiRibbon: React.FC<KpiRibbonProps> = ({ summary }) => {
  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case "CRITICAL":
        return { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", ring: "stroke-rose-500" };
      case "HIGH":
        return { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", ring: "stroke-orange-500" };
      case "MEDIUM":
        return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", ring: "stroke-amber-500" };
      default:
        return { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", ring: "stroke-emerald-500" };
    }
  };

  const riskColors = getRiskColor(summary.risk_level);
  const reductionPercent = Math.round(summary.test_reduction_ratio * 100);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-5">
      {/* 1. Composite Risk Score Card */}
      <div className={`rounded-xl border ${riskColors.border} ${riskColors.bg} p-4 shadow-sm relative overflow-hidden`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Composite Change Risk
          </span>
          <span className={`px-2 py-0.5 text-xs font-bold rounded ${riskColors.bg} ${riskColors.text} border ${riskColors.border}`}>
            {summary.risk_level}
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-4xl font-extrabold tracking-tight ${riskColors.text}`}>
            {summary.risk_score}
          </span>
          <span className="text-xs font-mono text-slate-400">/ 100 max</span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              summary.risk_level === "HIGH" || summary.risk_level === "CRITICAL"
                ? "bg-gradient-to-r from-orange-500 to-rose-500"
                : summary.risk_level === "MEDIUM"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(5, summary.risk_score))}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldAlert className="h-3 w-3" />
          <span>Calculated via 6 calibrated multi-factor weights</span>
        </div>
      </div>

      {/* 2. Blast Radius Volume Card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Downstream Blast Radius
          </span>
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {summary.total_impacted_count}
          </span>
          <span className="text-xs text-slate-400">affected symbols</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="rounded bg-orange-500/10 px-2 py-0.5 font-mono text-orange-400 border border-orange-500/20">
            {summary.direct_impact_count} Direct
          </span>
          <span className="rounded bg-purple-500/10 px-2 py-0.5 font-mono text-purple-400 border border-purple-500/20">
            {summary.transitive_impact_count} Transitive
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Zap className="h-3 w-3 text-accent" />
          <span>Reverse reachability graph traversal (Gᴿ)</span>
        </div>
      </div>

      {/* 3. Intelligent Regression Test Savings Card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Regression Test Plan
          </span>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            {reductionPercent}% CI Saved
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-emerald-400 tracking-tight">
            {summary.recommended_test_count}
          </span>
          <span className="text-xs text-slate-400">targeted suites</span>
        </div>
        <div className="mt-3 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div 
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.max(5, 100 - reductionPercent)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock className="h-3 w-3 text-emerald-400" />
          <span>Bypasses unimpacted test files with 0 coverage loss</span>
        </div>
      </div>

      {/* 4. Code Churn & Breaking Mutations Card */}
      <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
            Interface Breaking Risk
          </span>
          {summary.breaking_candidates_count > 0 ? (
            <span className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">
              <AlertTriangle className="h-3 w-3" />
              API Breaking
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" />
              Compatible
            </span>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white tracking-tight">
            {summary.breaking_candidates_count}
          </span>
          <span className="text-xs text-slate-400">breaking candidates</span>
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>{summary.total_files_changed} files</span>
          <span>•</span>
          <span>{summary.total_changed_symbols} symbols</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <GitCommit className="h-3 w-3 text-slate-400" />
          <span>AST signature & parameter mutation analysis</span>
        </div>
      </div>
    </div>
  );
};
