import Link from "next/link";

export function LandingHeader() {
  return (
    <div className="fixed z-50 pt-8 top-0 left-0 w-full">
      <header className="flex items-center justify-between max-w-6xl mx-auto px-6">
        <Link href="/" className="val-neon text-xl font-bold tracking-widest">
          area51
        </Link>
        <nav className="flex items-center gap-8">
          {["Docs", "Contracts", "Batches"].map((item) => (
            <Link
              key={item}
              href={item === "Batches" ? "/batches" : "#"}
              className="hidden lg:inline-block font-mono text-xs uppercase tracking-widest transition-colors duration-150"
              style={{ color: "rgba(232,237,245,0.4)" }}
            >
              {item}
            </Link>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-widest transition-colors duration-150"
          style={{ color: "var(--neon-cyan)" }}
        >
          Launch App
        </Link>
      </header>
    </div>
  );
}
