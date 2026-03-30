"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = { state: DashboardState };

type StatCardProps = {
  label: string;
  value: string;
  valueClass: string;
};

function StatCard({ label, value, valueClass }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="field-label">{label}</div>
      <div className={`text-lg font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function formatPrice(raw: string): string {
  if (!raw || raw === "0") return "—";
  try {
    const wad = BigInt(raw);
    const val = Number(wad) / 1e18;
    return val.toFixed(4);
  } catch {
    return "—";
  }
}

export default function StatRow({ state }: Props) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="BATCH"
        value={state.currentBatch > 0 ? `#${state.currentBatch}` : "—"}
        valueClass="val-neon"
      />
      <StatCard
        label="BLOCKS LEFT"
        value={state.blocksLeft > 0 ? String(state.blocksLeft) : "—"}
        valueClass="val-accent"
      />
      <StatCard
        label="ORDERS"
        value={String(state.orderCount)}
        valueClass="val-primary"
      />
      <StatCard
        label="LAST PRICE"
        value={formatPrice(state.lastPrice)}
        valueClass="val-neon"
      />
      <StatCard
        label="NOISE"
        value={state.noiseInjected ? "INJECTED" : "PENDING"}
        valueClass={state.noiseInjected ? "val-success" : "val-warning"}
      />
      <StatCard
        label="KEEPER"
        value={state.keeperOnline ? "LIVE" : "OFFLINE"}
        valueClass={state.keeperOnline ? "val-success" : "val-danger"}
      />
    </div>
  );
}
