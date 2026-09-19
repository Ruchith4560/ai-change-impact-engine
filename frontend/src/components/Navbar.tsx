import React from "react";
import { 
  GitPullRequest, 
  Layers, 
  Activity, 
  RefreshCw, 
  SlidersHorizontal,
  Wifi,
  WifiOff
} from "lucide-react";

interface NavbarProps {
  currentPreset: string;
  onSelectPreset: (preset: "ecommerce" | "docs") => void;
  onOpenCustomModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  isGatewayOnline: boolean;
  executionMs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPreset,
  onSelectPreset,
  onOpenCustomModal,
  onRefresh,
  isLoading,
  isGatewayOnline,
  executionMs,
}) => {
  return (
    <header className="border-b border-border bg-surface px-6 py-3 sticky top-0 z-30 shadow-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-accent text-white shadow-lg shadow-indigo-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">AI Change Impact Engine</h1>
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent border border-accent/20">
                v1.0-prod
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <GitPullRequest className="h-3 w-3 text-purple-400" />
                {currentPreset === "ecommerce" ? "repo-ecommerce/pull/142" : "repo-ecommerce/pull/143"}
              </span>
              <span>•</span>
              <span className="text-slate-400">Branch: <code className="text-slate-300">feat/payment-currency</code></span>
            </div>
          </div>
        </div>

        {/* Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Preset Selector */}
          <div className="flex items-center rounded-lg bg-surface-raised p-1 border border-border text-xs">
            <button
              onClick={() => onSelectPreset("ecommerce")}
              className={`rounded px-3 py-1.5 font-medium transition-all ${
                currentPreset === "ecommerce"
                  ? "bg-accent text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              High-Risk Scenario
            </button>
            <button
              onClick={() => onSelectPreset("docs")}
              className={`rounded px-3 py-1.5 font-medium transition-all ${
                currentPreset === "docs"
                  ? "bg-accent text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Low-Risk Doc
            </button>
          </div>

          {/* Custom Trigger */}
          <button
            onClick={onOpenCustomModal}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span>Custom Diff</span>
          </button>

          {/* Re-analyze */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-accent/10 border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Analyzing..." : "Re-Run"}</span>
          </button>

          {/* Status & Latency Pills */}
          <div className="flex items-center gap-2 pl-2 border-l border-border/80">
            {executionMs !== undefined && (
              <span className="flex items-center gap-1 rounded bg-slate-800/80 px-2 py-1 text-[11px] font-mono text-emerald-400 border border-slate-700/80">
                <Activity className="h-3 w-3" />
                {executionMs}ms
              </span>
            )}
            <span
              className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium border ${
                isGatewayOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
              title={isGatewayOnline ? "Connected to Node.js Gateway" : "Offline Mode (Using Simulated Engine)"}
            >
              {isGatewayOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isGatewayOnline ? "Gateway Live" : "Local Engine"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
