import { ethers } from "ethers";
import { POOL_ABI } from "@/lib/contracts";
import { notifyWallet } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { encAmount, encIsBuy, tokenIn, tokenOut, wallet } = body;

    if (!encAmount || !encIsBuy) {
      return Response.json({ error: "missing encAmount or encIsBuy" }, { status: 400 });
    }

    const rpcUrl = process.env.FHENIX_RPC_URL;
    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !privateKey || !poolAddress) {
      return Response.json({ error: "missing server env" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayer = new ethers.Wallet(privateKey, provider);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, relayer);

    const tx = await pool.submitOrder(encAmount, encIsBuy);
    const receipt = await tx.wait();

    if (wallet) {
      await notifyWallet(
        wallet,
        `Your encrypted order was submitted.\nBatch: <b>${await pool.currentBatch()}</b>\nTx: <code>${receipt.hash}</code>`
      );
    }

    return Response.json({ txHash: receipt.hash, status: "submitted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
