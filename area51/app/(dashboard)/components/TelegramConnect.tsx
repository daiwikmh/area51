"use client";

import { useEffect, useState } from "react";
import { getProvider } from "@/lib/metamask";

type Status = "idle" | "loading" | "linked" | "error";

export function TelegramConnect() {
  const [status, setStatus] = useState<Status>("idle");
  const [username, setUsername] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);

  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;
    provider.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list.length > 0) check(list[0]);
    }).catch(() => {});
  }, []);

  async function check(addr: string) {
    setWallet(addr);
    try {
      const res = await fetch(`/api/telegram/status?wallet=${addr}`);
      const data = await res.json();
      if (data.linked) {
        setStatus("linked");
        setUsername(data.username ?? null);
      }
    } catch {}
  }

  async function connect() {
    const provider = getProvider();
    if (!provider) return;
    setStatus("loading");
    try {
      const accounts = await provider.request({ method: "eth_accounts" }) as string[];
      if (!accounts.length) { setStatus("error"); return; }
      const addr = accounts[0];
      setWallet(addr);

      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: addr }),
      });
      const { deepLink, error } = await res.json();
      if (error) { setStatus("error"); return; }

      window.open(deepLink, "_blank");
      // poll for link confirmation for up to 2 minutes
      const start = Date.now();
      const poll = setInterval(async () => {
        if (Date.now() - start > 120_000) { clearInterval(poll); setStatus("idle"); return; }
        const r = await fetch(`/api/telegram/status?wallet=${addr}`);
        const d = await r.json();
        if (d.linked) {
          clearInterval(poll);
          setStatus("linked");
          setUsername(d.username ?? null);
        }
      }, 3000);
    } catch {
      setStatus("error");
    }
  }

  async function unlink() {
    if (!wallet) return;
    setStatus("loading");
    await fetch("/api/telegram/unlink", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    setStatus("idle");
    setUsername(null);
  }

  if (status === "linked") {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className="flex items-center gap-2 px-2 py-2 rounded"
          style={{ background: "rgba(0,255,224,0.05)", border: "1px solid rgba(0,255,224,0.15)" }}
        >
          <span style={{ fontSize: "13px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.48.7-.96.44l-2.64-1.96-1.28 1.22c-.14.14-.26.26-.52.26l.18-2.66 4.7-4.24c.2-.18-.04-.28-.32-.1L7.6 14.5l-2.58-.8c-.56-.18-.58-.56.12-.82l10.1-3.9c.46-.18.86.1.7.82z" fill="var(--neon-cyan)" />
            </svg>
          </span>
          <div className="min-w-0 flex flex-col">
            <span style={{ fontSize: "11px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)" }}>
              {username ? `@${username}` : "Telegram linked"}
            </span>
            <span style={{ fontSize: "10px", color: "var(--text-ghost)" }}>notifications on</span>
          </div>
        </div>
        <button
          className="btn btn-ghost w-full"
          style={{ fontSize: "10px" }}
          onClick={unlink}
        >
          DISCONNECT TG
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn btn-ghost w-full"
      style={{ fontSize: "11px", gap: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={connect}
      disabled={status === "loading"}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.48.7-.96.44l-2.64-1.96-1.28 1.22c-.14.14-.26.26-.52.26l.18-2.66 4.7-4.24c.2-.18-.04-.28-.32-.1L7.6 14.5l-2.58-.8c-.56-.18-.58-.56.12-.82l10.1-3.9c.46-.18.86.1.7.82z" fill="currentColor" />
      </svg>
      {status === "loading" ? "OPENING..." : "CONNECT TELEGRAM"}
    </button>
  );
}
