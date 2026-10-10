import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      <div className="noise pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[28%] h-px w-[28%] bg-[#ff5c2e]/40 pulse-line" />
        <div className="absolute right-[12%] top-[42%] h-px w-[22%] bg-[#b6f34d]/30 pulse-line [animation-delay:0.6s]" />
        <div className="absolute bottom-[22%] left-[20%] h-px w-[35%] bg-[#ff5c2e]/25 pulse-line [animation-delay:1.1s]" />
        <div className="absolute right-[18%] top-[30%] size-2 bg-[#ff5c2e]" />
        <div className="absolute left-[36%] top-[28%] size-1.5 bg-[#b6f34d]" />
        <div className="absolute bottom-[22%] left-[55%] size-2 bg-[#ff5c2e]/80" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:justify-center sm:px-8 sm:pb-20 sm:pt-20">
        <p className="rise font-display text-6xl font-bold leading-none tracking-tight text-[#ff5c2e] sm:text-8xl md:text-9xl">
          RIVET
        </p>
        <h1 className="rise-2 mt-6 max-w-2xl font-display text-2xl font-semibold leading-tight tracking-tight text-[#e9ece6] sm:text-4xl text-balance">
          Your Pump.fun strategy, running while you keep trading.
        </h1>
        <p className="rise-3 mt-4 max-w-lg text-base leading-relaxed text-[#8d9488] sm:text-lg">
          Scout filters new coins. Watch waits for your entry. Desk buys and
          exits inside the rules you set — with a decision tape you can read.
        </p>
        <div className="rise-3 mt-8 flex flex-wrap gap-3">
          <Link
            href="/desk"
            className="inline-flex items-center bg-[#ff5c2e] px-5 py-3 text-sm font-semibold text-[#070807] transition-colors hover:bg-[#ff734d]"
          >
            Run the desk
          </Link>
          <Link
            href="/#how"
            className="inline-flex items-center border border-[#242824] px-5 py-3 text-sm font-medium text-[#e9ece6] transition-colors hover:border-[#ff5c2e] hover:text-[#ff5c2e]"
          >
            See how it works
          </Link>
        </div>
        <p className="rise-3 mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8d9488]">
          Built for Pump.fun traders · Simulated desk, no wallet needed
        </p>
      </div>
    </section>
  );
}
