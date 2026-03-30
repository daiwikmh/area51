"use client";

import { cofhejs, Encryptable } from "cofhejs/web";

let initialized = false;

export async function initCofhejs(provider: unknown, signer: unknown) {
  if (initialized) return;
  const result = await cofhejs.initialize({
    provider: provider as Parameters<typeof cofhejs.initialize>[0]["provider"],
    signer: signer as Parameters<typeof cofhejs.initialize>[0]["signer"],
    environment: "TESTNET",
  });
  if (!result.success) throw new Error("cofhejs init failed: " + result.error?.message);
  initialized = true;
}

export function resetCofhejs() {
  initialized = false;
}

export async function encryptUint128(value: bigint) {
  const result = await cofhejs.encrypt([Encryptable.uint128(value)] as const);
  if (!result.success) throw new Error("encrypt failed: " + result.error?.message);
  return result.data[0];
}

export async function encryptBool(value: boolean) {
  const result = await cofhejs.encrypt([Encryptable.bool(value)] as const);
  if (!result.success) throw new Error("encrypt failed: " + result.error?.message);
  return result.data[0];
}
