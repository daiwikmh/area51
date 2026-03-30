"use client";

import { useState, useEffect } from "react";
import { BrowserProvider, Contract, parseEther, MaxUint256 } from "ethers";
import type { DashboardState } from "@/lib/dashboard";
import { getProvider } from "@/lib/metamask";
import { ERC20_ABI, POOL_ADDRESS, TOKEN0_ADDRESS, TOKEN1_ADDRESS } from "@/lib/contracts";

type Props = {
  state: DashboardState;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};

type ApprovalState = "unknown" | "needed" | "approving" | "ok";

export default function LiquidityPanel({ state: _state, onAction }: Props) {
  const [tab, setTab] = useState<"add" | "remove">("add");
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [shares, setShares] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [approval0, setApproval0] = useState<ApprovalState>("unknown");
  const [approval1, setApproval1] = useState<ApprovalState>("unknown");

  async function getSigner() {
    const raw = getProvider();
    if (!raw) throw new Error("wallet not connected");
    const provider = new BrowserProvider(raw as ConstructorParameters<typeof BrowserProvider>[0]);
    return provider.getSigner();
  }

  async function checkAllowances(a0: string, a1: string) {
    if (!a0 || !a1 || !TOKEN0_ADDRESS || !TOKEN1_ADDRESS || !POOL_ADDRESS) return;
    try {
      const signer = await getSigner();
      const addr = await signer.getAddress();
      const provider = signer.provider;
      const t0 = new Contract(TOKEN0_ADDRESS, ERC20_ABI, provider);
      const t1 = new Contract(TOKEN1_ADDRESS, ERC20_ABI, provider);
      const [all0, all1] = await Promise.all([
        t0.allowance(addr, POOL_ADDRESS),
        t1.allowance(addr, POOL_ADDRESS),
      ]);
      const need0 = parseEther(a0 || "0");
      const need1 = parseEther(a1 || "0");
      setApproval0(all0 >= need0 ? "ok" : "needed");
      setApproval1(all1 >= need1 ? "ok" : "needed");
    } catch {}
  }

  useEffect(() => {
    if (amount0 && amount1) checkAllowances(amount0, amount1);
  }, [amount0, amount1]);

  async function approve(token: 0 | 1) {
    const setter = token === 0 ? setApproval0 : setApproval1;
    const address = token === 0 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS;
    setter("approving");
    try {
      const signer = await getSigner();
      const contract = new Contract(address, ERC20_ABI, signer);
      const tx = await contract.approve(POOL_ADDRESS, MaxUint256);
      await tx.wait();
      setter("ok");
    } catch (e) {
      setter("needed");
      setStatus(e instanceof Error ? e.message : "approval failed");
    }
  }

  async function addLiquidity() {
    if (!amount0 || !amount1) return;
    setBusy(true); setStatus(null);
    try {
      await onAction("addLiquidity", {
        amount0: parseEther(amount0).toString(),
        amount1: parseEther(amount1).toString(),
      });
      setStatus("liquidity added");
      setAmount0(""); setAmount1("");
      setApproval0("unknown"); setApproval1("unknown");
    } catch (e) { setStatus(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function requestWithdrawal() {
    if (!shares) return;
    setBusy(true); setStatus(null);
    try {
      await onAction("requestWithdrawal", { shares });
      setStatus("withdrawal requested");
    } catch (e) { setStatus(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  const bothApproved = approval0 === "ok" && approval1 === "ok";
  const amountsEntered = !!amount0 && !!amount1;

  return (
    <div className="control-card">
      <div className="field-label">Liquidity</div>

      <div className="tab-row">
        <button className={`tab-btn ${tab === "add" ? "active" : ""}`} onClick={() => setTab("add")}>ADD</button>
        <button className={`tab-btn ${tab === "remove" ? "active" : ""}`} onClick={() => setTab("remove")}>REMOVE</button>
      </div>

      {tab === "add" ? (
        <div className="flex flex-col gap-3">
          <div>
            <div className="field-label">Token 0 (FZA)</div>
            <input className="input-field" type="number" min="0" placeholder="0.00"
              value={amount0} onChange={(e) => setAmount0(e.target.value)} />
          </div>
          <div>
            <div className="field-label">Token 1 (FZB)</div>
            <input className="input-field" type="number" min="0" placeholder="0.00"
              value={amount1} onChange={(e) => setAmount1(e.target.value)} />
          </div>

          {amountsEntered && !bothApproved && (
            <div className="flex gap-2">
              {approval0 !== "ok" && (
                <button
                  className="btn btn-ghost flex-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => approve(0)}
                  disabled={approval0 === "approving"}
                >
                  {approval0 === "approving" ? "APPROVING..." : "APPROVE FZA"}
                </button>
              )}
              {approval1 !== "ok" && (
                <button
                  className="btn btn-ghost flex-1"
                  style={{ fontSize: "11px" }}
                  onClick={() => approve(1)}
                  disabled={approval1 === "approving"}
                >
                  {approval1 === "approving" ? "APPROVING..." : "APPROVE FZB"}
                </button>
              )}
            </div>
          )}

          <button
            className="btn btn-start w-full"
            onClick={addLiquidity}
            disabled={busy || !amountsEntered || !bothApproved}
          >
            {busy ? "PENDING..." : bothApproved || !amountsEntered ? "ADD LIQUIDITY" : "APPROVE TOKENS FIRST"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <div className="field-label">Share Amount</div>
            <input className="input-field" type="number" min="0" placeholder="0.00"
              value={shares} onChange={(e) => setShares(e.target.value)} />
          </div>
          <p className="stat-sub" style={{ marginBottom: "4px" }}>
            Keeper computes plaintext ratio from sealed shares before finalising.
          </p>
          <button className="btn btn-ghost w-full" onClick={requestWithdrawal} disabled={busy || !shares}>
            {busy ? "PENDING..." : "REQUEST WITHDRAWAL"}
          </button>
        </div>
      )}

      {status && <p className="stat-sub mt-2">{status}</p>}
    </div>
  );
}
