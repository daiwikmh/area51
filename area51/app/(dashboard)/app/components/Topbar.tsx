"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  error: string | null;
};

const MODE_DOT: Record<string, string> = {
  idle: "idle",
  live: "live",
  executing: "scanning",
  alert: "alert",
};

const MODE_LABEL: Record<string, string> = {
  idle: "KEEPER OFFLINE",
  live: `BATCH — LIVE`,
  executing: `EXECUTING`,
  alert: "STALE PRICE",
};

export default function Topbar({ state, error }: Props) {
  const dotClass = MODE_DOT[state.mode] ?? "idle";
  let label = MODE_LABEL[state.mode] ?? "KEEPER OFFLINE";

  if (state.mode === "live" && state.currentBatch > 0) {
    label = `BATCH ${state.currentBatch} — ${state.blocksLeft} BLOCKS`;
  } else if (state.mode === "executing") {
    label = `EXECUTING BATCH ${state.currentBatch}`;
  } else if (state.mode === "alert") {
    label = `STALE PRICE — BATCH ${state.currentBatch}`;
  }

  return (
    <div className="topbar">
      <span className={`status-dot ${dotClass}`} />
      <span
        className="text-xs font-mono font-semibold tracking-widest"
        style={{ color: dotClass === "idle" ? "var(--text-muted)" : "inherit" }}
      >
        {label}
      </span>
      {error && (
        <span className="ml-auto text-xs val-danger">ERR: {error}</span>
      )}
    </div>
  );
}
