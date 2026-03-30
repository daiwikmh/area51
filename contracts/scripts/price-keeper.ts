import { ethers } from "hardhat";
import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";

const WAD = 10n ** 18n;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;
const NOISE_MIN = 1n * WAD;
const NOISE_MAX = 100n * WAD;

function randomNoise(): bigint {
  const range = NOISE_MAX - NOISE_MIN;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return NOISE_MIN + rand;
}

async function pollDecryptedReserves(
  pool: Awaited<ReturnType<typeof ethers.getContractAt>>
): Promise<{ r0: bigint; r1: bigint }> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const [r0, r1, ready] = await pool.getDecryptedReserves();
    if (ready) return { r0, r1 };
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("decrypt timeout");
}

async function runKeeper(poolAddress: string) {
  const [keeper] = await ethers.getSigners();
  console.log("Keeper:", keeper.address);

  const pool = await ethers.getContractAt("FugaziPool", poolAddress);

  const onChainKeeper = await pool.keeper();
  if (onChainKeeper.toLowerCase() !== keeper.address.toLowerCase()) {
    throw new Error(`signer ${keeper.address} is not pool keeper ${onChainKeeper}`);
  }

  const batch: number = Number(await pool.currentBatch());
  console.log("Current batch:", batch);

  if (await pool.batchExecuted(batch)) {
    console.log("Batch already executed, nothing to do");
    return;
  }

  if ((await pool.batchBuyPrice(batch)) > 0n) {
    console.log("Price already posted for batch", batch);
  } else {
    console.log("Requesting reserve decrypt...");
    const tx1 = await pool.connect(keeper).requestDecryptReserves();
    await tx1.wait();

    const { r0, r1 } = await pollDecryptedReserves(pool);
    console.log("Reserves: r0=%s r1=%s", r0.toString(), r1.toString());

    if (r0 === 0n || r1 === 0n) {
      throw new Error("zero reserves, add liquidity first");
    }

    const buyPrice = (r1 * WAD) / r0;
    const sellPrice = (r0 * WAD) / r1;
    console.log("Prices: buy=%s sell=%s", buyPrice.toString(), sellPrice.toString());

    const tx2 = await pool.connect(keeper).postBatchPrice(batch, buyPrice, sellPrice);
    await tx2.wait();
    console.log("Price posted for batch", batch);
  }

  if (await pool.noiseInjected(batch)) {
    console.log("Noise already injected for batch", batch);
  } else {
    console.log("Injecting noise...");
    await hre.cofhe.expectResultSuccess(
      hre.cofhe.initializeWithHardhatSigner(keeper)
    );

    const noise = randomNoise();
    const [encNoise] = await hre.cofhe.expectResultSuccess(
      cofhejs.encrypt([Encryptable.uint128(noise)] as const)
    );

    const tx3 = await pool.connect(keeper).injectNoise(encNoise);
    await tx3.wait();
    console.log("Noise injected for batch", batch);
  }

  console.log("Keeper run complete for batch", batch);
}

const poolAddress = process.env.POOL_ADDRESS;
if (!poolAddress) {
  console.error("Set POOL_ADDRESS env var");
  process.exit(1);
}

runKeeper(poolAddress).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
