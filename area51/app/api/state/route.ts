import { ethers } from "ethers";
import { POOL_ABI } from "@/lib/contracts";
import type { DashboardState, LogEntry, KeeperMode } from "@/lib/dashboard";
import { EMPTY_STATE } from "@/lib/dashboard";

const KEEPER_HEARTBEAT_URL = process.env.KEEPER_HEARTBEAT_URL ?? "";
const EVENTS_BLOCK_RANGE = 500;

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function logId() {
  return Math.random().toString(36).slice(2, 9);
}

export async function GET() {
  try {
    const rpcUrl = process.env.FHENIX_RPC_URL;
    const poolAddress = process.env.POOL_ADDRESS;

    if (!rpcUrl || !poolAddress) {
      return Response.json(EMPTY_STATE);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

    const [currentBatch, batchSize, batchStartBlock, blockNumber] = await Promise.all([
      pool.currentBatch(),
      pool.batchSize(),
      pool.batchStartBlock(),
      provider.getBlockNumber(),
    ]);

    const batch = Number(currentBatch);
    const size = Number(batchSize);
    const startBlock = Number(batchStartBlock);
    const blocksLeft = Math.max(0, startBlock + size - blockNumber);

    const [orderCount, batchExecuted, noiseInjected, buyPrice] = await Promise.all([
      pool.batchOrderCount(batch),
      pool.batchExecuted(batch),
      pool.noiseInjected(batch),
      pool.batchBuyPrice(batch),
    ]);

    let lastPrice = "0";
    if (buyPrice > 0n) {
      lastPrice = buyPrice.toString();
    } else if (batch > 1) {
      try {
        const prev = await pool.batchBuyPrice(batch - 1);
        if (prev > 0n) lastPrice = prev.toString();
      } catch {}
    }

    let keeperOnline = false;
    if (KEEPER_HEARTBEAT_URL) {
      try {
        const hb = await fetch(KEEPER_HEARTBEAT_URL, { signal: AbortSignal.timeout(2000) });
        keeperOnline = hb.ok;
      } catch {}
    }

    let mode: KeeperMode = "idle";
    if (batchExecuted && blocksLeft === 0) {
      mode = "executing";
    } else if (keeperOnline && buyPrice > 0n) {
      mode = "live";
    } else if (buyPrice === 0n && blockNumber > startBlock + size) {
      mode = "alert";
    } else if (keeperOnline) {
      mode = "live";
    }

    const log: LogEntry[] = [];
    try {
      const fromBlock = Math.max(0, blockNumber - EVENTS_BLOCK_RANGE);
      const iface = new ethers.Interface(POOL_ABI as unknown as string[]);

      const topics = {
        OrderSubmitted: iface.getEvent("OrderSubmitted")!.topicHash,
        BatchPricePosted: iface.getEvent("BatchPricePosted")!.topicHash,
        BatchExecuted: iface.getEvent("BatchExecuted")!.topicHash,
        NoiseInjected: iface.getEvent("NoiseInjected")!.topicHash,
        OutputClaimed: iface.getEvent("OutputClaimed")!.topicHash,
      };

      const logs = await provider.getLogs({
        address: poolAddress,
        fromBlock,
        toBlock: "latest",
      });

      for (const l of logs.slice(-20)) {
        const topic = l.topics[0];
        const parsed = iface.parseLog({ topics: l.topics as string[], data: l.data });
        if (!parsed) continue;

        if (topic === topics.OrderSubmitted) {
          log.push({
            id: logId(),
            type: "info",
            message: `${shortAddr(parsed.args.owner)} submitted order #${parsed.args.index} batch ${parsed.args.batch}`,
            ts: Date.now(),
          });
        } else if (topic === topics.BatchPricePosted) {
          const price = (BigInt(parsed.args.buyPrice) * 10000n / (10n ** 18n));
          log.push({
            id: logId(),
            type: "ok",
            message: `Batch ${parsed.args.batch} price: ${Number(price) / 10000}`,
            ts: Date.now(),
          });
        } else if (topic === topics.BatchExecuted) {
          log.push({
            id: logId(),
            type: "ok",
            message: `Batch ${parsed.args.batch} executed — ${parsed.args.orderCount} orders`,
            ts: Date.now(),
          });
        } else if (topic === topics.NoiseInjected) {
          log.push({
            id: logId(),
            type: "info",
            message: `Noise injected for batch ${parsed.args.batch}`,
            ts: Date.now(),
          });
        } else if (topic === topics.OutputClaimed) {
          log.push({
            id: logId(),
            type: "info",
            message: `${shortAddr(parsed.args.user)} claimed output batch ${parsed.args.batch}`,
            ts: Date.now(),
          });
        }
      }
    } catch {}

    const orders = [];
    const count = Math.min(Number(orderCount), 20);
    for (let i = 0; i < count; i++) {
      orders.push({ owner: "0x0000000000000000000000000000000000000000", batch, index: i });
    }

    const state: DashboardState = {
      currentBatch: batch,
      blocksLeft,
      orderCount: Number(orderCount),
      lastPrice,
      noiseInjected: Boolean(noiseInjected),
      keeperOnline,
      batchExecuted: Boolean(batchExecuted),
      batchStartBlock: startBlock,
      batchSize: size,
      mode,
      log,
      orders,
    };

    return Response.json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
