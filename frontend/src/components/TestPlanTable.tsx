import React, { useState } from "react";
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal, 
  Filter, 
  FlaskConical
} from "lucide-react";
import { TestPlan } from "../types/analysis";

interface TestPlanTableProps {
  testPlan: TestPlan;
}

export const TestPlanTable: React.FC<TestPlanTableProps> = ({ testPlan }) => {
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const filteredTests = testPlan.selected_tests.filter((t) => {
    if (priorityFilter === "ALL") return true;
    return t.priority === priorityFilter;
  });

  const copyTestCommand = (testPath: string) => {
    const cmd = testPath.endsWith(".py")
      ? `pytest ${testPath}`
      : `npm test -- ${testPath}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPath(testPath);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const copyAllSelectedCommands = () => {
    const paths = testPlan.selected_tests.map((t) => t.test_file_path).join(" ");
    const cmd = paths.includes(".py") ? `pytest ${paths}` : `npm test -- ${paths}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPath("ALL");
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "P2":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      default:
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Intelligent Regression Test Selection (RTS)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Causal test plan bypassing unimpacted suites to minimize CI build latency with zero test-leakage risk
          </p>
        </div>

        {/* Action button */}
        {testPlan.selected_tests_count > 0 && (
          <button
            onClick={copyAllSelectedCommands}
            className="flex items-center gap-1.5 rounded-lg bg-surface-raised border border-border hover:border-slate-500 px-3 py-1.5 text-xs font-mono text-slate-200 transition-colors"
          >
            {copiedPath === "ALL" ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span>{copiedPath === "ALL" ? "Copied All CLI Run Commands" : "Copy CI Command"}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-slate-400 font-medium">
          <Filter className="h-3 w-3" /> Filter:
        </span>
        <button
          onClick={() => setPriorityFilter("ALL")}
          className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all ${
            priorityFilter === "ALL"
              ? "bg-accent text-white font-bold shadow-sm"
              : "bg-surface-raised text-slate-400 hover:text-white"
          }`}
        >
          ALL ({testPlan.selected_tests_count})
        </button>
        <button
          onClick={() => setPriorityFilter("P1")}
          className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all ${
            priorityFilter === "P1"
              ? "bg-rose-500 text-white font-bold shadow-sm"
              : "bg-surface-raised text-slate-400 hover:text-white"
          }`}
        >
          P1 Direct ({testPlan.p1_count})
        </button>
        <button
          onClick={() => setPriorityFilter("P2")}
          className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all ${
            priorityFilter === "P2"
              ? "bg-orange-500 text-white font-bold shadow-sm"
              : "bg-surface-raised text-slate-400 hover:text-white"
          }`}
        >
          P2 Downstream ({testPlan.p2_count})
        </button>
        <button
          onClick={() => setPriorityFilter("P3")}
          className={`rounded px-2.5 py-1 font-mono text-[11px] transition-all ${
            priorityFilter === "P3"
              ? "bg-purple-500 text-white font-bold shadow-sm"
              : "bg-surface-raised text-slate-400 hover:text-white"
          }`}
        >
          P3 Historical ({testPlan.p3_count})
        </button>
      </div>

      {/* Table */}
      {filteredTests.length === 0 ? (
        <div className="rounded-lg bg-surface-raised border border-border/80 p-8 text-center text-slate-400">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">No tests match current filter</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {testPlan.selected_tests_count === 0
              ? "Non-code changes do not require executing regression test suites."
              : "Change filters above to inspect other priority categories."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised text-slate-400 uppercase font-mono text-[11px] border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Test Suite File</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Hops</th>
                <th className="py-2.5 px-3">Selection Rationale</th>
                <th className="py-2.5 px-3 text-right">Run Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-surface">
              {filteredTests.map((test, idx) => (
                <tr key={idx} className="hover:bg-surface-raised/60 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${getPriorityBadge(
                        test.priority
                      )}`}
                    >
                      {test.priority}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-200 font-medium">
                    {test.test_file_path}
                  </td>
                  <td className="py-3 px-3 font-mono text-accent text-[11px]">
                    {test.target_entity_id?.split("::").pop() || "Repository Scope"}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                    {test.path_distance} {test.path_distance === 1 ? "hop" : "hops"}
                  </td>
                  <td className="py-3 px-3 text-slate-300 text-xs max-w-sm">
                    {test.rationale}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => copyTestCommand(test.test_file_path)}
                      className="inline-flex items-center gap-1 rounded bg-surface-raised px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:text-white border border-border hover:border-slate-500 transition-colors"
                      title="Copy terminal command to run this test"
                    >
                      {copiedPath === test.test_file_path ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Terminal className="h-3 w-3 text-slate-400" />
                          <span>Copy CLI</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer reduction summary */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 font-mono">
        <span>
          Selected <strong className="text-white">{testPlan.selected_tests_count}</strong> of{" "}
          <strong className="text-white">{testPlan.total_repo_tests}</strong> available repo test suites
        </span>
        <span className="text-emerald-400 font-semibold">
          Estimated CI Execution Reduction: ~{Math.round(testPlan.test_reduction_ratio * 100)}%
        </span>
      </div>
    </div>
  );
};
