import LiquidityPanel from "../app/components/LiquidityPanel";
import { EMPTY_STATE } from "@/lib/dashboard";

export default function PoolPage() {
  return (
    <main className="overflow-y-auto p-6 flex-1">
      <h1 className="field-label text-lg mb-4">LIQUIDITY</h1>
      <div className="max-w-sm">
        <LiquidityPanel state={EMPTY_STATE} onAction={async () => {}} />
      </div>
    </main>
  );
}
