import React from "react";
import { X, ArrowRight, FileCode, CheckCircle } from "lucide-react";
import { BlastRadiusReport, ChangedSymbol } from "../types/analysis";

interface NodeDetailsDrawerProps {
  nodeId: string | null;
  blastRadius: BlastRadiusReport;
  changedSymbols: ChangedSymbol[];
  onClose: () => void;
}

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  nodeId,
  blastRadius,
  changedSymbols,
  onClose,
}) => {
  if (!nodeId) return null;

  const changedEntity = changedSymbols.find((s) => s.entity_id === nodeId);
  const impactedEntity = blastRadius.impacted_entities.find((e) => e.entity_id === nodeId);
  const graphNode = blastRadius.subgraph_nodes.find((n) => n.id === nodeId);

  const title = changedEntity?.qualified_name || impactedEntity?.qualified_name || graphNode?.label || nodeId;
  const filePath = changedEntity?.file_path || impactedEntity?.file_path || graphNode?.file_path || "";
  const entityType = changedEntity?.entity_type || impactedEntity?.entity_type || graphNode?.entity_type || "UNKNOWN";

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-2xl flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase font-mono">
              {entityType}
            </span>
            {changedEntity && (
              <span className="rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold uppercase font-mono">
                Source Modification
              </span>
            )}
            {impactedEntity && (
              <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono border ${
                impactedEntity.impact_type === "DIRECT"
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "bg-purple-500/20 text-purple-400 border-purple-500/30"
              }`}>
                {impactedEntity.impact_type} (Hop {impactedEntity.depth})
              </span>
            )}
          </div>
          <h3 className="mt-1.5 font-mono text-base font-bold text-white tracking-tight break-all">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
            <FileCode className="h-3.5 w-3.5 text-slate-400" />
            <span>{filePath}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-raised hover:text-white transition-colors"
          title="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Causal Reachability Path */}
      {impactedEntity && impactedEntity.causal_path && impactedEntity.causal_path.length > 0 && (
        <div className="rounded-lg bg-surface-raised p-3 border border-border">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Deterministic Causal Traversal Path
          </span>
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            {impactedEntity.causal_path.map((hop, idx) => (
              <React.Fragment key={idx}>
                <span
                  className={`px-2 py-1 rounded border ${
                    idx === 0
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold"
                      : idx === impactedEntity.causal_path.length - 1
                      ? "bg-accent/10 text-accent border-accent/30 font-bold"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {hop.split("::").pop() || hop}
                </span>
                {idx < impactedEntity.causal_path.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        {changedEntity && (
          <div className="rounded bg-surface-raised p-2.5 border border-border">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Change Nature</span>
            <p className="font-mono text-slate-200 font-semibold mt-0.5">{changedEntity.change_nature}</p>
          </div>
        )}
        {changedEntity && (
          <div className="rounded bg-surface-raised p-2.5 border border-border">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Breaking Candidate</span>
            <p className={`font-mono font-semibold mt-0.5 ${changedEntity.is_breaking_candidate ? "text-amber-400" : "text-emerald-400"}`}>
              {changedEntity.is_breaking_candidate ? "YES (Exported API)" : "NO"}
            </p>
          </div>
        )}
        {impactedEntity && (
          <div className="rounded bg-surface-raised p-2.5 border border-border">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Graph Distance</span>
            <p className="font-mono text-white font-bold mt-0.5">{impactedEntity.depth} Hops</p>
          </div>
        )}
        {impactedEntity && (
          <div className="rounded bg-surface-raised p-2.5 border border-border">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Static Confidence</span>
            <p className="font-mono text-emerald-400 font-bold mt-0.5">
              {Math.round(impactedEntity.confidence * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Action Recommendation */}
      <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Recommended Verification:</span>
          <p className="text-emerald-300/80 mt-0.5">
            {changedEntity
              ? "Verify all exported signatures and ensure non-breaking default parameters for external consumers."
              : `Review calling arguments in ${title} to ensure compatibility with upstream parameter updates.`}
          </p>
        </div>
      </div>
    </div>
  );
};
