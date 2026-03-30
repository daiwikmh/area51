import hre from "hardhat";
import { cofhejs, Encryptable } from "cofhejs/node";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function initCofhe(signer: HardhatEthersSigner) {
  await hre.cofhe.expectResultSuccess(
    hre.cofhe.initializeWithHardhatSigner(signer)
  );
}

export async function encryptUint128(value: bigint) {
  const [encrypted] = await hre.cofhe.expectResultSuccess(
    cofhejs.encrypt([Encryptable.uint128(value)] as const)
  );
  return encrypted;
}

export async function encryptBool(value: boolean) {
  const [encrypted] = await hre.cofhe.expectResultSuccess(
    cofhejs.encrypt([Encryptable.bool(value)] as const)
  );
  return encrypted;
}
