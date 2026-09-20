import React, { useState } from "react";
import { 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Activity, 
  History, 
  Sliders, 
  RotateCcw, 
  Sparkles,
  ArrowRight,
  TrendingDown
} from "lucide-react";
import { RiskReport } from "../types/analysis";

interface RiskBreakdownProps {
  riskReport: RiskReport;
}

export const RiskBreakdown: React.FC<RiskBreakdownProps> = ({ riskReport }) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [whatIfBreaking, setWhatIfBreaking] = useState(
    riskReport.factors.some((f) => f.factor_id === "PUBLIC_API_BREAK" && f.contribution_points > 0)
  );
  const [whatIfCoverageGap, setWhatIfCoverageGap] = useState(
    riskReport.factors.find((f) => f.factor_id === "TEST_PROXIMITY_GAP")?.raw_value || 50
  );
  const [whatIfDepth, setWhatIfDepth] = useState(2);

  const getFactorIcon = (factorId: string) => {
    switch (factorId) {
      case "BLAST_RADIUS_VOLUME":
      case "TRANSITIVE_BLAST_RADIUS":
        return <Layers className="h-4 w-4 text-accent" />;
      case "TRANSITIVE_DEPTH":
        return <Activity className="h-4 w-4 text-purple-400" />;
      case "PUBLIC_API_BREAK":
      case "SIGNATURE_BREAKING":
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      case "TEST_PROXIMITY_GAP":
      case "TEST_COVERAGE_GAP":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "HISTORICAL_DEFECT_CHURN":
      case "CO_CHANGE_CHURN":
        return <History className="h-4 w-4 text-amber-400" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  // Recompute What-If simulated risk score
  const simulatedScore = React.useMemo(() => {
    let score = 0;
    riskReport.factors.forEach((f) => {
      if (f.factor_id === "PUBLIC_API_BREAK" || f.factor_id === "SIGNATURE_BREAKING") {
        score += whatIfBreaking ? f.weight * 0.9 : 0;
      } else if (f.factor_id === "TEST_PROXIMITY_GAP" || f.factor_id === "TEST_COVERAGE_GAP") {
        score += (whatIfCoverageGap / 100) * f.weight;
      } else if (f.factor_id === "TRANSITIVE_DEPTH" || f.factor_id === "TRANSITIVE_BLAST_RADIUS") {
        score += Math.min(f.weight, whatIfDepth * 7);
      } else {
        score += f.contribution_points;
      }
    });
    return Math.min(100, Math.max(5, Math.round(score)));
  }, [riskReport, whatIfBreaking, whatIfCoverageGap, whatIfDepth]);

  const totalCalculatedPoints = riskReport.factors.reduce(
    (sum, f) => sum + f.contribution_points,
    0
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Calibrated Multi-Factor Risk Attribution</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            5-factor explainable scoring guaranteeing deterministic transparency (Total factor sum: {totalCalculatedPoints} pts).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
              showSimulator
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-sm"
                : "bg-surface-raised border-border text-slate-300 hover:text-white hover:border-slate-500"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            <span>{showSimulator ? "Close What-If Simulator" : "Try What-If Simulator"}</span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-xs pl-2 border-l border-border">
            <span className="text-slate-400">Score:</span>
            <span className={`font-extrabold px-2.5 py-0.5 rounded border ${
              riskReport.risk_score >= 80 ? "bg-purple-500/20 text-purple-300 border-purple-500/40" :
              riskReport.risk_score >= 50 ? "bg-rose-500/20 text-rose-300 border-rose-500/40" :
              riskReport.risk_score >= 20 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" :
              "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
            }`}>
              {riskReport.risk_score} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Interactive What-If Sensitivity Simulator Panel */}
      {showSimulator && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/10 p-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Interactive "What-If" Sensitivity Simulator
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">Current: {riskReport.risk_score}</span>
                <ArrowRight className="h-3 w-3 text-slate-500" />
                <span className={`font-bold px-2 py-0.5 rounded ${
                  simulatedScore < riskReport.risk_score
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-surface text-slate-300"
                }`}>
                  Simulated: {simulatedScore}
                </span>
                {simulatedScore < riskReport.risk_score && (
                  <span className="text-emerald-400 flex items-center gap-0.5 font-bold text-[11px]">
                    <TrendingDown className="h-3 w-3" />
                    -{riskReport.risk_score - simulatedScore} pts
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setWhatIfBreaking(false);
                  setWhatIfCoverageGap(10);
                  setWhatIfDepth(1);
                }}
                className="flex items-center gap-1 rounded bg-surface px-2 py-1 text-[11px] text-slate-400 hover:text-white border border-border"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Optimize All</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Control 1: Breaking API */}
            <div className="rounded-lg bg-surface/80 border border-border p-3 flex flex-col justify-between gap-2">
              <div>
                <label className="font-bold text-slate-200 block mb-1">
                  Public API Signature Mutated?
                </label>
                <p className="text-[11px] text-slate-400">
                  Preserve backward compatibility with optional parameters or overload.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setWhatIfBreaking(false)}
                  className={`flex-1 rounded py-1 font-semibold transition-colors ${
                    !whatIfBreaking ? "bg-emerald-600 text-white" : "bg-surface-raised text-slate-400"
                  }`}
                >
                  Preserved (Safe)
                </button>
                <button
                  onClick={() => setWhatIfBreaking(true)}
                  className={`flex-1 rounded py-1 font-semibold transition-colors ${
                    whatIfBreaking ? "bg-rose-600 text-white" : "bg-surface-raised text-slate-400"
                  }`}
                >
                  Mutated (Breaking)
                </button>
              </div>
            </div>

            {/* Control 2: Test Coverage */}
            <div className="rounded-lg bg-surface/80 border border-border p-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-200">
                    Test Coverage Gap Penalty
                  </label>
                  <span className="font-mono text-purple-300 font-bold">{whatIfCoverageGap}%</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Adding direct unit tests reduces coverage risk penalty.
                </p>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={whatIfCoverageGap}
                onChange={(e) => setWhatIfCoverageGap(parseInt(e.target.value, 10))}
                className="w-full accent-purple-500 mt-2"
              />
            </div>

            {/* Control 3: Dependency Depth */}
            <div className="rounded-lg bg-surface/80 border border-border p-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-200">
                    Transitive Caller Depth
                  </label>
                  <span className="font-mono text-accent font-bold">Depth {whatIfDepth}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Decoupling service boundaries reduces blast radius cascade.
                </p>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                value={whatIfDepth}
                onChange={(e) => setWhatIfDepth(parseInt(e.target.value, 10))}
                className="w-full accent-accent mt-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5 Calibrated Risk Factor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {riskReport.factors.map((factor) => {
          const ratio = factor.weight > 0 ? (factor.contribution_points / factor.weight) * 100 : 0;
          return (
            <div
              key={factor.factor_id}
              className="rounded-xl border border-border bg-surface-raised/70 p-4 flex flex-col justify-between hover:border-slate-500 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getFactorIcon(factor.factor_id)}
                    <span className="font-semibold text-xs text-white">
                      {factor.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-accent shrink-0">
                    +{factor.contribution_points} <span className="text-slate-500 font-normal">/ {factor.weight}</span>
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-indigo-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(4, ratio))}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {factor.evidence}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historical Defect Churn Signal */}
      {riskReport.historical_signal && (
        <div className="rounded-xl bg-surface-raised/80 border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Git Repository Historical Churn Intelligence
            </span>
          </div>

          {riskReport.historical_signal.is_available ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
              <div className="rounded-lg bg-surface p-3 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Analyzed Commits</span>
                <p className="font-mono text-white font-bold mt-1 text-sm">
                  {riskReport.historical_signal.commits_analyzed} commits
                </p>
              </div>
              <div className="rounded-lg bg-surface p-3 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Defect Hotspot Bugfixes</span>
                <p className="font-mono text-amber-400 font-bold mt-1 text-sm">
                  {riskReport.historical_signal.recent_bugfixes_count} historical fixes
                </p>
              </div>
              <div className="rounded-lg bg-surface p-3 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Logical Coupling</span>
                <p className="font-mono text-slate-300 truncate mt-1 text-sm">
                  {Object.keys(riskReport.historical_signal.co_changed_files).length} co-changing files
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              Historical churn telemetry: {riskReport.historical_signal.unavailability_reason || "Insufficient git commit log (< 5 commits)."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
