"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

function truncate(addr: string) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "0x0000...0000";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function BatchQueuePanel({ state, onAction }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const progress = state.batchSize > 0
    ? Math.min(100, ((state.batchSize - state.blocksLeft) / state.batchSize) * 100)
    : 0;

  const canExecute =
    !busy &&
    !state.batchExecuted &&
    state.blocksLeft === 0 &&
    state.currentBatch > 0;

  async function executeBatch() {
    setBusy(true);
    setStatus(null);
    try {
      await onAction("executeBatch", { batch: state.currentBatch });
      setStatus(`batch ${state.currentBatch} executed`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="field-label">BATCH QUEUE</span>
        {state.currentBatch > 0 && (
          <span className="val-muted text-xs">#{state.currentBatch}</span>
        )}
      </div>

      <div className="card-inset overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 px-3 field-label">#</th>
              <th className="text-left py-2 px-3 field-label">OWNER</th>
              <th className="text-left py-2 px-3 field-label">BATCH</th>
              <th className="text-left py-2 px-3 field-label">AMOUNT</th>
              <th className="text-left py-2 px-3 field-label">DIRECTION</th>
            </tr>
          </thead>
          <tbody>
            {state.orders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 px-3 text-center val-muted"
                >
                  no orders
                </td>
              </tr>
            ) : (
              state.orders.map((o) => (
                <tr
                  key={`${o.batch}-${o.index}`}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td className="py-2 px-3 val-muted">{o.index}</td>
                  <td className="py-2 px-3 val-primary">{truncate(o.owner)}</td>
                  <td className="py-2 px-3 val-muted">{o.batch}</td>
                  <td className="py-2 px-3 val-muted">[encrypted]</td>
                  <td className="py-2 px-3 val-muted">[encrypted]</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="val-muted">
              {state.blocksLeft > 0 ? `${state.blocksLeft} blocks left` : "ripe"}
            </span>
            <span className="val-muted">{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          className="btn-neon whitespace-nowrap"
          onClick={executeBatch}
          disabled={!canExecute}
        >
          {busy ? "PENDING..." : "EXECUTE BATCH"}
        </button>
      </div>

      {status && (
        <div className="mt-2 text-xs val-muted">{status}</div>
      )}
    </div>
  );
}
