import React, { useState } from "react";
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Terminal, 
  Filter, 
  FlaskConical, 
  Play, 
  CheckCircle
} from "lucide-react";
import { TestPlan } from "../types/analysis";

interface TestPlanTableProps {
  testPlan: TestPlan;
}

export const TestPlanTable: React.FC<TestPlanTableProps> = ({ testPlan }) => {
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  
  // Interactive Live In-Browser Test Execution Simulation state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [completedTests, setCompletedTests] = useState<string[]>([]);
  const [testLogs, setTestLogs] = useState<string[]>([]);

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
    const cmd = paths.includes(".py") ? `pytest ${paths} -v` : `npm test -- ${paths}`;
    navigator.clipboard.writeText(cmd);
    setCopiedPath("ALL");
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleSimulateExecution = () => {
    if (isRunningTests || testPlan.selected_tests.length === 0) return;
    setIsRunningTests(true);
    setTestProgress(0);
    setCompletedTests([]);
    setTestLogs(["$ initializing pytest regression test runner...", "$ target reachability matrix loaded: " + testPlan.selected_tests.length + " suites"]);

    let index = 0;
    const interval = setInterval(() => {
      if (index < testPlan.selected_tests.length) {
        const test = testPlan.selected_tests[index];
        setCompletedTests((prev) => [...prev, test.test_file_path]);
        setTestLogs((prev) => [
          ...prev,
          `PASSED [${Math.round(((index + 1) / testPlan.selected_tests.length) * 100)}%] ${test.test_file_path} (confidence: ${Math.round(test.confidence * 100)}%)`
        ]);
        setTestProgress(Math.round(((index + 1) / testPlan.selected_tests.length) * 100));
        index++;
      } else {
        clearInterval(interval);
        setTestLogs((prev) => [
          ...prev,
          `================= ${testPlan.selected_tests.length} passed in 0.84s (RTS avoided ${testPlan.total_repo_tests - testPlan.selected_tests_count} unneeded suites) =================`
        ]);
        setIsRunningTests(false);
      }
    }, 450);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "P1":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "P2":
        return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      default:
        return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Regression Test Selection (RTS) Plan
            </h2>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              {Math.round(testPlan.test_reduction_ratio * 100)}% Avoidance Ratio
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Static call graph reachability mapping prioritizing tests covering modified AST symbols.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Simulate Test Run */}
          {testPlan.selected_tests.length > 0 && (
            <button
              onClick={handleSimulateExecution}
              disabled={isRunningTests}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Play className={`h-3 w-3 fill-current ${isRunningTests ? "animate-spin" : ""}`} />
              <span>{isRunningTests ? `Running... (${testProgress}%)` : "Simulate Test Run"}</span>
            </button>
          )}

          {/* Copy All Button */}
          {testPlan.selected_tests.length > 0 && (
            <button
              onClick={copyAllSelectedCommands}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
            >
              {copiedPath === "ALL" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Terminal className="h-3.5 w-3.5 text-accent" />
              )}
              <span>{copiedPath === "ALL" ? "Copied Command!" : "Copy Test Command"}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-lg bg-surface-raised/80 p-3 border border-border">
          <span className="text-[11px] text-slate-400 font-mono">Selected Suites</span>
          <p className="text-base font-bold text-white mt-0.5">
            {testPlan.selected_tests_count} <span className="text-xs font-normal text-slate-500">/ {testPlan.total_repo_tests} total</span>
          </p>
        </div>
        <div className="rounded-lg bg-surface-raised/80 p-3 border border-border">
          <span className="text-[11px] text-slate-400 font-mono">Avoided Suites</span>
          <p className="text-base font-bold text-emerald-400 mt-0.5">
            {testPlan.total_repo_tests - testPlan.selected_tests_count} suites
          </p>
        </div>
        <div className="rounded-lg bg-surface-raised/80 p-3 border border-border">
          <span className="text-[11px] text-slate-400 font-mono">P1 Critical</span>
          <p className="text-base font-bold text-rose-400 mt-0.5">
            {testPlan.p1_count} suite{testPlan.p1_count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-lg bg-surface-raised/80 p-3 border border-border">
          <span className="text-[11px] text-slate-400 font-mono">Est. CI Saved</span>
          <p className="text-base font-bold text-accent mt-0.5">
            ~{(testPlan.total_repo_tests - testPlan.selected_tests_count) * 4} min
          </p>
        </div>
      </div>

      {/* Live In-Browser Execution Progress & Console */}
      {(isRunningTests || testLogs.length > 0) && (
        <div className="rounded-xl border border-emerald-500/30 bg-black/50 p-4 font-mono text-xs text-slate-300 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5">
              <Terminal className="h-4 w-4" />
              <span>Simulated In-Browser Test Execution Runner</span>
            </span>
            <span>{testProgress}% Complete</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${testProgress}%` }}
            />
          </div>

          <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-400 pt-1">
            {testLogs.map((log, idx) => (
              <div key={idx} className={log.includes("PASSED") ? "text-emerald-400" : log.includes("====") ? "text-cyan-300 font-bold" : ""}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Filter Bar */}
      <div className="flex items-center gap-2 text-xs">
        <Filter className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-slate-400 font-medium">Filter by Priority:</span>
        <div className="flex rounded-lg bg-surface-raised p-1 border border-border">
          {["ALL", "P1", "P2", "P3"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                priorityFilter === p
                  ? "bg-accent text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p === "ALL" ? `All (${testPlan.selected_tests.length})` : p}
            </button>
          ))}
        </div>
      </div>

      {/* Test Suites Table */}
      {filteredTests.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface-raised p-8 text-center text-slate-400">
          <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-200">Zero Tests Selected For Execution</p>
          <p className="text-xs text-slate-500 mt-1">
            Documentation or non-code change detected. 100% test avoidance achieved without compromising test coverage.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-raised text-slate-400 border-b border-border">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">Priority</th>
                <th className="py-2.5 px-3.5 font-semibold">Test Suite File</th>
                <th className="py-2.5 px-3.5 font-semibold">Reachability Rationale</th>
                <th className="py-2.5 px-3.5 font-semibold">Confidence</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredTests.map((test, idx) => {
                const isCompleted = completedTests.includes(test.test_file_path);

                return (
                  <tr key={idx} className="hover:bg-surface-raised/60 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${getPriorityBadge(test.priority)}`}>
                        {test.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-white font-medium">
                      <div className="flex items-center gap-1.5">
                        {isCompleted && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        <span className="truncate max-w-[260px]" title={test.test_file_path}>
                          {test.test_file_path}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 text-[11px] leading-relaxed max-w-sm">
                      {test.rationale}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-400">
                      <span className="text-emerald-400 font-bold">{Math.round(test.confidence * 100)}%</span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => copyTestCommand(test.test_file_path)}
                        className="inline-flex items-center gap-1 rounded bg-surface border border-border px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                        title="Copy CLI execution command"
                      >
                        {copiedPath === test.test_file_path ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-400" />
                        )}
                        <span>{copiedPath === test.test_file_path ? "Copied" : "Copy"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
