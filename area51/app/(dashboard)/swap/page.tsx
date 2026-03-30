"use client";

import { useState, useEffect } from "react";
import SwapPanel from "../dashboard/components/SwapPanel";
import type { DashboardState } from "@/lib/dashboard";
import { EMPTY_STATE } from "@/lib/dashboard";

export default function SwapPage() {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);

  useEffect(() => {
    fetch("/api/state")
      .then((r) => r.ok ? r.json() : EMPTY_STATE)
      .then(setState)
      .catch(() => {});
  }, []);

  async function onAction(action: string, payload: Record<string, unknown>) {
    if (action === "submitOrder") {
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    return {};
  }

  return (
    <main className="overflow-y-auto p-6 flex-1">
      <div className="field-label text-lg mb-4">Swap</div>
      <div className="max-w-sm">
        <SwapPanel state={state} onAction={onAction} />
      </div>
    </main>
  );
}
