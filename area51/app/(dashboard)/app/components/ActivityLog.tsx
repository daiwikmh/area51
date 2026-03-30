"use client";

import type { DashboardState } from "@/lib/dashboard";

type Props = { state: DashboardState };

const BADGE_CLASS: Record<string, string> = {
  ok: "badge-ok",
  info: "badge-info",
  warn: "badge-warn",
  error: "badge-error",
};

export default function ActivityLog({ state }: Props) {
  const entries = [...state.log].reverse().slice(0, 30);

  return (
    <div className="card p-4">
      <div className="field-label mb-3">ACTIVITY LOG</div>
      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="log-card val-muted">no events yet</div>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="log-card flex items-center gap-2">
              <span className={`badge ${BADGE_CLASS[e.type] ?? "badge-info"}`}>
                {e.type.toUpperCase()}
              </span>
              <span style={{ color: "var(--text-primary)" }}>{e.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
