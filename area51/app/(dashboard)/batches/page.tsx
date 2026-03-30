import { EMPTY_STATE } from "@/lib/dashboard";
import type { DashboardState } from "@/lib/dashboard";

async function getState(): Promise<DashboardState> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/state`, { next: { revalidate: 0 } });
    if (!res.ok) return EMPTY_STATE;
    return res.json();
  } catch {
    return EMPTY_STATE;
  }
}

export default async function BatchesPage() {
  const state = await getState();

  const batches = state.currentBatch > 0
    ? Array.from({ length: state.currentBatch }, (_, i) => state.currentBatch - i)
    : [];

  return (
    <main className="overflow-y-auto p-6 flex-1">
      <h1 className="field-label text-lg mb-4">BATCH HISTORY</h1>
      <div className="card-inset">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="text-left py-2 px-3 field-label">BATCH</th>
              <th className="text-left py-2 px-3 field-label">STATUS</th>
              <th className="text-left py-2 px-3 field-label">ORDERS</th>
              <th className="text-left py-2 px-3 field-label">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 px-3 text-center val-muted">
                  no batches
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-3 val-neon">#{b}</td>
                  <td className="py-2 px-3">
                    {b < state.currentBatch ? (
                      <span className="badge badge-ok">EXECUTED</span>
                    ) : state.batchExecuted ? (
                      <span className="badge badge-ok">EXECUTED</span>
                    ) : (
                      <span className="badge badge-info">OPEN</span>
                    )}
                  </td>
                  <td className="py-2 px-3 val-muted">
                    {b === state.currentBatch ? state.orderCount : "—"}
                  </td>
                  <td className="py-2 px-3 val-muted">
                    {b === state.currentBatch && state.lastPrice !== "0"
                      ? (Number(BigInt(state.lastPrice)) / 1e18).toFixed(4)
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
