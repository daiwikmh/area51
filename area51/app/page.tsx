import Link from "next/link";
import { LandingHeader } from "./(landing)/components/LandingHeader";
import { ParticleCanvas } from "./(landing)/components/ParticleCanvas";
import { HowItWorks } from "./(landing)/components/HowItWorks";
import { PrivacySection } from "./(landing)/components/PrivacySection";

export default function Home() {
  return (
    <>
      <div style={{ position: "relative", zIndex: 1 }}>
        <LandingHeader />

        <section
          className="flex min-h-svh justify-center items-center"
          style={{ position: "relative", background: "var(--bg-deep)", overflow: "hidden" }}
        >
          <div
            className="canvas-grow"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              zIndex: 0,
              pointerEvents: "none",
            }}
          >
            <ParticleCanvas />
          </div>
          <div className="text-center px-6 pt-28 pb-16" style={{ position: "relative", zIndex: 1 }}>
            <div
              className="inline-flex items-center gap-2 text-xs font-mono mb-6 px-3 py-1 fade-up"
              style={{
                border: "1px solid var(--border)",
                color: "var(--neon-cyan)",
                borderRadius: "4px",
                background: "rgba(0,255,224,0.04)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: "var(--neon-cyan)",
                  boxShadow: "0 0 6px var(--neon-cyan)",
                  animation: "pulse-cyan 2s infinite",
                }}
              />
              FHE Dark Pool · Fhenix Nitrogen
            </div>

            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight fade-up"
              style={{ color: "var(--text-primary)", animationDelay: "80ms" }}
            >
              area51
            </h1>

            <p
              className="font-mono text-sm sm:text-base mt-6 max-w-lg mx-auto leading-relaxed fade-up"
              style={{ color: "rgba(250,250,250,0.45)", animationDelay: "160ms" }}
            >
              AMM-based dark pool DEX on Fhenix.
              <br />
              Orders are fully encrypted. Only you see your size.
            </p>

            <div
              className="flex items-center justify-center gap-4 mt-12 fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/dashboard" className="btn btn-neon px-8 py-3">
                LAUNCH APP
              </Link>
              <Link href="#how-it-works" className="btn btn-ghost px-8 py-3">
                HOW IT WORKS
              </Link>
            </div>

            <div
              className="mt-8 font-mono text-xs fade-up"
              style={{ color: "rgba(250,250,250,0.2)", animationDelay: "320ms" }}
            >
              <span style={{ color: "var(--neon-cyan)" }}>$</span>{" "}
              npx hardhat run scripts/price-keeper.ts --network nitrogen
            </div>
          </div>
        </section>

        <HowItWorks />
        <PrivacySection />

        <footer
          className="w-full py-8"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-surface)",
          }}
        >
          <div
            className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs font-mono"
            style={{ color: "var(--text-muted)" }}
          >
            <span>area51 · CC0</span>
            <div className="flex gap-6">
              <Link href="/dashboard" style={{ color: "var(--neon-cyan)" }} className="hover:opacity-70 transition-opacity">
                Dashboard
              </Link>
              <Link href="/batches" className="hover:opacity-70 transition-opacity">
                Batches
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
