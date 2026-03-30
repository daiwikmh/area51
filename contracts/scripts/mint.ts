import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Minting with:", deployer.address);

  const ERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = ERC20.attach("0x549F6adcBD1c9583883b9D684263Eba910D0A9fE");
  const tokenB = ERC20.attach("0xAC0bE398120ef23865fFbaDaf1af6CC5b1877776");
  const mintAmount = ethers.parseEther("1000000");

  const tx1 = await tokenA.mint(deployer.address, mintAmount);
  await tx1.wait();
  console.log("TokenA minted");

  const tx2 = await tokenB.mint(deployer.address, mintAmount);
  await tx2.wait();
  console.log("TokenB minted");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
