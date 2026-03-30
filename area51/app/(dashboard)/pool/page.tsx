"use client";

import { useState } from "react";
import LiquidityPanel from "../dashboard/components/LiquidityPanel";
import type { DashboardState } from "@/lib/dashboard";
import { EMPTY_STATE } from "@/lib/dashboard";

export default function PoolPage() {
  const [state] = useState<DashboardState>(EMPTY_STATE);

  async function onAction(action: string, payload: Record<string, unknown>) {
    if (action === "addLiquidity") {
      await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "addLiquidity", ...payload }),
      });
    }
    return {};
  }

  return (
    <main className="overflow-y-auto p-6 flex-1">
      <div className="field-label text-lg mb-4">Liquidity</div>
      <div className="max-w-sm">
        <LiquidityPanel state={state} onAction={onAction} />
      </div>
    </main>
  );
}
