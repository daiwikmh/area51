import { createConfig, http } from "wagmi";
import { defineChain } from "viem";

export const fhenixNitrogen = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://ethereum-sepolia.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [fhenixNitrogen],
  transports: {
    [fhenixNitrogen.id]: http(),
  },
});
