import React from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  FolderTree, 
  FileCode, 
  Braces
} from "lucide-react";
import { ChangedSymbol } from "../types/analysis";

interface AstSymbolInspectorProps {
  changedSymbols: ChangedSymbol[];
  selectedSymbolId: string | null;
  onSelectSymbol: (symbolId: string) => void;
  onNavigateToGraph?: (symbolId: string) => void;
}

export const AstSymbolInspector: React.FC<AstSymbolInspectorProps> = ({
  changedSymbols,
  selectedSymbolId,
  onSelectSymbol,
  onNavigateToGraph,
}) => {
  if (!changedSymbols || changedSymbols.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-slate-400">
        <FolderTree className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">No AST symbols modified in this diff.</p>
        <p className="text-xs text-slate-500 mt-1">Changes are non-executable text (e.g. documentation, markdown, configuration).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Braces className="h-4 w-4 text-cyan-400" />
            <span>Extracted AST Symbols & Mutation Classifications</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tree-sitter concrete syntax tree mapping identifying signature volatility and breaking public API risks.
          </p>
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-mono font-bold text-slate-300 border border-border">
          {changedSymbols.length} Symbol{changedSymbols.length === 1 ? "" : "s"} Extracted
        </span>
      </div>

      {/* Grid of Symbol Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {changedSymbols.map((sym) => {
          const isSelected = selectedSymbolId === sym.entity_id;

          return (
            <div
              key={sym.entity_id}
              onClick={() => onSelectSymbol(sym.entity_id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? "border-accent bg-accent/10 shadow-lg shadow-accent/10"
                  : "border-border bg-surface-raised/40 hover:bg-surface-raised hover:border-slate-600"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 border border-slate-700">
                    {sym.entity_type}
                  </span>
                  {sym.is_exported && (
                    <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                      EXPORTED
                    </span>
                  )}
                </div>

                {sym.is_breaking_candidate ? (
                  <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/40">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    BREAKING API CANDIDATE
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                    <CheckCircle className="h-2.5 w-2.5" />
                    SAFE IMPLEMENTATION
                  </span>
                )}
              </div>

              {/* Symbol Name & Path */}
              <div className="font-mono text-xs font-bold text-white truncate" title={sym.qualified_name}>
                {sym.qualified_name}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-1 truncate" title={sym.file_path}>
                <FileCode className="h-3 w-3 text-slate-500 shrink-0" />
                <span className="truncate">{sym.file_path}</span>
              </div>

              {/* Location & Diff Details */}
              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                <div className="text-slate-400">
                  <span>Lines: </span>
                  <span className="font-mono text-slate-300">{sym.location.start_line}–{sym.location.end_line}</span>
                  {sym.diff_lines_intersected?.length > 0 && (
                    <span className="ml-2 text-slate-500">
                      (Diff lines: {sym.diff_lines_intersected.join(", ")})
                    </span>
                  )}
                </div>

                {onNavigateToGraph && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToGraph(sym.entity_id);
                    }}
                    className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium text-[11px] transition-colors"
                  >
                    <span>View Graph</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
