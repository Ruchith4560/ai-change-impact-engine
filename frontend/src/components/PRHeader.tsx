import React from "react";
import { 
  GitPullRequest, 
  GitBranch, 
  GitCommit, 
  Send, 
  Download, 
  Play, 
  SlidersHorizontal,
  ShieldAlert,
  ShieldCheck,
  Zap
} from "lucide-react";
import { ScenarioPreset, FullAnalysisReport } from "../types/analysis";

interface PRHeaderProps {
  currentScenario: ScenarioPreset;
  scenarios: ScenarioPreset[];
  onSelectScenario: (scenario: ScenarioPreset) => void;
  onOpenCustomModal: () => void;
  onRunLiveAnalysis: () => void;
  onOpenWebhookSimulator: () => void;
  isLoading: boolean;
  report: FullAnalysisReport;
}

export const PRHeader: React.FC<PRHeaderProps> = ({
  currentScenario,
  scenarios,
  onSelectScenario,
  onOpenCustomModal,
  onRunLiveAnalysis,
  onOpenWebhookSimulator,
  isLoading,
  report,
}) => {
  const getRiskBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-1 text-xs font-bold text-purple-400 border border-purple-500/30 shadow-sm">
          <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
          CRITICAL RISK ({score}/100)
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-bold text-rose-400 border border-rose-500/30 shadow-sm">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          HIGH RISK ({score}/100)
        </span>
      );
    }
    if (score >= 20) {
      return (
        <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-400 border border-amber-500/30 shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          MEDIUM / LOW ({score}/100)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
        ZERO RISK ({score}/100)
      </span>
    );
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `impact_report_${report.analysis_id || "report"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-lg relative overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top row: PR Title & Status Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
              <GitPullRequest className="h-3.5 w-3.5" />
              Open
            </span>
            <span className="font-mono text-xs font-bold text-slate-400">
              #{currentScenario.prNumber}
            </span>
            {getRiskBadge(report.risk_report.risk_score)}
            <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[11px] font-semibold text-accent flex items-center gap-1">
              <Zap className="h-3 w-3" />
              RTS: {Math.round(report.summary.test_reduction_ratio * 100)}% Avoided
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{currentScenario.prTitle}</span>
          </h2>

          <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-slate-400">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <img
                src={currentScenario.author.avatar}
                alt={currentScenario.author.name}
                className="h-5 w-5 rounded-full border border-border object-cover"
              />
              <span className="font-semibold text-slate-300">{currentScenario.author.name}</span>
              <span className="text-slate-500 font-mono">(@{currentScenario.author.handle})</span>
            </div>
            <span>•</span>
            {/* Branch routing */}
            <div className="flex items-center gap-1.5 font-mono text-slate-300 bg-surface-raised/80 px-2.5 py-0.5 rounded border border-border/80 text-[11px]">
              <GitBranch className="h-3 w-3 text-purple-400" />
              <span className="text-purple-300 font-bold">{currentScenario.baseBranch}</span>
              <span className="text-slate-500">←</span>
              <span className="text-accent font-bold">{currentScenario.branch}</span>
            </div>
            <span>•</span>
            {/* Commit SHA */}
            <div className="flex items-center gap-1 font-mono text-slate-400 text-[11px]">
              <GitCommit className="h-3 w-3 text-slate-500" />
              <span>{currentScenario.commitSha}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          <button
            onClick={onRunLiveAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white hover:bg-accent/80 transition-all shadow-md shadow-accent/20 disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Analyzing..." : "Analyze Live Diff"}</span>
          </button>

          <button
            onClick={onOpenWebhookSimulator}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            title="Simulate GitHub PR Webhook with HMAC-SHA256 signature"
          >
            <Send className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Simulate Webhook</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            title="Export complete analysis report as JSON"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Scenario Presets Quick-Switcher */}
      <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Presets:
          </span>
          {scenarios.map((s) => {
            const isSelected = s.id === currentScenario.id;
            return (
              <button
                key={s.id}
                onClick={() => onSelectScenario(s)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? "bg-accent/15 border-accent text-accent shadow-sm"
                    : "bg-surface-raised/50 border-border/60 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                <span>{s.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  s.category === "breaking" ? "bg-rose-500/20 text-rose-300" :
                  s.category === "logic" ? "bg-amber-500/20 text-amber-300" :
                  s.category === "cascade" ? "bg-purple-500/20 text-purple-300" :
                  "bg-emerald-500/20 text-emerald-300"
                }`}>
                  {s.report.risk_report.risk_score}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onOpenCustomModal}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:border-slate-400 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
          <span>Custom Diff Input</span>
        </button>
      </div>
    </div>
  );
};
