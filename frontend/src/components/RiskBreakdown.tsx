import { 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Activity, 
  History 
} from "lucide-react";
import { RiskReport } from "../types/analysis";

interface RiskBreakdownProps {
  riskReport: RiskReport;
}

export const RiskBreakdown: React.FC<RiskBreakdownProps> = ({ riskReport }) => {
  const getFactorIcon = (factorId: string) => {
    switch (factorId) {
      case "BLAST_RADIUS_VOLUME":
        return <Layers className="h-4 w-4 text-accent" />;
      case "TRANSITIVE_DEPTH":
        return <Activity className="h-4 w-4 text-purple-400" />;
      case "PUBLIC_API_BREAK":
        return <AlertCircle className="h-4 w-4 text-rose-400" />;
      case "TEST_PROXIMITY_GAP":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "HISTORICAL_DEFECT_CHURN":
        return <History className="h-4 w-4 text-amber-400" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const totalCalculatedPoints = riskReport.factors.reduce(
    (sum, f) => sum + f.contribution_points,
    0
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Explainable Composite Risk Attribution
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic additive factor scoring guaranteeing exact explainability (Sum of contributions = {totalCalculatedPoints})
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Total Score:</span>
          <span className="font-extrabold text-white bg-surface-raised px-2 py-0.5 rounded border border-border">
            {riskReport.risk_score} / 100
          </span>
        </div>
      </div>

      {/* 6 Additive Factors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {riskReport.factors.map((factor) => {
          const ratio = factor.weight > 0 ? (factor.contribution_points / factor.weight) * 100 : 0;
          return (
            <div
              key={factor.factor_id}
              className="rounded-lg border border-border bg-surface-raised p-3.5 flex flex-col justify-between hover:border-slate-600 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getFactorIcon(factor.factor_id)}
                    <span className="font-semibold text-xs text-slate-200">
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

      {/* Historical Signal & Co-Change Coupling Panel */}
      {riskReport.historical_signal && (
        <div className="rounded-lg bg-surface-raised border border-border p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Git Repository Historical Churn Intelligence
            </span>
          </div>

          {riskReport.historical_signal.is_available ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
              <div className="rounded bg-surface p-2.5 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Analyzed Commits</span>
                <p className="font-mono text-white font-bold mt-0.5">
                  {riskReport.historical_signal.commits_analyzed} commits
                </p>
              </div>
              <div className="rounded bg-surface p-2.5 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Defect Hotspot Bugfixes</span>
                <p className="font-mono text-amber-400 font-bold mt-0.5">
                  {riskReport.historical_signal.recent_bugfixes_count} historical fixes
                </p>
              </div>
              <div className="rounded bg-surface p-2.5 border border-border/60">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Logical Coupling</span>
                <p className="font-mono text-slate-300 truncate mt-0.5">
                  {Object.keys(riskReport.historical_signal.co_changed_files).length} co-changing files (Jaccard ≥ 0.25)
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
