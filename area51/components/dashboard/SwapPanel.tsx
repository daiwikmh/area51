"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";
import { encryptUint128, encryptBool, initCofhejs } from "@/lib/fhe";
import { getProvider } from "@/lib/metamask";
import { BrowserProvider } from "ethers";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

export default function SwapPanel({ state, onAction }: Props) {
  const [amount, setAmount] = useState("");
  const [minOut, setMinOut] = useState("");
  const [isBuy, setIsBuy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const lastPriceFmt = (() => {
    if (!state.lastPrice || state.lastPrice === "0") return null;
    try { return (Number(BigInt(state.lastPrice)) / 1e18).toFixed(4); } catch { return null; }
  })();

  const estimated = (() => {
    if (!amount || !lastPriceFmt) return null;
    const a = parseFloat(amount), p = parseFloat(lastPriceFmt);
    if (!a || !p) return null;
    return isBuy ? (a * p).toFixed(4) : (a / p).toFixed(4);
  })();

  async function submit() {
    if (!amount || parseFloat(amount) <= 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const rawProvider = getProvider();
      if (!rawProvider) throw new Error("wallet not connected");
      const ethersProvider = new BrowserProvider(rawProvider as ConstructorParameters<typeof BrowserProvider>[0]);
      const signer = await ethersProvider.getSigner();
      await initCofhejs(rawProvider, signer);

      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const [encAmount, encIsBuyVal] = await Promise.all([
        encryptUint128(amountWei),
        encryptBool(isBuy),
      ]);
      const address = await signer.getAddress();
      await onAction("submitOrder", {
        encAmount,
        encIsBuy: encIsBuyVal,
        wallet: address,
        minOut: minOut ? BigInt(Math.floor(parseFloat(minOut) * 1e18)).toString() : "0",
      });
      setStatus("order submitted");
      setAmount(""); setMinOut("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "error");
    } finally { setBusy(false); }
  }

  return (
    <div className="control-card">
      <div className="field-label">Swap</div>

      <div className="tab-row">
        <button className={`tab-btn ${isBuy ? "active" : ""}`} onClick={() => setIsBuy(true)}>BUY</button>
        <button className={`tab-btn ${!isBuy ? "active" : ""}`} onClick={() => setIsBuy(false)}>SELL</button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="field-label">Amount</div>
          <input className="input-field" type="number" min="0" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <div className="field-label">Min Output</div>
          <input className="input-field" type="number" min="0" placeholder="0.00" value={minOut} onChange={(e) => setMinOut(e.target.value)} />
        </div>
      </div>

      {estimated && (
        <div className="metric-card mt-3">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Est. Output</span>
            <span className="val-neon" style={{ fontSize: "13px" }}>{estimated}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Price</span>
            <span className="val-muted" style={{ fontSize: "11px" }}>{lastPriceFmt}</span>
          </div>
        </div>
      )}

      <button className="btn btn-neon w-full mt-4" onClick={submit} disabled={busy || !amount}>
        {busy ? "ENCRYPTING..." : "SUBMIT ORDER"}
      </button>

      {status && <p className="stat-sub mt-2">{status}</p>}
    </div>
  );
}
