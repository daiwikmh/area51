import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // deploy mock tokens
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Fugazi Token A", "FZA", 18);
  await tokenA.waitForDeployment();
  const tokenB = await MockERC20.deploy("Fugazi Token B", "FZB", 18);
  await tokenB.waitForDeployment();
  console.log("TokenA:", await tokenA.getAddress());
  console.log("TokenB:", await tokenB.getAddress());

  // deploy factory with deployer as keeper
  const Factory = await ethers.getContractFactory("FugaziFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("Factory:", await factory.getAddress());

  // create pool (10 block batch size)
  const t0 = await tokenA.getAddress();
  const t1 = await tokenB.getAddress();
  const [sorted0, sorted1] = t0 < t1 ? [t0, t1] : [t1, t0];

  const tx = await factory.createPool(sorted0, sorted1, 10);
  await tx.wait();
  const poolAddr = await factory.getPool(sorted0, sorted1);
  console.log("Pool:", poolAddr);

  // deploy router
  const Router = await ethers.getContractFactory("FugaziRouter");
  const router = await Router.deploy(await factory.getAddress());
  await router.waitForDeployment();
  console.log("Router:", await router.getAddress());

  // mint test tokens to deployer
  const mintAmount = ethers.parseEther("1000000");
  await tokenA.mint(deployer.address, mintAmount);
  await tokenB.mint(deployer.address, mintAmount);
  console.log("Minted 1M of each token to deployer");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
