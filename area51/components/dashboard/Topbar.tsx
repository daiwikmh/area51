"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = {
  state: DashboardState;
  error: string | null;
};

const MODE_DOT: Record<string, string> = {
  idle:      "idle",
  live:      "scanning",
  executing: "bridging",
  alert:     "alert",
};

export default function Topbar({ state, error }: Props) {
  const dot = MODE_DOT[state.mode] ?? "idle";

  let label = "KEEPER OFFLINE";
  if (state.mode === "live" && state.currentBatch > 0) {
    label = `BATCH ${state.currentBatch} — ${state.blocksLeft} BLOCKS`;
  } else if (state.mode === "executing") {
    label = `EXECUTING BATCH ${state.currentBatch}`;
  } else if (state.mode === "alert") {
    label = `STALE PRICE — BATCH ${state.currentBatch}`;
  }

  return (
    <div className="topbar">
      <div className="status-badge">
        <div className={`status-dot ${dot}`} />
        <span
          className="font-mono"
          style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.08em" }}
        >
          {label}
        </span>
      </div>
      {error && (
        <span className="ml-auto val-danger" style={{ fontSize: "10px" }}>
          ERR: {error}
        </span>
      )}
    </div>
  );
}
