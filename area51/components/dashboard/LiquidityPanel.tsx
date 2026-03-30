"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export default function LiquidityPanel({ state: _state, onAction }: Props) {
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [shares, setShares] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function addLiquidity() {
    if (!amount0 || !amount1) return;
    setBusy(true); setStatus(null);
    try {
      await onAction("addLiquidity", {
        amount0: BigInt(Math.floor(parseFloat(amount0) * 1e18)).toString(),
        amount1: BigInt(Math.floor(parseFloat(amount1) * 1e18)).toString(),
      });
      setStatus("liquidity added"); setAmount0(""); setAmount1("");
    } catch (e) { setStatus(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function requestWithdrawal() {
    if (!shares) return;
    setBusy(true); setStatus(null);
    try {
      await onAction("requestWithdrawal", { shares });
      setStatus("withdrawal requested");
    } catch (e) { setStatus(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="control-card">
      <div className="field-label">Liquidity</div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>ADD</button>
        <button className={`tab-btn ${tab === "remove" ? "active" : ""}`} onClick={() => setTab("remove")}>REMOVE</button>
      </div>

      {tab === "add" ? (
        <div className="flex flex-col gap-3">
          <div>
            <div className="field-label">Token 0</div>
            <input className="input-field" type="number" min="0" placeholder="0.00" value={amount0} onChange={(e) => setAmount0(e.target.value)} />
          </div>
          <div>
            <div className="field-label">Token 1</div>
            <input className="input-field" type="number" min="0" placeholder="0.00" value={amount1} onChange={(e) => setAmount1(e.target.value)} />
          </div>
          <button className="btn btn-start w-full" onClick={addLiquidity} disabled={busy || !amount0 || !amount1}>
            {busy ? "PENDING..." : "ADD LIQUIDITY"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="field-label">Share Amount</div>
            <input className="input-field" type="number" min="0" placeholder="0.00" value={shares} onChange={(e) => setShares(e.target.value)} />
          </div>
          <p className="stat-sub" style={{ marginBottom: "4px" }}>
            Keeper computes plaintext ratio from sealed shares before finalising.
          </p>
          <button className="btn btn-ghost w-full" onClick={requestWithdrawal} disabled={busy || !shares}>
            {busy ? "PENDING..." : "REQUEST WITHDRAWAL"}
          </button>
        </div>
      )}

      {status && <p className="stat-sub mt-2">{status}</p>}
    </div>
  );
}
