"use client";

import { createEVMClient } from "@metamask/connect-evm";
import type { EIP1193Provider } from "@metamask/connect-evm";

export const FHENIX_CHAIN_ID = "0x7a31d4"; // 8008148

export type WalletState = {
  accounts: string[];
  chainId: string;
  connected: boolean;
};

type EVMClient = Awaited<ReturnType<typeof createEVMClient>>;

let _client: EVMClient | null = null;

export async function getEVMClient(): Promise<EVMClient> {
  if (_client) return _client;

  _client = await createEVMClient({
    dapp: { name: "area51" },
    api: {
      supportedNetworks: {
        [FHENIX_CHAIN_ID]: "https://api.nitrogen.fhenix.zone",
      },
    },
    eventHandlers: {
      connect: ({ chainId, accounts }) => {
        console.log("connected", chainId, accounts);
      },
      disconnect: () => {
        console.log("disconnected");
      },
    },
  });

  return _client;
}

export async function connectWallet(): Promise<WalletState> {
  const client = await getEVMClient();
  const { accounts, chainId } = await client.connect({
    chainIds: [FHENIX_CHAIN_ID],
  });
  return { accounts: accounts as string[], chainId: chainId as string, connected: true };
}

export async function disconnectWallet(): Promise<void> {
  if (!_client) return;
  const provider = _client.getProvider() as EIP1193Provider;
  await provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
  _client = null;
}

export function getProvider(): EIP1193Provider | null {
  if (!_client) return null;
  return _client.getProvider() as EIP1193Provider;
}

export function subscribeProvider(
  onAccounts: (accounts: string[]) => void,
  onChain: (chainId: string) => void,
  onDisconnect: () => void
): () => void {
  const provider = getProvider();
  if (!provider) return () => {};

  const handleAccounts = (accounts: unknown) => onAccounts(accounts as string[]);
  const handleChain = (chainId: unknown) => onChain(chainId as string);

  provider.on("accountsChanged", handleAccounts);
  provider.on("chainChanged", handleChain);
  provider.on("disconnect", onDisconnect);

  return () => {
    provider.removeListener?.("accountsChanged", handleAccounts);
    provider.removeListener?.("chainChanged", handleChain);
    provider.removeListener?.("disconnect", onDisconnect);
  };
}
