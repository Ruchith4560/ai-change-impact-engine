import React, { useState } from "react";
import { 
  Send, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  AlertCircle
} from "lucide-react";
import { AnalysisApiClient } from "../services/api";

interface WebhookSimulatorProps {
  prNumber: number;
  prTitle: string;
  rawDiff: string;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  prNumber,
  prTitle,
  rawDiff,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<"pull_request.opened" | "pull_request.synchronize" | "ping">("pull_request.synchronize");
  const [secret, setSecret] = useState("github_webhook_secret_key_prod");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    statusCode: number;
    response: any;
    signature: string;
    durationMs: number;
  } | null>(null);

  const handleDispatch = async () => {
    setIsSending(true);
    try {
      const res = await AnalysisApiClient.simulateWebhook(selectedEvent, {
        prNumber,
        title: prTitle,
        rawDiff,
      }, secret);
      setResult(res);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              GitHub Webhook & CI/CD Ingestion Simulator
            </h3>
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30">
              HMAC-SHA256
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate real GitHub Pull Request webhook payloads with constant-time cryptographic signature verification (<code className="text-slate-300">X-Hub-Signature-256</code>).
          </p>
        </div>

        <button
          onClick={handleDispatch}
          disabled={isSending}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50 self-start sm:self-auto"
        >
          <Send className={`h-3.5 w-3.5 ${isSending ? "animate-pulse" : ""}`} />
          <span>{isSending ? "Verifying..." : "Dispatch Webhook Event"}</span>
        </button>
      </div>

      {/* Simulator Form Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Event Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            GitHub Event Type:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["pull_request.synchronize", "pull_request.opened", "ping"] as const).map((evt) => (
              <button
                key={evt}
                onClick={() => setSelectedEvent(evt)}
                className={`rounded-lg p-2 text-xs font-semibold transition-all border text-center ${
                  selectedEvent === evt
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300 shadow-sm"
                    : "border-border bg-surface-raised/40 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                }`}
              >
                {evt === "pull_request.synchronize" ? "PR Synced" : evt === "pull_request.opened" ? "PR Opened" : "Ping"}
              </button>
            ))}
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>HMAC Shared Secret:</span>
            <span className="text-[11px] text-slate-500 font-mono normal-case">crypto.timingSafeEqual</span>
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="bg-transparent font-mono text-xs text-white w-full focus:outline-none"
              placeholder="github_webhook_secret..."
            />
          </div>
        </div>
      </div>

      {/* Live Dispatch Diagnostics & Code Inspection */}
      {result && (
        <div className="rounded-xl border border-border bg-surface-raised/60 p-4 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-400" />
              )}
              <div>
                <span className="font-bold text-xs text-white">
                  {result.success ? "200 OK — Webhook Verified & Processed" : `Error ${result.statusCode}`}
                </span>
                <span className="ml-2 font-mono text-[11px] text-slate-400">
                  ({result.durationMs}ms latency)
                </span>
              </div>
            </div>

            <span className="rounded bg-surface px-2.5 py-1 font-mono text-[11px] text-cyan-300 border border-border">
              {result.signature.slice(0, 24)}...
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {/* Request Headers */}
            <div className="rounded-lg border border-border bg-surface p-3 space-y-1 text-slate-300">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                Outgoing HTTP Headers:
              </div>
              <div><span className="text-cyan-400">POST</span> /api/v1/webhook/github</div>
              <div><span className="text-slate-500">Host:</span> {AnalysisApiClient.getActiveTarget().url}</div>
              <div><span className="text-slate-500">X-GitHub-Event:</span> {selectedEvent.split(".")[0]}</div>
              <div className="truncate"><span className="text-slate-500">X-Hub-Signature-256:</span> {result.signature}</div>
              <div><span className="text-slate-500">Content-Type:</span> application/json</div>
            </div>

            {/* Gateway Response */}
            <div className="rounded-lg border border-border bg-surface p-3 space-y-1 text-slate-300">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-sans">
                Gateway Verified Response:
              </div>
              <pre className="text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="flex items-center gap-2 rounded-lg bg-surface-raised/40 border border-border/80 px-3.5 py-2.5 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>
          Constant-time HMAC comparison prevents timing-attack side-channel vulnerabilities, verifying authenticity before any AST parsing or graph operations execute.
        </span>
      </div>
    </div>
  );
};
