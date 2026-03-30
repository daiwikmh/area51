"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = { state: DashboardState };

function fmt(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function ActivityLog({ state }: Props) {
  const entries = [...state.log].reverse().slice(0, 40);

  return (
    <div className="log-card" style={{ minHeight: "220px", maxHeight: "280px" }}>
      <div className="log-header">
        <div className="log-header-left">Activity Log</div>
        <span className="log-count">[{state.log.length}] entries</span>
      </div>
      <div className="log-body">
        {entries.length === 0 ? (
          <div className="log-entry">
            <span className="log-msg" style={{ color: "var(--text-muted)" }}>
              no events yet
            </span>
          </div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="log-entry">
              <span className="log-time">{fmt(e.ts)}</span>
              <span className={`log-badge ${e.type}`}>{e.type}</span>
              <span className="log-msg">{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
