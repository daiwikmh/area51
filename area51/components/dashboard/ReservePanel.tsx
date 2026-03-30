"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

function fmtWad(raw: string): string {
  try { return (Number(BigInt(raw)) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 6 }); }
  catch { return "—"; }
}

export default function ReservePanel({ state: _state, onAction }: Props) {
  const [reserve0, setReserve0] = useState<string | null>(null);
  const [reserve1, setReserve1] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keeperBusy, setKeeperBusy] = useState(false);
  const [keeperStatus, setKeeperStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const impliedPrice = (() => {
    if (!reserve0 || !reserve1) return null;
    try {
      const r0 = Number(BigInt(reserve0)) / 1e18;
      const r1 = Number(BigInt(reserve1)) / 1e18;
      if (r0 === 0) return null;
      return (r1 / r0).toFixed(6);
    } catch { return null; }
  })();

  async function unseal() {
    setBusy(true); setErr(null);
    try {
      const data = await onAction("unsealReserves", {}) as { reserve0?: string; reserve1?: string; error?: string };
      if (data?.error) { setErr(data.error); }
      else { setReserve0(data?.reserve0 ?? null); setReserve1(data?.reserve1 ?? null); }
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function runKeeper() {
    setKeeperBusy(true); setKeeperStatus(null);
    try {
      const res = await fetch("/api/keeper", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const steps: string[] = data.steps ?? [];
      setKeeperStatus(`batch ${data.batch} — ${steps.join(", ")}`);
    } catch (e) { setKeeperStatus(e instanceof Error ? e.message : "error"); }
    finally { setKeeperBusy(false); }
  }

  const unsealed = reserve0 !== null && reserve1 !== null;

  return (
    <div className="card p-4">
      <div className="field-label mb-3">Reserves</div>
      <p className="stat-sub mb-4">Keeper-only. Decrypts reserves via async FHE coprocessor.</p>

      <div className="flex flex-col gap-2 mb-4">
        <div className="metric-card">
          <div className="field-label" style={{ marginBottom: "6px" }}>Reserve 0</div>
          <p className="stat-value val-neon">{unsealed ? fmtWad(reserve0!) : "[sealed]"}</p>
        </div>
        <div className="metric-card">
          <div className="field-label" style={{ marginBottom: "6px" }}>Reserve 1</div>
          <p className="stat-value val-neon">{unsealed ? fmtWad(reserve1!) : "[sealed]"}</p>
        </div>
        {impliedPrice && (
          <div className="metric-card">
            <div className="field-label" style={{ marginBottom: "6px" }}>Implied Price</div>
            <p className="stat-value val-accent">{impliedPrice}</p>
          </div>
        )}
      </div>

      <button className="btn btn-neon w-full" onClick={unseal} disabled={busy}>
        {busy ? "UNSEALING..." : "UNSEAL RESERVES"}
      </button>
      {err && <p className="stat-sub val-danger mt-2">{err}</p>}

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "12px" }}>
        <div className="field-label mb-2">Price Keeper</div>
        <p className="stat-sub mb-3">Posts buy/sell price for current batch. Takes ~30s for CoFHE decrypt.</p>
        <button className="btn btn-ghost w-full" onClick={runKeeper} disabled={keeperBusy}>
          {keeperBusy ? "RUNNING..." : "RUN KEEPER"}
        </button>
        {keeperStatus && <p className="stat-sub mt-2">{keeperStatus}</p>}
      </div>
    </div>
  );
}
