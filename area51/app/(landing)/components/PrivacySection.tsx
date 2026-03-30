"use client";

import { useEffect, useRef, useState } from "react";

const codeExamples = [
  {
    label: "Order",
    code: `// nothing leaks — amount + direction encrypted
const encAmount = await encryptUint128(amountWei);
const encIsBuy  = await encryptBool(isBuy);

await router.submitOrder(
  tokenIn, tokenOut,
  encAmount, encIsBuy
);
// on-chain: only ciphertext stored`,
  },
  {
    label: "Keeper",
    code: `// keeper.ts — run as cron or CLI
POOL_ADDRESS=0x... \\
  npx hardhat run scripts/price-keeper.ts \\
  --network nitrogen

# or hit the Next.js route
curl -X POST /api/keeper`,
  },
  {
    label: "Claim",
    code: `// after executeBatch — claim your output
await pool.claimOutput(batch);

// async FHE decrypt — poll until ready
let ready = false;
while (!ready) {
  const res = await pool
    .getDecryptedShares(wallet.address);
  ready = res.ready;
}
console.log("output:", res.shares.toString());`,
  },
];

const features = [
  { title: "Encrypted reserves", description: "Pool state never exposed in plaintext." },
  { title: "Noise injection", description: "Random noise masks aggregate order flow." },
  { title: "Batch settlement", description: "Orders settle as a group, never individually." },
  { title: "Async FHE decrypt", description: "Fhenix coprocessor decrypts on request only." },
];

export function PrivacySection() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="privacy"
      ref={sectionRef}
      className="relative py-24 lg:py-32 overflow-hidden"
      style={{ background: "var(--bg-deep)" }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span
              className="inline-flex items-center gap-3 text-xs font-mono mb-6"
              style={{ color: "rgba(232,237,245,0.3)" }}
            >
              <span
                className="w-8 h-px"
                style={{ background: "rgba(232,237,245,0.2)" }}
              />
              For traders
            </span>
            <h2
              className="text-4xl lg:text-6xl font-bold tracking-tight mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Built for privacy.
              <br />
              <span style={{ color: "rgba(232,237,245,0.3)" }}>
                Runs on Fhenix.
              </span>
            </h2>
            <p
              className="text-lg mb-12 leading-relaxed"
              style={{ color: "rgba(232,237,245,0.45)" }}
            >
              FHE ensures your order size and direction are hidden end-to-end.
              The pool computes over ciphertexts — no trusted intermediary, no
              plaintext leakage at any layer.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`transition-all duration-500 ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${index * 60 + 200}ms` }}
                >
                  <h3
                    className="font-semibold mb-1 text-sm"
                    style={{ color: "var(--neon-cyan)" }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(232,237,245,0.4)" }}
                  >
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div
            className={`lg:sticky lg:top-32 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div style={{ border: "1px solid var(--border)" }}>
              <div
                className="flex items-center"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {codeExamples.map((ex, idx) => (
                  <button
                    key={ex.label}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className="relative px-5 py-3 text-xs font-mono transition-colors"
                    style={{
                      color:
                        activeTab === idx
                          ? "var(--neon-cyan)"
                          : "rgba(232,237,245,0.35)",
                    }}
                  >
                    {ex.label}
                    {activeTab === idx && (
                      <span
                        className="absolute bottom-0 left-0 right-0 h-px"
                        style={{ background: "var(--neon-cyan)" }}
                      />
                    )}
                  </button>
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-3 text-xs font-mono transition-colors"
                  style={{ color: "rgba(232,237,245,0.3)" }}
                >
                  {copied ? "done" : "copy"}
                </button>
              </div>

              <div
                className="p-6 font-mono text-xs min-h-52"
                style={{ background: "var(--bg-surface)" }}
              >
                <pre style={{ color: "rgba(232,237,245,0.6)" }}>
                  {codeExamples[activeTab].code.split("\n").map((line, li) => (
                    <div
                      key={`${activeTab}-${li}`}
                      className="leading-loose dev-code-line"
                      style={{ animationDelay: `${li * 70}ms` }}
                    >
                      <span className="inline-flex">
                        {line.split("").map((char, ci) => (
                          <span
                            key={`${activeTab}-${li}-${ci}`}
                            className="dev-code-char"
                            style={{
                              animationDelay: `${li * 70 + ci * 12}ms`,
                            }}
                          >
                            {char === " " ? "\u00A0" : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-5 text-xs font-mono">
              <a
                href="/dashboard"
                style={{ color: "var(--neon-cyan)" }}
                className="hover:opacity-70 transition-opacity"
              >
                Launch app
              </a>
              <span style={{ color: "rgba(232,237,245,0.15)" }}>|</span>
              <a
                href="/batches"
                style={{ color: "rgba(232,237,245,0.35)" }}
                className="hover:opacity-80 transition-opacity"
              >
                View batches
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
