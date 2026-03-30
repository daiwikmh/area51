import { ethers } from "ethers";
import { POOL_ABI } from "@/lib/contracts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { encAmount, encIsBuy, tokenIn, tokenOut } = body;

    if (!encAmount || !encIsBuy) {
      return Response.json({ error: "missing encAmount or encIsBuy" }, { status: 400 });
    }

    const rpcUrl = process.env.FHENIX_RPC_URL;
    const privateKey = process.env.RELAYER_PRIVATE_KEY;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !privateKey || !poolAddress) {
      return Response.json({ error: "missing server env" }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const relayer = new ethers.Wallet(privateKey, provider);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, relayer);

    const tx = await pool.submitOrder(encAmount, encIsBuy);
    const receipt = await tx.wait();

    return Response.json({ txHash: receipt.hash, status: "submitted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
