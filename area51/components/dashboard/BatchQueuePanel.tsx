"use client";

import { useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import type { DashboardState } from "@/lib/dashboard";
import { getProvider } from "@/lib/metamask";
import { POOL_ABI, POOL_ADDRESS } from "@/lib/contracts";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

function truncate(addr: string) {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "0x0000…0000";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function BatchQueuePanel({ state, onAction }: Props) {
  const [busy, setBusy] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimBatch, setClaimBatch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  const progress = state.batchSize > 0
    ? Math.min(100, ((state.batchSize - state.blocksLeft) / state.batchSize) * 100)
    : 0;

  const canExecute = !busy && !state.batchExecuted && state.blocksLeft === 0 && state.currentBatch > 0;

  async function executeBatch() {
    setBusy(true); setStatus(null);
    try {
      await onAction("executeBatch", { batch: state.currentBatch });
      setStatus(`batch ${state.currentBatch} executed`);
    } catch (e) { setStatus(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function claimOutput() {
    const batch = parseInt(claimBatch);
    if (isNaN(batch) || batch < 1) return;
    setClaimBusy(true); setClaimStatus(null);
    try {
      const raw = getProvider();
      if (!raw) throw new Error("wallet not connected");
      const provider = new BrowserProvider(raw as ConstructorParameters<typeof BrowserProvider>[0]);
      const signer = await provider.getSigner();
      const pool = new Contract(POOL_ADDRESS, POOL_ABI, signer);
      const tx = await pool.claimOutput(batch);
      await tx.wait();
      setClaimStatus(`claimed batch ${batch} — decrypt pending`);
      setClaimBatch("");
    } catch (e) { setClaimStatus(e instanceof Error ? e.message : "error"); }
    finally { setClaimBusy(false); }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="field-label" style={{ marginBottom: 0 }}>Batch Queue</span>
        {state.currentBatch > 0 && (
          <span className="val-neon" style={{ fontSize: "11px" }}>#{state.currentBatch}</span>
        )}
      </div>

      <div className="card-inset overflow-hidden mb-4">
        <table className="w-full" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["#", "Owner", "Batch", "Amount", "Direction"].map((h) => (
                <th key={h} className="text-left py-2 px-3 field-label" style={{ marginBottom: 0 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-center val-muted" style={{ fontSize: "11px" }}>
                  no orders
                </td>
              </tr>
            ) : (
              state.orders.map((o) => (
                <tr key={`${o.batch}-${o.index}`} style={{ borderBottom: "1px solid rgba(35,35,35,0.6)" }}>
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

      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="stat-sub" style={{ margin: 0 }}>
              {state.blocksLeft > 0 ? `${state.blocksLeft} blocks left` : "ripe"}
            </span>
            <span className="stat-sub" style={{ margin: 0 }}>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="btn btn-neon" onClick={executeBatch} disabled={!canExecute} style={{ whiteSpace: "nowrap" }}>
          {busy ? "PENDING..." : "EXECUTE BATCH"}
        </button>
      </div>

      {status && <p className="stat-sub mb-3">{status}</p>}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
        <div className="field-label mb-2">Claim Output</div>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            type="number"
            min="1"
            placeholder="batch #"
            value={claimBatch}
            onChange={(e) => setClaimBatch(e.target.value)}
          />
          <button
            className="btn btn-ghost"
            style={{ whiteSpace: "nowrap", fontSize: "11px" }}
            onClick={claimOutput}
            disabled={claimBusy || !claimBatch}
          >
            {claimBusy ? "PENDING..." : "CLAIM"}
          </button>
        </div>
        {claimStatus && <p className="stat-sub mt-2">{claimStatus}</p>}
      </div>
    </div>
  );
}
