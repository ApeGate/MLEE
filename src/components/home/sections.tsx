import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Scout",
    body: "Checks new Pump.fun coins against your filters — age, liquidity, top-holder concentration — and skips what fails.",
  },
  {
    n: "02",
    title: "Watch",
    body: "Holds coins that passed. Waits for your entry (velocity threshold), then hands the size to Desk.",
  },
  {
    n: "03",
    title: "Desk",
    body: "Buys within budget and position caps. Follows take-profit, trail, and stop. Asks before each buy if you want.",
  },
];

export function HomeSections() {
  return (
    <>
      <section
        id="how"
        className="border-t border-[#242824] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ff5c2e]">
            How Rivet works
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            Three jobs. One strategy. A tape that shows every call.
          </h2>
          <p className="mt-4 max-w-xl text-[#8d9488]">
            For traders who already know their Pump.fun plan — and are tired of
            manually checking holders, waiting on entries, and babysitting
            exits.
          </p>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t border-[#ff5c2e]/40 pt-5">
                <div className="font-mono text-xs text-[#ff5c2e]">{step.n}</div>
                <h3 className="mt-2 font-display text-xl font-semibold">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8d9488]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-[#242824] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ff5c2e]">
              Who it’s for
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
              Pump.fun desks that want rules, not vibes.
            </h2>
            <p className="mt-4 max-w-lg text-[#8d9488]">
              Set Clips, Balanced, or Wide. Cap budget and size. Keep approval
              on if you want the final say. Pause anytime — open bags still
              manage to your exits.
            </p>
          </div>
          <ul className="space-y-3 font-mono text-sm text-[#e9ece6]">
            <li className="border-l-2 border-[#ff5c2e] pl-3">
              Plain-English plan before you run
            </li>
            <li className="border-l-2 border-[#242824] pl-3 text-[#8d9488]">
              Skip / pass / buy / sell reasons on the tape
            </li>
            <li className="border-l-2 border-[#242824] pl-3 text-[#8d9488]">
              Hard budget and position caps Desk cannot override
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-[#242824] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-4xl font-bold tracking-tight text-[#ff5c2e] sm:text-5xl">
              RIVET
            </p>
            <p className="mt-3 max-w-md text-lg text-[#e9ece6]">
              Open the desk. Set the plan. Watch the handoffs.
            </p>
          </div>
          <Link
            href="/desk"
            className="inline-flex items-center bg-[#ff5c2e] px-5 py-3 text-sm font-semibold text-[#070807] hover:bg-[#ff734d]"
          >
            Open desk
          </Link>
        </div>
        <p className="mx-auto mt-14 max-w-6xl text-xs text-[#8d9488]/80">
          Local simulated market for trying the loop. Not financial advice.
        </p>
      </section>
    </>
  );
}
