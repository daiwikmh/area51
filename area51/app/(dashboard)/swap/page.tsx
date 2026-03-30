import SwapPanel from "../app/components/SwapPanel";
import { EMPTY_STATE } from "@/lib/dashboard";

async function getState() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/state`, { next: { revalidate: 0 } });
    if (!res.ok) return EMPTY_STATE;
    return res.json();
  } catch {
    return EMPTY_STATE;
  }
}

export default async function SwapPage() {
  const state = await getState();
  return (
    <main className="overflow-y-auto p-6 flex-1">
      <h1 className="field-label text-lg mb-4">SWAP</h1>
      <div className="max-w-sm">
        <SwapPanel
          state={state}
          onAction={async () => {}}
        />
      </div>
    </main>
  );
}
