import { createConfig, http } from "wagmi";
import { defineChain } from "viem";

export const fhenixNitrogen = defineChain({
  id: 8008148,
  name: "Fhenix Nitrogen",
  nativeCurrency: { name: "tFHE", symbol: "tFHE", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.nitrogen.fhenix.zone"] },
  },
  blockExplorers: {
    default: { name: "Fhenix Explorer", url: "https://explorer.nitrogen.fhenix.zone" },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [fhenixNitrogen],
  transports: {
    [fhenixNitrogen.id]: http(),
  },
});
