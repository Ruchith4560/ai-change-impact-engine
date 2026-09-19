import React, { useState } from "react";
import { 
  Sparkles, 
  CheckSquare, 
  Square, 
  AlertOctagon, 
  ShieldAlert, 
  Cpu,
  Bot
} from "lucide-react";
import { AIExplanation } from "../types/analysis";

interface AIReviewerCardProps {
  explanation: AIExplanation;
  limitations: string[];
}

export const AIReviewerCard: React.FC<AIReviewerCardProps> = ({ explanation, limitations }) => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalChecklist = explanation.review_checklist.length;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-5">
      {/* Header with Provenance Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              AI Code Review Assistant & Synthesis
            </h2>
            <p className="text-xs text-slate-400">
              Evidence-grounded synthesis generated strictly over deterministic AST reachability facts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-mono font-semibold border ${
              explanation.is_generated_by_llm
                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                : "bg-blue-500/10 text-blue-300 border-blue-500/30"
            }`}
          >
            {explanation.is_generated_by_llm ? (
              <>
                <Bot className="h-3 w-3 text-purple-400" />
                Gemini 2.5 Flash
              </>
            ) : (
              <>
                <Cpu className="h-3 w-3 text-blue-400" />
                Deterministic Template Engine
              </>
            )}
          </span>
        </div>
      </div>

      {/* Summary Markdown Rendering */}
      <div className="rounded-lg bg-surface-raised border border-border/80 p-4 text-xs text-slate-300 leading-relaxed space-y-2">
        {explanation.summary_markdown.split("\n\n").map((para, idx) => {
          if (para.startsWith("### ")) {
            return (
              <h4 key={idx} className="text-sm font-bold text-white tracking-tight pt-1">
                {para.replace("### ", "")}
              </h4>
            );
          }
          if (para.startsWith("- ") || para.startsWith("1. ")) {
            return (
              <div key={idx} className="pl-3 border-l-2 border-accent/40 font-mono text-[11px] text-slate-300">
                {para}
              </div>
            );
          }
          return <p key={idx}>{para}</p>;
        })}
      </div>

      {/* Interactive Code Review Checklist */}
      {explanation.review_checklist.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-accent" />
              Targeted Reviewer Verification Checklist
            </span>
            <span className="text-xs font-mono text-slate-400">
              {completedCount} / {totalChecklist} completed
            </span>
          </div>

          <div className="space-y-2">
            {explanation.review_checklist.map((item, idx) => {
              const isDone = !!checkedItems[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                    isDone
                      ? "border-emerald-500/30 bg-emerald-500/5 text-slate-400"
                      : "border-border bg-surface-raised hover:border-slate-600 text-slate-200"
                  }`}
                >
                  <button className="mt-0.5 text-slate-400 hover:text-white transition-colors">
                    {isDone ? (
                      <CheckSquare className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                  <span className={`text-xs leading-relaxed ${isDone ? "line-through text-slate-500" : ""}`}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Probable Failure Modes */}
      {explanation.failure_modes.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
            High-Probability Regression Scenarios
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {explanation.failure_modes.map((fm, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-200/90 leading-relaxed"
              >
                {fm}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limitations / Transparency Callouts */}
      {limitations.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Analysis Transparency & Boundary Disclaimers:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-amber-300/80">
              {limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
