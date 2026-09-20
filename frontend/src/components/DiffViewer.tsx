import React, { useState } from "react";
import { 
  FileCode2, 
  Copy, 
  Check, 
  AlertTriangle, 
  Code2
} from "lucide-react";
import { ChangedSymbol } from "../types/analysis";

interface DiffViewerProps {
  rawDiff: string;
  changedSymbols: ChangedSymbol[];
  onSelectSymbol?: (symbolId: string) => void;
}

interface DiffLine {
  type: "addition" | "deletion" | "context" | "header" | "meta";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  associatedSymbol?: ChangedSymbol;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  rawDiff,
  changedSymbols,
  onSelectSymbol,
}) => {
  const [copied, setCopied] = useState(false);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse raw unified diff into line models
  const parsedLines = React.useMemo(() => {
    const lines = rawDiff.split("\n");
    const result: DiffLine[] = [];
    let oldCounter = 0;
    let newCounter = 0;

    lines.forEach((line) => {
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ")) {
        result.push({ type: "meta", content: line });
      } else if (line.startsWith("@@")) {
        // Chunk header: @@ -15,7 +15,9 @@
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldCounter = parseInt(match[1], 10);
          newCounter = parseInt(match[2], 10);
        }
        result.push({ type: "header", content: line });
      } else if (line.startsWith("+")) {
        const lineNum = newCounter++;
        // Find associated symbol if any line intersects
        const assoc = changedSymbols.find((s) => s.diff_lines_intersected?.includes(lineNum));
        result.push({
          type: "addition",
          newLineNumber: lineNum,
          content: line.slice(1),
          associatedSymbol: assoc,
        });
      } else if (line.startsWith("-")) {
        const lineNum = oldCounter++;
        const assoc = changedSymbols.find((s) => s.diff_lines_intersected?.includes(lineNum));
        result.push({
          type: "deletion",
          oldLineNumber: lineNum,
          content: line.slice(1),
          associatedSymbol: assoc,
        });
      } else {
        const oldNum = oldCounter++;
        const newNum = newCounter++;
        result.push({
          type: "context",
          oldLineNumber: oldNum,
          newLineNumber: newNum,
          content: line.startsWith(" ") ? line.slice(1) : line,
        });
      }
    });

    return result;
  }, [rawDiff, changedSymbols]);

  const displayLines = showOnlyChanges
    ? parsedLines.filter((l) => l.type === "addition" || l.type === "deletion" || l.type === "header")
    : parsedLines;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-xl flex flex-col overflow-hidden">
      {/* Diff Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-raised/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs font-bold text-white">Unified Git Diff & AST Symbol Mapper</span>
          <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-mono text-slate-400 border border-border">
            {changedSymbols.length} mutated symbol{changedSymbols.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnlyChanges(!showOnlyChanges)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors border ${
              showOnlyChanges
                ? "bg-accent/20 border-accent/40 text-accent font-semibold"
                : "bg-surface border-border text-slate-400 hover:text-white"
            }`}
          >
            {showOnlyChanges ? "Showing Changes Only" : "Show All Context"}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded bg-surface border border-border px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            title="Copy raw unified diff to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? "Copied!" : "Copy Diff"}</span>
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto font-mono text-xs leading-relaxed max-h-[560px] scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {displayLines.map((line, idx) => {
              if (line.type === "meta") {
                return (
                  <tr key={idx} className="bg-surface text-slate-500 text-[11px]">
                    <td className="w-12 px-2 py-0.5 text-right select-none border-r border-border/40"></td>
                    <td className="w-12 px-2 py-0.5 text-right select-none border-r border-border/40"></td>
                    <td className="px-4 py-0.5 italic">{line.content}</td>
                  </tr>
                );
              }

              if (line.type === "header") {
                return (
                  <tr key={idx} className="bg-accent/10 text-accent font-bold text-[11px]">
                    <td className="w-12 px-2 py-1 text-right select-none border-r border-border/60">...</td>
                    <td className="w-12 px-2 py-1 text-right select-none border-r border-border/60">...</td>
                    <td className="px-4 py-1 flex items-center justify-between">
                      <span>{line.content}</span>
                      <span className="text-[10px] text-accent/80 font-normal">Hunk Boundary</span>
                    </td>
                  </tr>
                );
              }

              if (line.type === "addition") {
                return (
                  <tr key={idx} className="bg-emerald-950/30 hover:bg-emerald-950/50 transition-colors text-emerald-300">
                    <td className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-border/40"></td>
                    <td className="w-12 px-2 py-0.5 text-right select-none text-emerald-500 font-bold border-r border-border/40">
                      {line.newLineNumber}
                    </td>
                    <td className="px-4 py-0.5 whitespace-pre">
                      <span className="text-emerald-500 select-none mr-2">+</span>
                      <span>{line.content}</span>
                      {line.associatedSymbol && (
                        <button
                          onClick={() => onSelectSymbol?.(line.associatedSymbol!.entity_id)}
                          className={`ml-3 inline-flex items-center gap-1 rounded px-2 py-0.2 text-[10px] font-bold tracking-wide uppercase transition-all shadow-sm ${
                            line.associatedSymbol.is_breaking_candidate
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30"
                          }`}
                          title={`AST Symbol: ${line.associatedSymbol.qualified_name} (Click to inspect)`}
                        >
                          {line.associatedSymbol.is_breaking_candidate ? (
                            <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                          ) : (
                            <Code2 className="h-2.5 w-2.5 text-cyan-400" />
                          )}
                          <span>AST: {line.associatedSymbol.change_nature}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }

              if (line.type === "deletion") {
                return (
                  <tr key={idx} className="bg-rose-950/30 hover:bg-rose-950/50 transition-colors text-rose-300">
                    <td className="w-12 px-2 py-0.5 text-right select-none text-rose-500 font-bold border-r border-border/40">
                      {line.oldLineNumber}
                    </td>
                    <td className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-border/40"></td>
                    <td className="px-4 py-0.5 whitespace-pre">
                      <span className="text-rose-500 select-none mr-2">-</span>
                      <span>{line.content}</span>
                      {line.associatedSymbol && (
                        <button
                          onClick={() => onSelectSymbol?.(line.associatedSymbol!.entity_id)}
                          className="ml-3 inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.2 text-[10px] font-bold text-rose-300 border border-rose-500/40 tracking-wide uppercase hover:bg-rose-500/30 shadow-sm"
                          title={`Deleted signature/body in ${line.associatedSymbol.qualified_name}`}
                        >
                          <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                          <span>AST: {line.associatedSymbol.change_nature}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }

              // Context lines
              return (
                <tr key={idx} className="hover:bg-surface-raised/50 transition-colors text-slate-300">
                  <td className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-border/40">
                    {line.oldLineNumber}
                  </td>
                  <td className="w-12 px-2 py-0.5 text-right select-none text-slate-600 border-r border-border/40">
                    {line.newLineNumber}
                  </td>
                  <td className="px-4 py-0.5 whitespace-pre">
                    <span className="text-transparent select-none mr-2"> </span>
                    <span>{line.content}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Pill */}
      <div className="flex items-center justify-between border-t border-border bg-surface-raised/40 px-4 py-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>Green = Added code</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 inline-block"></span>
            <span>Red = Removed code</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>Pills = Tree-sitter AST mapped mutations</span>
          </span>
        </div>
        <span className="font-mono text-slate-500">Diff Parser v1.0</span>
      </div>
    </div>
  );
};
