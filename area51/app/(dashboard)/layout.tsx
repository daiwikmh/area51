import Link from "next/link";
import { ConnectWallet } from "./components/ConnectWallet";
import { SidebarProfile } from "./components/SidebarProfile";
import { TelegramConnect } from "./components/TelegramConnect";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden">
      <aside className="sidebar">
        <div className="px-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="val-neon text-base font-bold tracking-widest">area51</span>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            FHE Dark Pool
          </p>
        </div>

        <nav className="mt-3 flex flex-col gap-1 flex-1">
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
          <Link href="/swap" className="nav-link">Swap</Link>
          <Link href="/pool" className="nav-link">Liquidity</Link>
          <Link href="/batches" className="nav-link">Batches</Link>
        </nav>

        <div className="px-4 mt-auto flex flex-col gap-3" style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", paddingBottom: "16px" }}>
          <ConnectWallet />
          <SidebarProfile />
          <TelegramConnect />
          <div className="flex items-center justify-center gap-1.5" style={{ paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: "10px", color: "var(--text-ghost)", fontFamily: "var(--font-mono)" }}>
              Powered by
            </span>
            <span style={{ fontSize: "10px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", opacity: 0.7 }}>
              Fhenix CoFHE
            </span>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
