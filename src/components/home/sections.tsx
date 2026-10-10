import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  Crosshair,
  Search,
  ShieldCheck,
} from "lucide-react";

const CREW = [
  {
    name: "Kong",
    role: "Scout",
    call: "“I check the launch before the launch checks you.”",
    body: "Sizes up age, liquidity, and holder concentration. Weak setups never reach the gate.",
    icon: Search,
    color: "#ff7250",
  },
  {
    name: "Cheeta",
    role: "Watch",
    call: "“I stalk momentum. I don’t chase it.”",
    body: "Tracks coins that pass and calls the moment velocity reaches your entry rule.",
    icon: Binoculars,
    color: "#ffb13c",
  },
  {
    name: "Caesar",
    role: "Trade",
    call: "“No send without a size and a reason.”",
    body: "Lines up the buy inside your cap, then waits for your approval before anything moves.",
    icon: Crosshair,
    color: "#c7ff45",
  },
  {
    name: "Cornelius",
    role: "Risk",
    call: "“Every bag gets an exit before an entry.”",
    body: "Guards budget, position count, stops, take-profit, and trailing exits around the clock.",
    icon: ShieldCheck,
    color: "#9ab7ff",
  },
];

const FLOW = [
  ["01", "Set the gate", "Pick a play style, budget, max buy, and exit plan."],
  ["02", "Crew runs checks", "Each ape owns one job and signs every decision."],
  ["03", "You make the call", "Approve or skip the buy with the full case in front of you."],
];

export function HomeSections() {
  return (
    <>
      <section
        id="crew"
        className="px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff7250]">
                Meet the crew
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-extrabold leading-none tracking-[-0.055em] sm:text-6xl text-balance">
                Every ape has one job.
                <br />
                <span className="text-stroke">Every call has a reason.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[#91897e]">
              No black-box pile-on. The crew hands work forward, so you always
              know who checked, watched, called the buy, or blocked it.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {CREW.map((ape, index) => {
              const Icon = ape.icon;
              return (
                <article
                  key={ape.name}
                  className="ape-card group relative overflow-hidden rounded-2xl border border-[#302a20] p-5 transition-transform hover:-translate-y-1 hover:border-[#4b4134]"
                >
                  <span className="absolute right-3 top-1 font-mono text-6xl font-bold text-[#f4efe5]/[0.035]">
                    0{index + 1}
                  </span>
                  <div
                    className="flex size-10 items-center justify-center rounded-xl border border-current/20 bg-current/10"
                    style={{ color: ape.color }}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-8">
                    <p
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: ape.color }}
                    >
                      {ape.role} ape
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">
                      {ape.name}
                    </h3>
                    <p className="mt-3 text-sm font-semibold leading-snug text-[#ded7cb]">
                      {ape.call}
                    </p>
                    <p className="mt-3 text-xs leading-relaxed text-[#8f877b]">
                      {ape.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how"
        className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c7ff45]">
              The core loop
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              From fresh launch
              <br />
              to clear decision.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              Apegate keeps fast markets readable. The tape shows the rule,
              evidence, owner, and next action — without pretending a simulation
              is a live fill.
            </p>
            <Link
              href="/desk"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ff7250]"
            >
              See the crew work
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <ol className="border-t border-[#302a20]">
            {FLOW.map(([number, title, body]) => (
              <li
                key={number}
                className="grid gap-4 border-b border-[#302a20] py-7 sm:grid-cols-[64px_190px_1fr] sm:items-baseline"
              >
                <span className="font-mono text-xs text-[#ff7250]">{number}</span>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-[#91897e]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-[#3a3328] bg-[#12100c]">
          <div className="grid lg:grid-cols-[1fr_0.72fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff7250]">
                Practice the pounce
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-none tracking-[-0.055em] sm:text-5xl">
                Give the crew your rules. Watch the gate work.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#91897e]">
                Start with simulated Pump.fun-style launches. Change the plan,
                approve a setup, and watch Cornelius manage the exits. No wallet
                and no real funds.
              </p>
              <Link
                href="/desk"
                className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-[#c7ff45] px-5 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5"
              >
                Open the Apegate desk
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="relative flex min-h-[310px] items-center justify-center border-t border-[#302a20] bg-[#090806] p-8 lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(255_79_31_/_18%),transparent_58%)]" />
              <Image
                src="/apegate-logo.jpg"
                alt="Apegate ape mark"
                width={280}
                height={280}
                className="relative w-52 rounded-3xl border border-[#ff4f1f]/25 object-cover shadow-[0_24px_80px_rgb(255_79_31_/_14%)] sm:w-64"
              />
            </div>
          </div>
        </div>
        <footer className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-[#302a20] pt-6 text-xs text-[#6f685f] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/apegate-logo.jpg"
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-md object-cover"
            />
            <span className="font-bold text-[#a79f92]">APEGATE</span>
          </div>
          <p>Simulation only · Market data and fills are not live · Not financial advice</p>
        </footer>
      </section>
    </>
  );
}
