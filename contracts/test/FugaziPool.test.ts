import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { initCofhe, encryptUint128, encryptBool } from "./helpers/fhe";

describe("FugaziPool", function () {
  const BATCH_SIZE = 5;
  const WAD = 10n ** 18n;
  const MINT_AMOUNT = 1_000_000n * WAD;

  async function deployFixture() {
    const [deployer, keeper, alice, bob] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Token A", "TKA", 18);
    const tokenB = await MockERC20.deploy("Token B", "TKB", 18);

    const [t0Addr, t1Addr] =
      (await tokenA.getAddress()) < (await tokenB.getAddress())
        ? [await tokenA.getAddress(), await tokenB.getAddress()]
        : [await tokenB.getAddress(), await tokenA.getAddress()];

    const Factory = await ethers.getContractFactory("FugaziFactory");
    const factory = await Factory.deploy(keeper.address);

    await factory.createPool(t0Addr, t1Addr, BATCH_SIZE);
    const poolAddr = await factory.getPool(t0Addr, t1Addr);
    const pool = await ethers.getContractAt("FugaziPool", poolAddr);

    const token0 = await ethers.getContractAt("MockERC20", t0Addr);
    const token1 = await ethers.getContractAt("MockERC20", t1Addr);

    for (const user of [alice, bob, keeper]) {
      await token0.mint(user.address, MINT_AMOUNT);
      await token1.mint(user.address, MINT_AMOUNT);
      await token0.connect(user).approve(poolAddr, MINT_AMOUNT);
      await token1.connect(user).approve(poolAddr, MINT_AMOUNT);
    }

    return { pool, factory, token0, token1, deployer, keeper, alice, bob };
  }

  beforeEach(function () {
    if (!hre.cofhe.isPermittedEnvironment("MOCK")) this.skip();
  });

  describe("Deployment", function () {
    it("should set token addresses and batch size", async function () {
      const { pool, token0, token1 } = await loadFixture(deployFixture);
      expect(await pool.token0()).to.equal(await token0.getAddress());
      expect(await pool.token1()).to.equal(await token1.getAddress());
      expect(await pool.batchSize()).to.equal(BATCH_SIZE);
      expect(await pool.currentBatch()).to.equal(1);
    });
  });

  describe("Order submission", function () {
    it("should accept an encrypted order", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await initCofhe(alice);

      const encAmount = await encryptUint128(100n * WAD);
      const encIsBuy = await encryptBool(true);

      await pool.connect(alice).submitOrder(encAmount, encIsBuy);
      expect(await pool.batchOrderCount(1)).to.equal(1);
    });

    it("should track multiple orders in same batch", async function () {
      const { pool, alice, bob } = await loadFixture(deployFixture);

      await initCofhe(alice);
      const encA = await encryptUint128(50n * WAD);
      const encABuy = await encryptBool(true);
      await pool.connect(alice).submitOrder(encA, encABuy);

      await initCofhe(bob);
      const encB = await encryptUint128(30n * WAD);
      const encBSell = await encryptBool(false);
      await pool.connect(bob).submitOrder(encB, encBSell);

      expect(await pool.batchOrderCount(1)).to.equal(2);
    });
  });

  describe("Noise injection", function () {
    it("should allow keeper to inject noise once per batch", async function () {
      const { pool, keeper } = await loadFixture(deployFixture);
      await initCofhe(keeper);

      const encNoise = await encryptUint128(42n * WAD);
      await pool.connect(keeper).injectNoise(encNoise);
      expect(await pool.noiseInjected(1)).to.be.true;
    });

    it("should reject duplicate noise injection", async function () {
      const { pool, keeper } = await loadFixture(deployFixture);
      await initCofhe(keeper);

      await pool.connect(keeper).injectNoise(await encryptUint128(42n * WAD));
      await expect(
        pool.connect(keeper).injectNoise(await encryptUint128(10n * WAD))
      ).to.be.revertedWith("noise exists");
    });

    it("should reject noise from non-keeper", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await initCofhe(alice);

      await expect(
        pool.connect(alice).injectNoise(await encryptUint128(42n * WAD))
      ).to.be.revertedWith("not keeper");
    });
  });

  describe("Batch price posting", function () {
    it("should accept price from keeper", async function () {
      const { pool, keeper } = await loadFixture(deployFixture);
      await pool.connect(keeper).postBatchPrice(1, WAD, WAD);
      expect(await pool.batchBuyPrice(1)).to.equal(WAD);
      expect(await pool.batchSellPrice(1)).to.equal(WAD);
    });

    it("should reject zero price", async function () {
      const { pool, keeper } = await loadFixture(deployFixture);
      await expect(
        pool.connect(keeper).postBatchPrice(1, 0, WAD)
      ).to.be.revertedWith("zero price");
    });
  });

  describe("Batch execution", function () {
    it("should revert without price posted", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await initCofhe(alice);

      await pool
        .connect(alice)
        .submitOrder(await encryptUint128(10n * WAD), await encryptBool(true));
      await expect(pool.executeBatch(1)).to.be.revertedWith("no price");
    });

    it("should revert if batch not ripe", async function () {
      // use a fresh pool with large batch size so blocks dont pass threshold
      const [, keeper2, user] = await ethers.getSigners();
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const tA = await MockERC20.deploy("A", "A", 18);
      const tB = await MockERC20.deploy("B", "B", 18);
      const [s0, s1] =
        (await tA.getAddress()) < (await tB.getAddress())
          ? [await tA.getAddress(), await tB.getAddress()]
          : [await tB.getAddress(), await tA.getAddress()];
      const Factory = await ethers.getContractFactory("FugaziFactory");
      const factory = await Factory.deploy(keeper2.address);
      await factory.createPool(s0, s1, 1000);
      const pAddr = await factory.getPool(s0, s1);
      const p = await ethers.getContractAt("FugaziPool", pAddr);

      await initCofhe(user);
      await p.connect(user).submitOrder(
        await encryptUint128(10n * WAD),
        await encryptBool(true)
      );
      await p.connect(keeper2).postBatchPrice(1, WAD, WAD);
      await expect(p.executeBatch(1)).to.be.revertedWith("batch not ripe");
    });
  });

  describe("Liquidity", function () {
    it("should accept liquidity deposit", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(100n * WAD, 100n * WAD);
    });

    it("should reject zero liquidity", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await expect(
        pool.connect(alice).addLiquidity(0, 100n * WAD)
      ).to.be.revertedWith("zero amount");
    });
  });

  describe("Claim output", function () {
    it("should revert if batch not executed", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      await expect(pool.connect(alice).claimOutput(1)).to.be.revertedWith(
        "batch not executed"
      );
    });
  });
});
