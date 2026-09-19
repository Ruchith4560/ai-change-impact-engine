import React, { useState } from "react";
import { X, Play, Sliders } from "lucide-react";
import { RunFullAnalysisPayload } from "../types/analysis";

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RunFullAnalysisPayload) => void;
  isLoading: boolean;
}

const DEFAULT_SAMPLE_DIFF = `diff --git a/src/payment_service.ts b/src/payment_service.ts
index 1111111..2222222 100644
--- a/src/payment_service.ts
+++ b/src/payment_service.ts
@@ -17,2 +17,2 @@ export class PaymentService {
-  public async processTransaction(orderId: string, amount: number): Promise<PaymentResult> {
+  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult> {
`;

const DEFAULT_SAMPLE_FILES = {
  "src/payment_service.ts": `export interface PaymentResult {
  transactionId: string;
  status: "SUCCESS" | "FAILED";
  amount: number;
}

export class PaymentService {
  public async processTransaction(orderId: string, amount: number, currency: string = "USD"): Promise<PaymentResult> {
    if (amount <= 0) throw new Error("Invalid");
    return { transactionId: "tx_123", status: "SUCCESS", amount };
  }
}`,
  "src/checkout_service.ts": `import { PaymentService } from "./payment_service";

export class CheckoutService {
  constructor(private paymentService: PaymentService) {}

  public async executeCheckout(orderId: string, amount: number) {
    return this.paymentService.processTransaction(orderId, amount);
  }
}`,
  "src/order_controller.ts": `import { CheckoutService } from "./checkout_service";

export class OrderController {
  constructor(private checkoutService: CheckoutService) {}

  public async handlePostOrder(req: any) {
    return this.checkoutService.executeCheckout(req.orderId, req.amount);
  }
}`,
  "tests/payment_service.spec.ts": `import { PaymentService } from "../src/payment_service";

test("processes charge", async () => {
  const svc = new PaymentService();
  const res = await svc.processTransaction("1", 100);
  expect(res.status).toBe("SUCCESS");
});`,
  "tests/checkout_service.spec.ts": `import { CheckoutService } from "../src/checkout_service";

test("executes checkout", async () => {
  const svc = new CheckoutService(null as any);
  await svc.executeCheckout("1", 50);
});`,
};

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [repoId, setRepoId] = useState("custom-org/service-repo");
  const [prNumber, setPrNumber] = useState(105);
  const [rawDiff, setRawDiff] = useState(DEFAULT_SAMPLE_DIFF);
  const [filesJson, setFilesJson] = useState(JSON.stringify(DEFAULT_SAMPLE_FILES, null, 2));

  if (!isOpen) return null;

  const handleRun = () => {
    try {
      const parsedFiles = JSON.parse(filesJson);
      onSubmit({
        repositoryId: repoId,
        prNumber: Number(prNumber),
        rawDiff,
        files: parsedFiles,
      });
      onClose();
    } catch {
      alert("Invalid JSON format in repository files dictionary.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl w-full max-w-2xl flex flex-col gap-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Analyze Custom Code Change (PR / Diff)
              </h2>
              <p className="text-xs text-slate-400">
                Execute end-to-end AST parsing, graph reachability, and risk scoring on custom code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-surface-raised hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Repository ID
            </label>
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono text-white focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Pull Request #
            </label>
            <input
              type="number"
              value={prNumber}
              onChange={(e) => setPrNumber(parseInt(e.target.value, 10))}
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-mono text-white focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Raw Unified Git Diff
          </label>
          <textarea
            rows={5}
            value={rawDiff}
            onChange={(e) => setRawDiff(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised p-3 text-xs font-mono text-slate-200 focus:border-accent focus:outline-none leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
            Repository Head Files JSON <code>&#123; "path": "code" &#125;</code>
          </label>
          <textarea
            rows={6}
            value={filesJson}
            onChange={(e) => setFilesJson(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised p-3 text-xs font-mono text-slate-200 focus:border-accent focus:outline-none leading-relaxed"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isLoading ? "Running Pipeline..." : "Execute Master Analysis"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
