import React, { useState, useEffect } from "react";
import { 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  Globe, 
  Cpu, 
  Layers, 
  Sliders
} from "lucide-react";
import { 
  AnalysisApiClient, 
  PRESET_BACKENDS 
} from "../services/api";
import { BackendTargetType, BackendTargetConfig } from "../types/analysis";

interface BackendConnectionHubProps {
  onBackendChange?: (config: BackendTargetConfig) => void;
}

export const BackendConnectionHub: React.FC<BackendConnectionHubProps> = ({ onBackendChange }) => {
  const [activeTarget, setActiveTarget] = useState<BackendTargetConfig>(AnalysisApiClient.getActiveTarget());
  const [isOpen, setIsOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ ok: boolean; latencyMs: number; statusText: string } | null>(null);
  const [customUrl, setCustomUrl] = useState("http://localhost:8000/api/v1");

  const runPingTest = async (url?: string) => {
    setIsPinging(true);
    try {
      const res = await AnalysisApiClient.testTargetPing(url);
      setPingResult(res);
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    runPingTest();
    const unsubscribe = AnalysisApiClient.subscribeToTargetChange((config) => {
      setActiveTarget(config);
      onBackendChange?.(config);
      runPingTest(config.url);
    });
    return unsubscribe;
  }, []);

  const handleSelectTarget = (type: BackendTargetType) => {
    AnalysisApiClient.setActiveTarget(type, type === "custom" ? customUrl : undefined);
    setActiveTarget(AnalysisApiClient.getActiveTarget());
    runPingTest();
  };

  const getTargetIcon = (type: BackendTargetType) => {
    switch (type) {
      case "render":
        return <Globe className="h-3.5 w-3.5 text-cyan-400" />;
      case "gateway":
        return <Layers className="h-3.5 w-3.5 text-emerald-400" />;
      case "python":
        return <Cpu className="h-3.5 w-3.5 text-amber-400" />;
      case "custom":
        return <Sliders className="h-3.5 w-3.5 text-purple-400" />;
      case "offline":
        return <Server className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button / Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg bg-surface-raised/90 hover:bg-surface-raised border border-border px-2.5 py-1.5 text-xs text-slate-200 hover:border-slate-500 transition-all shadow-sm"
        title="Configure active backend connection target"
      >
        <span className="flex items-center gap-1.5 font-medium">
          {getTargetIcon(activeTarget.type)}
          <span className="font-semibold text-slate-200 hidden sm:inline">{activeTarget.name}</span>
        </span>

        {/* Live Latency & Status Dot */}
        <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/70">
          <span className="relative flex h-2 w-2">
            {pingResult?.ok ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
          </span>

          {pingResult && (
            <span className={`font-mono text-[11px] ${pingResult.ok ? "text-emerald-400 font-semibold" : "text-amber-400"}`}>
              {pingResult.latencyMs}ms
            </span>
          )}

          <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Modal / Dropdown Card */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-xl border border-border bg-surface p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-accent" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Backend Connection Manager</h4>
              </div>
              <button
                onClick={() => runPingTest()}
                disabled={isPinging}
                className="flex items-center gap-1 rounded bg-surface-raised px-2 py-1 text-[11px] text-slate-300 hover:text-white border border-border transition-colors disabled:opacity-50"
                title="Test ping now"
              >
                <RefreshCw className={`h-3 w-3 ${isPinging ? "animate-spin text-accent" : ""}`} />
                <span>Test Ping</span>
              </button>
            </div>

            {/* Current Target Status Diagnostic */}
            <div className="mb-4 rounded-lg bg-surface-raised/70 border border-border p-2.5 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-white flex items-center gap-1.5">
                  {pingResult?.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span>Status: {pingResult ? pingResult.statusText : "Testing..."}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                  {activeTarget.url}
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface text-slate-300 border border-border">
                {pingResult ? `${pingResult.latencyMs} ms` : "..."}
              </span>
            </div>

            {/* Target Options List */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Select Backend Target:
              </label>

              {(Object.keys(PRESET_BACKENDS) as BackendTargetType[]).map((type) => {
                const config = PRESET_BACKENDS[type];
                const isSelected = activeTarget.type === type;

                return (
                  <button
                    key={type}
                    onClick={() => handleSelectTarget(type)}
                    className={`w-full text-left rounded-lg p-2.5 transition-all border ${
                      isSelected
                        ? "border-accent bg-accent/10 shadow-sm"
                        : "border-border/60 bg-surface-raised/40 hover:bg-surface-raised hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getTargetIcon(type)}
                        <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-slate-300"}`}>
                          {config.name}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      {config.description}
                    </p>
                    {type !== "offline" && (
                      <code className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                        {type === "custom" ? customUrl : config.url}
                      </code>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom URL Input if Custom selected */}
            {activeTarget.type === "custom" && (
              <div className="pt-2 border-t border-border">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Custom Base URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="http://localhost:8000/api/v1"
                    className="flex-1 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 font-mono text-xs text-white focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={() => handleSelectTarget("custom")}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/80 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
