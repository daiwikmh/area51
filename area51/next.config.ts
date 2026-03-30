import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "ethers",
    "cofhejs",
    "three",
    "three-stdlib",
    "@react-three/fiber",
    "@react-three/drei",
  ],
};

export default nextConfig;
