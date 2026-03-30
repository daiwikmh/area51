import { ethers } from "ethers";
import { POOL_ABI } from "@/lib/contracts";
import { broadcastToAll } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batch } = body;

    if (batch === undefined) {
      return Response.json({ error: "missing batch" }, { status: 400 });
    }

    const rpcUrl = process.env.FHENIX_RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !privateKey || !poolAddress) {
      return Response.json({ error: "missing server env" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);

    const orderCount = Number(await pool.batchOrderCount(batch));
    const tx = await pool.executeBatch(batch);
    const receipt = await tx.wait();

    await broadcastToAll(
      `Batch <b>${batch}</b> executed — ${orderCount} orders settled.\nTx: <code>${receipt.hash}</code>`
    );

    return Response.json({ txHash: receipt.hash, batch, status: "executed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
