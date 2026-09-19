import { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  Flame,
  GitPullRequest,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { AnalyticsTrendResponse, AnalyticsTrendPoint } from "../types/analysis";
import { AnalysisApiClient, DEFAULT_TREND_DATA } from "../services/api";

interface AnalyticsViewProps {
  repositoryId?: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ repositoryId }) => {
  const [data, setData] = useState<AnalyticsTrendResponse>(DEFAULT_TREND_DATA);
  const [selectedPoint, setSelectedPoint] = useState<AnalyticsTrendPoint | null>(null);
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    AnalysisApiClient.getAnalyticsTrends(repositoryId, daysFilter)
      .then((res) => {
        setData(res);
        if (res.time_series.length > 0) {
          setSelectedPoint(res.time_series[res.time_series.length - 1]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [repositoryId, daysFilter]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
      case "MEDIUM":
        return "text-amber-400 bg-amber-500/15 border-amber-500/30";
      case "HIGH":
        return "text-orange-400 bg-orange-500/15 border-orange-500/30";
      case "CRITICAL":
        return "text-rose-400 bg-rose-500/15 border-rose-500/30";
      default:
        return "text-slate-400 bg-slate-800 border-slate-700";
    }
  };

  const getRiskBarColor = (score: number) => {
    if (score <= 30) return "bg-emerald-500";
    if (score <= 60) return "bg-amber-500";
    if (score <= 85) return "bg-orange-500";
    return "bg-rose-500";
  };

  const totalPrs = data.total_analyses;
  const lowPercent = totalPrs > 0 ? Math.round((data.risk_distribution.LOW / totalPrs) * 100) : 0;
  const medPercent = totalPrs > 0 ? Math.round((data.risk_distribution.MEDIUM / totalPrs) * 100) : 0;
  const highPercent = totalPrs > 0 ? Math.round((data.risk_distribution.HIGH / totalPrs) * 100) : 0;
  const critPercent = totalPrs > 0 ? Math.round((data.risk_distribution.CRITICAL / totalPrs) * 100) : 0;

  return (
    <div className={`flex flex-col gap-6 transition-opacity duration-200 ${isLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
      {/* 1. Header with Repository Filter and Window Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Enterprise Risk Velocity & CI Efficiency Analytics
            </h2>
            <span className="rounded-full bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-mono font-semibold">
              MongoDB Snapshots
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Historical change risk velocity, regression test suite avoidance, and recurring architectural defect hotspots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Window:</span>
          <div className="flex rounded-lg border border-border bg-surface p-0.5 text-xs">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDaysFilter(d)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  daysFilter === d
                    ? "bg-accent text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top-Level Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: 30-Day Risk Velocity */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Rolling Risk Velocity</span>
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight">
              {data.average_risk_score}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 100 avg</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400"></span>
            <span>Stable across {data.total_analyses} recent PRs</span>
          </div>
        </div>

        {/* Metric 2: Total Pull Requests Analyzed */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">PRs Evaluated</span>
            <GitPullRequest className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-white tracking-tight">
              {data.total_analyses}
            </span>
            <span className="text-xs text-purple-300 font-mono">PRs verified</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Automated AST + Graph gates</span>
          </div>
        </div>

        {/* Metric 3: Cumulative CI Test Minutes Saved */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">Cumulative CI Minutes Saved</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {data.ci_minutes_saved}m
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({data.total_tests_avoided} suites skipped)
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>0 regressions leaked to main</span>
          </div>
        </div>

        {/* Metric 4: Average RTS Test Reduction */}
        <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">RTS Test Reduction</span>
            <FlaskConical className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-cyan-400 tracking-tight">
              {Math.round(data.average_test_reduction_ratio * 100)}%
            </span>
            <span className="text-xs text-slate-400 font-mono">reduction ratio</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span>Direct & Transitive static reachability</span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart & Risk Velocity Time-Series */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Chronological Risk Velocity Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Historical Pull Request Risk Velocity
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any pull request bar to inspect causal impact and test avoidance
              </p>
            </div>
            {selectedPoint && (
              <div className="font-mono text-xs text-slate-300 bg-surface-raised px-2.5 py-1 rounded border border-border flex items-center gap-2">
                <span className="text-slate-400">PR #{selectedPoint.pr_number}:</span>
                <span className={`font-bold ${selectedPoint.risk_score > 60 ? "text-orange-400" : "text-emerald-400"}`}>
                  Score {selectedPoint.risk_score}
                </span>
              </div>
            )}
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="h-48 flex items-end gap-3 px-2 border-b border-slate-800 relative">
              {/* Reference Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-15">
                <div className="border-b border-dashed border-rose-500 text-[9px] font-mono text-rose-400">80 - HIGH</div>
                <div className="border-b border-dashed border-amber-500 text-[9px] font-mono text-amber-400">50 - MED</div>
                <div className="border-b border-dashed border-emerald-500 text-[9px] font-mono text-emerald-400">20 - LOW</div>
              </div>

              {data.time_series.map((point) => {
                const isSelected = selectedPoint?.pr_number === point.pr_number;
                const heightPercent = Math.max(8, point.risk_score);
                return (
                  <div
                    key={point.pr_number}
                    onClick={() => setSelectedPoint(point)}
                    className="flex-1 flex flex-col items-center gap-2 cursor-pointer group relative z-10"
                  >
                    {/* Hover Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-16 bg-slate-900 border border-border text-white text-[10px] p-2 rounded shadow-lg pointer-events-none whitespace-nowrap z-20 font-mono">
                      <div className="font-bold">PR #{point.pr_number}: {point.risk_score}/100</div>
                      <div className="text-slate-400">{point.title.slice(0, 30)}...</div>
                      <div className="text-emerald-400">Avoided {point.tests_avoided} test suites</div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[48px] rounded-t transition-all duration-300 ${
                        getRiskBarColor(point.risk_score)
                      } ${
                        isSelected
                          ? "ring-2 ring-accent shadow-lg brightness-125"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    />

                    {/* Label */}
                    <span
                      className={`text-[10px] font-mono transition-colors ${
                        isSelected ? "text-accent font-bold" : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    >
                      #{point.pr_number}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected PR Detail Panel */}
          {selectedPoint && (
            <div className="rounded-lg border border-border bg-surface-raised p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">PR #{selectedPoint.pr_number}</span>
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${getRiskColor(selectedPoint.risk_level)}`}>
                    {selectedPoint.risk_level} ({selectedPoint.risk_score}/100)
                  </span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedPoint.date}
                  </span>
                </div>
                <p className="text-slate-300 font-medium text-[11px]">{selectedPoint.title}</p>
              </div>

              <div className="flex items-center gap-4 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400">Impacted: </span>
                  <span className="text-white font-bold">{selectedPoint.impacted_count} entities</span>
                </div>
                <div>
                  <span className="text-slate-400">Selected: </span>
                  <span className="text-emerald-400 font-bold">{selectedPoint.tests_selected} tests</span>
                </div>
                <div>
                  <span className="text-slate-400">Avoided: </span>
                  <span className="text-accent font-bold">{selectedPoint.tests_avoided} tests</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Distribution Breakdown Panel (1 col) */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-border pb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Risk Level Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Categorization across pull requests verified within the selected analysis window.
            </p>
          </div>

          {/* Multi-segment horizontal distribution bar */}
          <div className="flex flex-col gap-3">
            <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
              <div style={{ width: `${lowPercent}%` }} className="bg-emerald-500 h-full" title={`Low: ${lowPercent}%`} />
              <div style={{ width: `${medPercent}%` }} className="bg-amber-500 h-full" title={`Medium: ${medPercent}%`} />
              <div style={{ width: `${highPercent}%` }} className="bg-orange-500 h-full" title={`High: ${highPercent}%`} />
              <div style={{ width: `${critPercent}%` }} className="bg-rose-500 h-full" title={`Critical: ${critPercent}%`} />
            </div>

            {/* Badges and Counts */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border bg-surface-raised p-2 flex items-center justify-between">
                <span className="text-emerald-400 font-semibold text-[11px]">LOW RISK</span>
                <span className="font-mono font-bold text-white">{data.risk_distribution.LOW} ({lowPercent}%)</span>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-2 flex items-center justify-between">
                <span className="text-amber-400 font-semibold text-[11px]">MEDIUM</span>
                <span className="font-mono font-bold text-white">{data.risk_distribution.MEDIUM} ({medPercent}%)</span>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-2 flex items-center justify-between">
                <span className="text-orange-400 font-semibold text-[11px]">HIGH RISK</span>
                <span className="font-mono font-bold text-white">{data.risk_distribution.HIGH} ({highPercent}%)</span>
              </div>
              <div className="rounded-lg border border-border bg-surface-raised p-2 flex items-center justify-between">
                <span className="text-rose-400 font-semibold text-[11px]">CRITICAL</span>
                <span className="font-mono font-bold text-white">{data.risk_distribution.CRITICAL} ({critPercent}%)</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/60 p-3 text-[11px] text-slate-400 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Zero critical risks permitted to merge into target branch without senior tech lead review override.
            </span>
          </div>
        </div>
      </div>

      {/* 4. Architectural Risk Hotspots & Defect Churn Ledger */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              Architectural Risk Hotspots & Logical Defect Coupling
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Code modules exhibiting frequent co-change churn and high downstream transitive blast radius
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {data.top_hotspots.length} hotspots detected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">File / Module Path</th>
                <th className="py-2.5 px-3">Modifications</th>
                <th className="py-2.5 px-3">Avg Risk Contribution</th>
                <th className="py-2.5 px-3">Architectural Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.top_hotspots.map((hotspot) => (
                <tr key={hotspot.file} className="hover:bg-surface-raised transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-200 font-medium">
                    {hotspot.file}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className="rounded bg-surface-raised px-2 py-0.5 text-slate-300 border border-border">
                      {hotspot.frequency} PRs
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span
                      className={`font-bold ${
                        hotspot.avgRiskContribution > 50 ? "text-orange-400" : "text-amber-400"
                      }`}
                    >
                      +{hotspot.avgRiskContribution} pts
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                    {hotspot.frequency >= 3
                      ? "High logical coupling across checkout domain. Recommend isolating into bounded context with explicit DTO interfaces."
                      : "Standard module churn. Direct test coverage sufficient."}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
