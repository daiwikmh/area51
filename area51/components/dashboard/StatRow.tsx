"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = { state: DashboardState };

type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  valueClass: string;
  glow?: string;
};

function StatCard({ label, value, sub, valueClass, glow }: StatCardProps) {
  return (
    <div className={`stat-card ${glow ?? ""}`}>
      <div className="stat-label">{label}</div>
      <p className={`stat-value ${valueClass}`}>{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

function formatPrice(raw: string): string {
  if (!raw || raw === "0") return "—";
  try {
    return (Number(BigInt(raw)) / 1e18).toFixed(4);
  } catch {
    return "—";
  }
}

export default function StatRow({ state }: Props) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        label="Batch"
        value={state.currentBatch > 0 ? `#${state.currentBatch}` : "—"}
        valueClass="val-neon"
        glow="glow-neon"
      />
      <StatCard
        label="Blocks Left"
        value={state.blocksLeft > 0 ? String(state.blocksLeft) : "0"}
        sub="until execution"
        valueClass="val-accent"
      />
      <StatCard
        label="Orders"
        value={String(state.orderCount)}
        sub="in queue"
        valueClass="val-primary"
      />
      <StatCard
        label="Last Price"
        value={formatPrice(state.lastPrice)}
        sub="WAD"
        valueClass="val-neon"
        glow={state.lastPrice !== "0" ? "glow-neon" : ""}
      />
      <StatCard
        label="Noise"
        value={state.noiseInjected ? "INJECTED" : "PENDING"}
        valueClass={state.noiseInjected ? "val-success" : "val-warning"}
        glow={state.noiseInjected ? "glow-success" : ""}
      />
      <StatCard
        label="Keeper"
        value={state.keeperOnline ? "LIVE" : "OFFLINE"}
        valueClass={state.keeperOnline ? "val-success" : "val-danger"}
        glow={state.keeperOnline ? "glow-success" : "glow-danger"}
      />
    </div>
  );
}
