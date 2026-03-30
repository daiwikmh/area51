import { ethers } from "ethers";
import { POOL_ABI } from "@/lib/contracts";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

async function pollDecrypt(
  pool: ethers.Contract,
  method: "getDecryptedReserves" | "getDecryptedShares",
  args: unknown[]
): Promise<unknown[]> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const result = await pool[method](...args);
    const ready = Array.isArray(result) ? result[result.length - 1] : result.ready;
    if (ready) return Array.isArray(result) ? result : [result];
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("decrypt timeout");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { target } = body;

    const rpcUrl = process.env.FHENIX_RPC_URL;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !poolAddress) {
      return Response.json({ error: "missing server env" }, { status: 500 });
    }

    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    if (!privateKey) {
      return Response.json({ error: "KEEPER_PRIVATE_KEY not set" }, { status: 403 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const keeper = new ethers.Wallet(privateKey, provider);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, keeper);

    if (target === "reserves") {
      const tx = await pool.requestDecryptReserves();
      await tx.wait();

      const [r0, r1] = await pollDecrypt(pool, "getDecryptedReserves", []) as [bigint, bigint];
      return Response.json({
        reserve0: r0.toString(),
        reserve1: r1.toString(),
      });
    }

    return Response.json({ error: "unknown target" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
