import Link from "next/link";

const STEPS = [
  {
    title: "1. Check",
    body: "New coins are scored against your filters. Failures are skipped with a reason you can read on the blotter.",
  },
  {
    title: "2. Watch",
    body: "Coins that pass wait for your entry condition (how fast they’re moving). You keep trading elsewhere.",
  },
  {
    title: "3. Trade",
    body: "When the entry hits, Blotter sizes the buy inside your budget. You approve first (default), then exits follow your take-profit, trail, and stop.",
  },
];

export function HomeSections() {
  return (
    <>
      <section
        id="how"
        className="border-t border-[#243044] px-5 py-16 sm:px-8 sm:py-24"
      >
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#3dd6c6]">
            Workflow
          </p>
          <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl text-balance">
            Three steps. One set of rules. A log for every call.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-[#243044] bg-[#121a2a]/70 p-5"
              >
                <h3 className="text-lg font-semibold text-[#3dd6c6]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#8b9bb0]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#243044] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl rounded-2xl border border-[#243044] bg-[#121a2a]/80 px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ready to see it run?
              </h2>
              <p className="mt-2 max-w-lg text-[#8b9bb0]">
                The desk starts in simulation with sensible Clips defaults.
                Change the plan anytime. Nothing here spends real funds.
              </p>
            </div>
            <Link
              href="/desk"
              className="inline-flex shrink-0 rounded-md bg-[#3dd6c6] px-5 py-3 text-sm font-semibold text-[#041016] hover:bg-[#5eead4]"
            >
              Open the desk
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-[#8b9bb0]/80">
          Not financial advice. Market data in this demo is simulated.
        </p>
      </section>
    </>
  );
}
