"use client";

import { useState } from "react";
import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

function fmtWad(raw: string): string {
  try {
    const val = Number(BigInt(raw)) / 1e18;
    return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
  } catch {
    return "—";
  }
}

export default function ReservePanel({ state: _state, onAction }: Props) {
  const [reserve0, setReserve0] = useState<string | null>(null);
  const [reserve1, setReserve1] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const impliedPrice = (() => {
    if (!reserve0 || !reserve1) return null;
    try {
      const r0 = Number(BigInt(reserve0)) / 1e18;
      const r1 = Number(BigInt(reserve1)) / 1e18;
      if (r0 === 0) return null;
      return (r1 / r0).toFixed(6);
    } catch {
      return null;
    }
  })();

  async function unseal() {
    setBusy(true);
    setErr(null);
    try {
      const data = await onAction("unsealReserves", {}) as {
        reserve0?: string;
        reserve1?: string;
        error?: string;
      };
      if (data?.error) {
        setErr(data.error);
      } else {
        setReserve0(data?.reserve0 ?? null);
        setReserve1(data?.reserve1 ?? null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const unsealed = reserve0 !== null && reserve1 !== null;

  return (
    <div className="card p-4">
      <div className="field-label mb-3">RESERVES</div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Keeper-only. Decrypts reserves server-side via async FHE.
      </p>

      <div className="flex flex-col gap-2 mb-4">
        <div className="metric-card">
          <div className="field-label">RESERVE 0</div>
          <div className="val-neon text-base">
            {unsealed ? fmtWad(reserve0!) : "[sealed]"}
          </div>
        </div>
        <div className="metric-card">
          <div className="field-label">RESERVE 1</div>
          <div className="val-neon text-base">
            {unsealed ? fmtWad(reserve1!) : "[sealed]"}
          </div>
        </div>
        {impliedPrice && (
          <div className="metric-card">
            <div className="field-label">IMPLIED PRICE</div>
            <div className="val-accent text-base">{impliedPrice}</div>
          </div>
        )}
      </div>

      <button className="btn-neon w-full" onClick={unseal} disabled={busy}>
        {busy ? "UNSEALING..." : "UNSEAL"}
      </button>

      {err && <div className="mt-2 text-xs val-danger">{err}</div>}
    </div>
  );
}
