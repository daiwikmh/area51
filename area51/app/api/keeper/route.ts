import { NextResponse } from "next/server";
import { ethers } from "ethers";

const WAD = 10n ** 18n;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;
const NOISE_MIN = 1n * WAD;
const NOISE_MAX = 100n * WAD;

const POOL_ABI = [
  "function keeper() view returns (address)",
  "function currentBatch() view returns (uint32)",
  "function batchExecuted(uint32) view returns (bool)",
  "function batchBuyPrice(uint32) view returns (uint256)",
  "function noiseInjected(uint32) view returns (bool)",
  "function requestDecryptReserves() external",
  "function getDecryptedReserves() view returns (uint256 r0, uint256 r1, bool ready)",
  "function postBatchPrice(uint32 batch, uint256 buyPrice, uint256 sellPrice) external",
  "function injectNoise(tuple(bytes data) encNoise) external",
];

function randomNoise(): bigint {
  const range = NOISE_MAX - NOISE_MIN;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return NOISE_MIN + rand;
}

async function pollDecryptedReserves(
  pool: ethers.Contract
): Promise<{ r0: bigint; r1: bigint }> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const [r0, r1, ready] = await pool.getDecryptedReserves();
    if (ready) return { r0, r1 };
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("decrypt timeout");
}

export async function POST(request: Request) {
  try {
    const rpcUrl = process.env.FHENIX_RPC_URL;
    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !privateKey || !poolAddress) {
      return NextResponse.json(
        { error: "missing env: FHENIX_RPC_URL, KEEPER_PRIVATE_KEY, POOL_ADDRESS" },
        { status: 500 }
      );
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const keeper = new ethers.Wallet(privateKey, provider);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, keeper);

    const onChainKeeper = await pool.keeper();
    if (onChainKeeper.toLowerCase() !== keeper.address.toLowerCase()) {
      return NextResponse.json(
        { error: `signer is not pool keeper` },
        { status: 403 }
      );
    }

    const batch = Number(await pool.currentBatch());
    const steps: string[] = [];

    if (await pool.batchExecuted(batch)) {
      return NextResponse.json({ batch, status: "already_executed", steps });
    }

    if ((await pool.batchBuyPrice(batch)) > 0n) {
      steps.push("price_already_posted");
    } else {
      const tx1 = await pool.requestDecryptReserves();
      await tx1.wait();
      steps.push("decrypt_requested");

      const { r0, r1 } = await pollDecryptedReserves(pool);
      if (r0 === 0n || r1 === 0n) {
        return NextResponse.json(
          { error: "zero reserves" },
          { status: 400 }
        );
      }

      const buyPrice = (r1 * WAD) / r0;
      const sellPrice = (r0 * WAD) / r1;

      const tx2 = await pool.postBatchPrice(batch, buyPrice, sellPrice);
      await tx2.wait();
      steps.push("price_posted");
    }

    // noise injection requires cofhejs encryption
    // in the route handler context we skip it; use the hardhat script for full keeper flow
    if (await pool.noiseInjected(batch)) {
      steps.push("noise_already_injected");
    } else {
      steps.push("noise_skipped_use_hardhat_script");
    }

    return NextResponse.json({ batch, status: "ok", steps });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
