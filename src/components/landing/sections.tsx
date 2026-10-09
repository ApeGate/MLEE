import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Write the plan in plain words",
    body: "Pick Clips, Balanced, or Wide. Set budget, size, exits, and whether buys need your OK. Relay restates the whole plan before you start.",
  },
  {
    title: "Specialists take the grind",
    body: "Scout skips concentrated or illiquid coins. Watch holds for your velocity entry. Desk sizes the buy and follows take-profit, trail, and stop — without loosening your rules.",
  },
  {
    title: "Every decision is on the tape",
    body: "See why a coin was skipped, why an entry fired, and what Desk did with the bag. Pause anytime; open positions keep managing.",
  },
];

const IMPROVEMENTS = [
  {
    title: "No invite wall to try the loop",
    body: "Open the desk and run a full simulated Strategy in seconds — not a waitlist page with a token CTA.",
  },
  {
    title: "Handoffs you can actually see",
    body: "Scout → Watch → Desk is a visible relay, not three mascots you “poke.” The tape shows who acted and why.",
  },
  {
    title: "Plan preview before capital moves",
    body: "Plain-English Strategy summary, approval-first buys by default, and hard budget / position caps that Desk cannot override.",
  },
];

export function LandingSections() {
  return (
    <>
      <section id="how" className="relative border-t border-signal/10 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">
            How Relay works
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            One Strategy. Three specialists. Clean handoffs.
          </h2>
          <p className="mt-4 max-w-xl text-mist">
            Built for traders who already have a plan — and are tired of carrying
            every check, wait, and exit themselves.
          </p>

          <ol className="mt-14 space-y-12">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid gap-3 border-l border-signal/25 pl-5 sm:grid-cols-[80px_1fr] sm:gap-8 sm:border-l-0 sm:pl-0"
              >
                <span className="font-display text-3xl font-bold text-signal/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-mist">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="relative border-t border-signal/10 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-signal">
            Why Relay
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
            Same job as a private trading team — sharper desk.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {IMPROVEMENTS.map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-signal/10 px-5 py-24 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-4xl font-bold tracking-tight text-signal sm:text-5xl">
              RELAY
            </p>
            <p className="mt-3 max-w-md text-lg text-foreground">
              Hand off the grind. Keep the edge.
            </p>
          </div>
          <Link
            href="/desk"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-signal text-signal-foreground hover:bg-signal/90",
            )}
          >
            Open the desk
          </Link>
        </div>
        <p className="mx-auto mt-16 max-w-6xl text-xs text-mist/70">
          Simulated market demo — no wallet connection required. Not financial
          advice. Relay is an independent product and is not affiliated with
          Hotbot, ClawPump, or any token.
        </p>
      </section>
    </>
  );
}
