import React from "react";
import { Timer, Zap } from "lucide-react";
import { ExecutionMetrics } from "../types/analysis";

interface TelemetryWaterfallProps {
  metrics: ExecutionMetrics;
}

export const TelemetryWaterfall: React.FC<TelemetryWaterfallProps> = ({ metrics }) => {
  const stages = [
    { name: "Git Diff Parsing", ms: metrics.diff_parse_ms, color: "bg-blue-500" },
    { name: "Tree-sitter AST Extraction", ms: metrics.ast_parse_ms, color: "bg-indigo-500" },
    { name: "NetworkX Graph Assembly", ms: metrics.graph_build_ms, color: "bg-cyan-500" },
    { name: "Reverse BFS Traversal (Gᴿ)", ms: metrics.traversal_ms, color: "bg-purple-500" },
    { name: "Risk & Test Prioritization", ms: metrics.risk_eval_ms, color: "bg-amber-500" },
    { name: "Controlled AI Synthesis", ms: metrics.ai_synthesis_ms, color: "bg-emerald-500" },
  ];

  const total = Math.max(0.1, metrics.total_duration_ms);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Pipeline Execution Telemetry & Latency Waterfall
          </h2>
        </div>
        <div className="flex items-center gap-1.5 rounded bg-emerald-500/10 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
          <Zap className="h-3.5 w-3.5" />
          Total: {metrics.total_duration_ms} ms
        </div>
      </div>

      <div className="space-y-2.5">
        {stages.map((stg) => {
          const pct = Math.min(100, Math.max(1, (stg.ms / total) * 100));
          return (
            <div key={stg.name} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">{stg.name}</span>
                <span className="text-slate-400">
                  {stg.ms} ms <span className="text-slate-500">({Math.round(pct)}%)</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${stg.color} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
