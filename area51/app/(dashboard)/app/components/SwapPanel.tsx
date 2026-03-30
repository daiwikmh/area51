"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";
import { encryptUint128, encryptBool } from "@/lib/fhe";

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
    try {
      const val = Number(BigInt(state.lastPrice)) / 1e18;
      return val.toFixed(4);
    } catch {
      return null;
    }
  })();

  const estimated = (() => {
    if (!amount || !lastPriceFmt) return null;
    const a = parseFloat(amount);
    const p = parseFloat(lastPriceFmt);
    if (!a || !p) return null;
    return isBuy ? (a * p).toFixed(4) : (a / p).toFixed(4);
  })();

  async function submit() {
    if (!amount || parseFloat(amount) <= 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const WAD = 10n ** 18n;
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const [encAmount, encIsBuyVal] = await Promise.all([
        encryptUint128(amountWei),
        encryptBool(isBuy),
      ]);
      const minOutWei = minOut ? BigInt(Math.floor(parseFloat(minOut) * 1e18)) : 0n * WAD;
      await onAction("submitOrder", {
        encAmount,
        encIsBuy: encIsBuyVal,
        minOut: minOutWei.toString(),
      });
      setStatus("order submitted");
      setAmount("");
      setMinOut("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="control-card">
      <div className="field-label mb-3">SWAP</div>

      <div className="tab-row">
        <button
          className={`tab-btn ${isBuy ? "active" : ""}`}
          onClick={() => setIsBuy(true)}
        >
          BUY
        </button>
        <button
          className={`tab-btn ${!isBuy ? "active" : ""}`}
          onClick={() => setIsBuy(false)}
        >
          SELL
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className="field-label">AMOUNT</div>
          <input
            className="input-field"
            type="number"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <div className="field-label">MIN OUTPUT</div>
          <input
            className="input-field"
            type="number"
            min="0"
            placeholder="0.00"
            value={minOut}
            onChange={(e) => setMinOut(e.target.value)}
          />
        </div>
      </div>

      {estimated && (
        <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          est. output{" "}
          <span className="val-neon">{estimated}</span>
          {" "}@ {lastPriceFmt}
        </div>
      )}

      <button
        className="btn-neon w-full mt-4"
        onClick={submit}
        disabled={busy || !amount}
      >
        {busy ? "ENCRYPTING..." : "SUBMIT ORDER"}
      </button>

      {status && (
        <div className="mt-2 text-xs val-muted">{status}</div>
      )}
    </div>
  );
}
