import React from "react";
import { 
  Layers, 
  RefreshCw, 
  SlidersHorizontal,
  Github,
  BookOpen,
  Activity
} from "lucide-react";
import { BackendConnectionHub } from "./BackendConnectionHub";
import { BackendTargetConfig } from "../types/analysis";

interface NavbarProps {
  onOpenCustomModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  onBackendChange?: (config: BackendTargetConfig) => void;
  executionMs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCustomModal,
  onRefresh,
  isLoading,
  onBackendChange,
  executionMs,
}) => {
  return (
    <header className="border-b border-border bg-surface px-6 py-3 sticky top-0 z-30 shadow-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-accent to-cyan-400 text-white shadow-lg shadow-indigo-500/25">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">AI Change Impact Engine</h1>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/30">
                v1.0-prod
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>AST Symbol Reachability & Blast-Radius Engine</span>
              <span>•</span>
              <span className="text-emerald-400 font-mono text-[11px] font-semibold">100% Deterministic</span>
            </div>
          </div>
        </div>

        {/* Right Controls: Backend Switcher, Actions & External Links */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Backend Connection Hub */}
          <BackendConnectionHub onBackendChange={onBackendChange} />

          {/* Execution Latency Pill */}
          {executionMs !== undefined && (
            <span className="hidden lg:flex items-center gap-1 rounded-lg bg-surface-raised px-2.5 py-1.5 text-[11px] font-mono text-emerald-400 border border-border">
              <Activity className="h-3 w-3" />
              <span>{executionMs}ms</span>
            </span>
          )}

          {/* Custom Diff Trigger */}
          <button
            onClick={onOpenCustomModal}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">Custom Diff</span>
          </button>

          {/* Re-analyze */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-accent/15 border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 transition-all disabled:opacity-50"
            title="Re-run analysis against active backend"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Running..." : "Re-Run"}</span>
          </button>

          {/* External Docs & GitHub Links */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/80">
            <a
              href="https://github.com/Ruchith4560/ai-change-impact-engine"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised/60 hover:bg-surface-raised p-1.5 text-slate-400 hover:text-white transition-colors"
              title="GitHub Repository"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://ai-change-impact-engine.onrender.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-border bg-surface-raised/60 hover:bg-surface-raised p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Interactive Swagger OpenAPI Docs"
            >
              <BookOpen className="h-4 w-4 text-cyan-400" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
