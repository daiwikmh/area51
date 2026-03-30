import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="sidebar">
        <div className="px-5 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="val-neon text-base font-bold tracking-widest">FUGAZI</span>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            FHE Dark Pool
          </p>
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          <Link href="/app" className="nav-link">Dashboard</Link>
          <Link href="/swap" className="nav-link">Swap</Link>
          <Link href="/pool" className="nav-link">Liquidity</Link>
          <Link href="/batches" className="nav-link">Batches</Link>
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
