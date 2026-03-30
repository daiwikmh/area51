"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardState } from "@/lib/dashboard";
import { EMPTY_STATE } from "@/lib/dashboard";
import Topbar from "./Topbar";
import StatRow from "./StatRow";
import SwapPanel from "./SwapPanel";
import LiquidityPanel from "./LiquidityPanel";
import BatchQueuePanel from "./BatchQueuePanel";
import ActivityLog from "./ActivityLog";
import ReservePanel from "./ReservePanel";

const POLL_MS = 2000;

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchState() {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "fetch failed");
        return;
      }
      const data: DashboardState = await res.json();
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    }
  }

  useEffect(() => {
    fetchState();
    timerRef.current = setInterval(() => {
      if (!document.hidden) fetchState();
    }, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function onAction(action: string, payload: Record<string, unknown>) {
    if (action === "executeBatch") {
      await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchState();
    } else if (action === "submitOrder") {
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchState();
    } else if (action === "unsealReserves") {
      const res = await fetch("/api/unseal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "reserves", ...payload }),
      });
      return res.json();
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <Topbar state={state} error={error} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 min-w-0 overflow-y-auto p-5">
          <div className="space-y-4">
            <StatRow state={state} />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 flex flex-col gap-4">
                <SwapPanel state={state} onAction={onAction} />
                <LiquidityPanel state={state} onAction={onAction} />
              </div>
              <div className="col-span-2 flex flex-col gap-4">
                <BatchQueuePanel state={state} onAction={onAction} />
                <ActivityLog state={state} />
              </div>
            </div>
          </div>
        </main>
        <aside className="w-80 m-3 ml-0 self-start sticky top-3">
          <ReservePanel state={state} onAction={onAction} />
        </aside>
      </div>
    </div>
  );
}
