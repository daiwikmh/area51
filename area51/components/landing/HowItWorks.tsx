"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "I",
    title: "Submit encrypted order",
    description:
      "Encrypt your order amount and direction with FHE before it ever touches the chain. The contract stores ciphertexts — no one can read your position, not even validators.",
    code: `// encrypt client-side via cofhejs
const encAmount = await encryptUint128(amountWei);
const encIsBuy  = await encryptBool(true);

// submit to pool — ciphertext only on-chain
await router.submitOrder(
  tokenIn, tokenOut,
  encAmount, encIsBuy
);`,
  },
  {
    number: "II",
    title: "Keeper posts price",
    description:
      "An off-chain keeper unseals the encrypted reserves, computes the WAD price in plaintext BigInt, injects random noise, and posts the price on-chain for the batch.",
    code: `// keeper: unseal reserves via async FHE
await pool.requestDecryptReserves();
const { r0, r1 } = await pollDecrypted();

const buyPrice  = (r1 * WAD) / r0;
const sellPrice = (r0 * WAD) / r1;

await pool.postBatchPrice(batch, buyPrice, sellPrice);
await pool.injectNoise(encNoise); // masks aggregate`,
  },
  {
    number: "III",
    title: "Batch executes + claim",
    description:
      "Anyone can call executeBatch once it's ripe. Orders settle against the posted price. Noise cancels out symmetrically. Claim your output — encrypted until you decrypt it.",
    code: `// permissionless — anyone can execute
await pool.executeBatch(currentBatch);

// claim your output (triggers async decrypt)
await pool.claimOutput(batch);

// poll until FHE coprocessor resolves
const { shares, ready } = await pool
  .getDecryptedShares(userAddress);`,
  },
];

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "var(--bg-surface)" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(124,58,237,0.015) 40px, rgba(124,58,237,0.015) 41px)`,
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span
            className="inline-flex items-center gap-3 text-xs font-mono mb-6"
            style={{ color: "rgba(232,237,245,0.3)" }}
          >
            <span
              className="w-8 h-px"
              style={{ background: "rgba(232,237,245,0.15)" }}
            />
            Process
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-bold tracking-tight transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ color: "var(--text-primary)" }}
          >
            Three steps.
            <br />
            <span style={{ color: "rgba(232,237,245,0.3)" }}>
              Full order privacy.
            </span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-8 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-35 hover:opacity-65"
                }`}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-start gap-6">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: "rgba(232,237,245,0.15)" }}
                  >
                    {step.number}
                  </span>
                  <div className="flex-1">
                    <h3
                      className="text-xl lg:text-2xl font-semibold mb-3 transition-transform duration-300 group-hover:translate-x-1"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(232,237,245,0.45)" }}
                    >
                      {step.description}
                    </p>
                    {activeStep === index && (
                      <div
                        className="mt-4 h-px overflow-hidden"
                        style={{ background: "rgba(232,237,245,0.08)" }}
                      >
                        <div
                          className="h-full w-0"
                          style={{
                            background: "var(--neon-cyan)",
                            animation: "how-progress 5s linear forwards",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="lg:sticky lg:top-32 self-start">
            <div
              className="overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full"
                      style={{ background: "var(--border-strong)" }}
                    />
                  ))}
                </div>
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(232,237,245,0.25)" }}
                >
                  area51.pool
                </span>
              </div>

              <div
                className="p-6 font-mono text-xs min-h-72"
                style={{ background: "var(--bg-base)" }}
              >
                <pre style={{ color: "rgba(232,237,245,0.55)" }}>
                  {steps[activeStep].code.split("\n").map((line, li) => (
                    <div
                      key={`${activeStep}-${li}`}
                      className="leading-loose how-code-line"
                      style={{ animationDelay: `${li * 80}ms` }}
                    >
                      <span
                        className="select-none w-6 inline-block"
                        style={{ color: "rgba(232,237,245,0.12)" }}
                      >
                        {li + 1}
                      </span>
                      <span className="inline-flex">
                        {line.split("").map((char, ci) => (
                          <span
                            key={`${activeStep}-${li}-${ci}`}
                            className="how-code-char"
                            style={{ animationDelay: `${li * 80 + ci * 12}ms` }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "var(--success)",
                    boxShadow: "0 0 6px var(--success)",
                    animation: "pulse-cyan 2s infinite",
                  }}
                />
                <span
                  className="text-xs font-mono"
                  style={{ color: "rgba(232,237,245,0.25)" }}
                >
                  Fhenix Nitrogen
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
