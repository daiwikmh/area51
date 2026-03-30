"use client";

import { useEffect, useState } from "react";
import {
  connectWallet,
  disconnectWallet,
  getEVMClient,
  subscribeProvider,
  FHENIX_CHAIN_ID,
} from "@/lib/metamask";
import type { WalletState } from "@/lib/metamask";

const EMPTY: WalletState = { accounts: [], chainId: "", connected: false };

function truncate(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function isCorrectChain(chainId: string) {
  return chainId.toLowerCase() === FHENIX_CHAIN_ID.toLowerCase();
}

export function ConnectWallet() {
  const [wallet, setWallet] = useState<WalletState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // restore state if already connected
    getEVMClient()
      .then((client) => {
        const provider = client.getProvider();
        return provider.request({ method: "eth_accounts" }).then((accounts) => {
          if (!Array.isArray(accounts) || accounts.length === 0) return;
          return provider.request({ method: "eth_chainId" }).then((chainId) => {
            setWallet({ accounts: accounts as string[], chainId: chainId as string, connected: true });
          });
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = subscribeProvider(
      (accounts) => setWallet((w) => ({ ...w, accounts, connected: accounts.length > 0 })),
      (chainId) => setWallet((w) => ({ ...w, chainId })),
      () => setWallet(EMPTY)
    );
    return unsub;
  }, []);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const state = await connectWallet();
      setWallet(state);
    } catch (e) {
      setError(e instanceof Error ? e.message : "connection failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectWallet();
      setWallet(EMPTY);
    } catch {
      setWallet(EMPTY);
    } finally {
      setBusy(false);
    }
  }

  if (wallet.connected && wallet.accounts[0]) {
    const wrongChain = !isCorrectChain(wallet.chainId);
    return (
      <div className="flex flex-col gap-2">
        <div className="metric-card">
          <div className="stat-label" style={{ marginBottom: "4px" }}>Connected</div>
          <p
            className="val-neon"
            style={{ fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {truncate(wallet.accounts[0])}
          </p>
          {wrongChain && (
            <p className="stat-sub val-warning" style={{ marginTop: "4px" }}>
              Wrong network
            </p>
          )}
        </div>
        <button
          className="btn btn-ghost w-full"
          style={{ fontSize: "11px" }}
          onClick={handleDisconnect}
          disabled={busy}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="btn btn-neon w-full"
        style={{ fontSize: "11px" }}
        onClick={handleConnect}
        disabled={busy}
      >
        {busy ? "CONNECTING..." : "CONNECT WALLET"}
      </button>
      {error && <p className="stat-sub val-danger">{error}</p>}
    </div>
  );
}
