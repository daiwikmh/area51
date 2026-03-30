"use client";

import { useEffect, useState } from "react";
import { getProvider } from "@/lib/metamask";

function truncate(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function initials(addr: string) {
  return addr.slice(2, 4).toUpperCase();
}

export function SidebarProfile() {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    provider.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list.length > 0) setAddress(list[0]);
    }).catch(() => {});

    const handleAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAddress(list.length > 0 ? list[0] : null);
    };
    provider.on("accountsChanged", handleAccounts);
    provider.on("disconnect", () => setAddress(null));
    return () => {
      provider.removeListener?.("accountsChanged", handleAccounts);
    };
  }, []);

  if (!address) return null;

  return (
    <div
      className="flex items-center gap-2 px-2 py-2 rounded"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          background: "rgba(0,255,224,0.08)",
          border: "1px solid rgba(0,255,224,0.2)",
          fontSize: "9px",
          fontFamily: "var(--font-mono)",
          color: "var(--neon-cyan)",
          letterSpacing: "0.05em",
        }}
      >
        {initials(address)}
      </div>
      <div className="min-w-0 flex flex-col">
        <span style={{ fontSize: "11px", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
          {truncate(address)}
        </span>
        <span style={{ fontSize: "10px", color: "var(--text-ghost)" }}>Sepolia</span>
      </div>
    </div>
  );
}
