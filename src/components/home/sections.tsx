import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Binoculars,
  Crosshair,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SAMPLE_TAPE } from "@/lib/strategies";

const CREW = [
  {
    name: "Kong",
    role: "Scout",
    call: "“I check the launch before the launch checks you.”",
    body: "Sizes up age, liquidity, and holder concentration. Weak setups never reach the gate.",
    icon: Search,
    color: "#ff7250",
    image: "/agents/kong.jpg",
  },
  {
    name: "Cheeta",
    role: "Watch",
    call: "“I stalk momentum. I don’t chase it.”",
    body: "Tracks coins that pass and calls the moment velocity reaches your entry rule.",
    icon: Binoculars,
    color: "#ffb13c",
    image: "/agents/cheeta.jpg",
  },
  {
    name: "Caesar",
    role: "Trade",
    call: "“No send without a size and a reason.”",
    body: "Lines up the buy inside your cap, then waits for your approval before anything moves.",
    icon: Crosshair,
    color: "#c7ff45",
    image: "/agents/caesar.jpg",
  },
  {
    name: "Cornelius",
    role: "Risk",
    call: "“Every bag gets an exit before an entry.”",
    body: "Guards budget, position count, stops, take-profit, and trailing exits around the clock.",
    icon: ShieldCheck,
    color: "#9ab7ff",
    image: "/agents/cornelius.jpg",
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
                  className={`ape-card agent-float agent-float-delay-${index} group relative overflow-hidden rounded-2xl border border-[#302a20] transition-shadow hover:border-[#4b4134] hover:shadow-[0_24px_70px_rgb(0_0_0_/_35%)]`}
                >
                  <div className="relative aspect-[1.08/1] overflow-hidden">
                    <Image
                      src={ape.image}
                      alt={`${ape.name}, Apegate ${ape.role.toLowerCase()} agent`}
                      fill
                      sizes="(max-width: 768px) 90vw, (max-width: 1200px) 45vw, 300px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#12100c] to-transparent" />
                    <div
                      className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-[#090806]/70 backdrop-blur"
                      style={{ color: ape.color }}
                    >
                      <Icon className="size-4" />
                    </div>
                    <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-[#090806]/70 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider backdrop-blur">
                      Agent 0{index + 1}
                    </span>
                  </div>
                  <div className="relative -mt-8 p-5 pt-0">
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

      <ProductProof />

      <section
        id="how"
        className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#c7ff45]">
              Your strategy
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Rules first.
              <br />
              Apes on repeat.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#91897e]">
              Set what can pass, how much Caesar can size, and exactly where
              Cornelius gets you out. The crew runs the same handoff on every
              simulated launch.
            </p>
            <Link
              href="/desk"
              className="group mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#ff7250]"
            >
              Build your play
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <ol className="mt-12 hidden border-t border-[#302a20] lg:block">
              {FLOW.map(([number, title, body]) => (
                <li key={number} className="border-b border-[#302a20] py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] text-[#ff7250]">{number}</span>
                    <h3 className="text-sm font-bold">{title}</h3>
                  </div>
                  <p className="mt-1 pl-8 text-xs leading-relaxed text-[#6f685f]">{body}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="glass-panel overflow-hidden rounded-[1.5rem] border border-[#3a3328]">
            <div className="flex items-center justify-between border-b border-[#302a20] px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                  Play 01 · active
                </p>
                <h3 className="mt-1 text-xl font-extrabold">Quick Pounce</h3>
              </div>
              <span className="rounded-full border border-[#c7ff45]/25 bg-[#c7ff45]/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#c7ff45]">
                Human gate on
              </span>
            </div>

            <div className="grid gap-px bg-[#302a20] sm:grid-cols-2">
              <StrategyControl
                label="Run budget"
                value="8 SOL"
                note="Hard cap across all open bags"
                progress="64%"
              />
              <StrategyControl
                label="Max per coin"
                value="1.5 SOL"
                note="Caesar cannot size above this"
                progress="42%"
              />
              <StrategyControl
                label="Min liquidity"
                value="18 SOL"
                note="Kong blocks anything thinner"
                progress="55%"
              />
              <StrategyControl
                label="Entry velocity"
                value="1.4×"
                note="Cheeta waits, never chases"
                progress="72%"
              />
            </div>

            <div className="border-t border-[#302a20] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Crew handoff</p>
                  <p className="mt-0.5 text-xs text-[#6f685f]">One plan, four signed calls</p>
                </div>
                <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-[#c7ff45]">
                  <span className="live-dot size-1.5 rounded-full bg-[#c7ff45] text-[#c7ff45]" />
                  Armed
                </span>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {CREW.map((ape, index) => (
                  <div key={ape.name} className="relative text-center">
                    {index < CREW.length - 1 && (
                      <span className="absolute left-[62%] top-5 h-px w-[76%] bg-gradient-to-r from-[#4b4134] to-[#4b4134]/15" />
                    )}
                    <Image
                      src={ape.image}
                      alt=""
                      width={48}
                      height={48}
                      className="relative mx-auto size-11 rounded-xl border border-[#3a3328] object-cover sm:size-12"
                    />
                    <p className="mt-2 truncate text-[10px] font-bold">{ape.name}</p>
                    <p className="mt-0.5 font-mono text-[7px] uppercase tracking-wider" style={{ color: ape.color }}>
                      {ape.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[#302a20] bg-[#090806]/80 p-4">
              <Link
                href="/desk"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff4f1f] px-5 py-3 text-sm font-extrabold text-[#090806] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
              >
                Run this play in simulation
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
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
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#c7ff45] px-5 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5"
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

function ProductProof() {
  return (
    <section className="overflow-hidden px-5 pb-20 sm:px-8 sm:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff7250]">
              Product proof
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-none tracking-[-0.055em] sm:text-5xl">
              The whole call.
              <br />
              <span className="text-stroke">Right on the tape.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#91897e]">
            Price is only half the story. Apegate shows which ape acted, the
            exact rule it used, and what needs your attention next.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-16 -z-10 bg-[radial-gradient(circle_at_55%_45%,rgb(255_79_31_/_10%),transparent_55%)]" />
          <div className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0b0a08] shadow-[0_42px_110px_rgb(0_0_0_/_48%)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#302a20] bg-[#12100c] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <Image
                  src="/apegate-logo.jpg"
                  alt=""
                  width={30}
                  height={30}
                  className="size-7 rounded-lg border border-[#ff4f1f]/25 object-cover"
                />
                <div>
                  <p className="text-xs font-bold">Apegate simulation desk</p>
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#6f685f]">
                    Quick Pounce · human approval
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-2 rounded-full border border-[#c7ff45]/20 bg-[#c7ff45]/5 px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-wider text-[#c7ff45]">
                <span className="live-dot size-1.5 rounded-full bg-[#c7ff45] text-[#c7ff45]" />
                Crew running
              </span>
            </div>

            <div className="grid lg:grid-cols-[1.4fr_0.78fr]">
              <div className="min-w-0 border-b border-[#302a20] p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-extrabold">$APE74</span>
                      <span className="rounded bg-[#c7ff45]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#c7ff45]">
                        +18.7%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6f685f]">
                      Simulated Pump.fun-style market
                    </p>
                  </div>
                  <div className="flex gap-5 text-right">
                    <div>
                      <p className="font-mono text-[8px] uppercase text-[#6f685f]">Liquidity</p>
                      <p className="mt-1 text-xs font-bold">52.4 SOL</p>
                    </div>
                    <div>
                      <p className="font-mono text-[8px] uppercase text-[#6f685f]">Velocity</p>
                      <p className="mt-1 text-xs font-bold text-[#ffb13c]">1.62×</p>
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 h-64 overflow-hidden rounded-xl border border-[#262119] bg-[#090806] sm:h-80">
                  <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgb(255_255_255_/_4%)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_4%)_1px,transparent_1px)] [background-size:52px_52px]" />
                  <div className="absolute left-[8%] top-[22%] rounded-md border border-[#ffb13c]/25 bg-[#21180c] px-2 py-1 font-mono text-[8px] text-[#ffb13c]">
                    Cheeta locked entry
                  </div>
                  <div className="absolute bottom-[16%] right-[7%] rounded-md border border-[#c7ff45]/25 bg-[#17200b] px-2 py-1 font-mono text-[8px] text-[#c7ff45]">
                    Caesar pitch ready
                  </div>
                  <svg
                    viewBox="0 0 760 280"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    aria-label="Animated simulated price chart"
                  >
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#ff4f1f" stopOpacity=".28" />
                        <stop offset="1" stopColor="#ff4f1f" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 242 C55 238 66 214 112 220 S174 198 207 204 S254 168 292 181 S345 160 378 168 S426 123 458 137 S501 99 542 112 S594 80 621 91 S665 46 701 65 S735 36 760 44 V280 H0 Z"
                      fill="url(#chartFill)"
                    />
                    <path
                      className="chart-path"
                      d="M0 242 C55 238 66 214 112 220 S174 198 207 204 S254 168 292 181 S345 160 378 168 S426 123 458 137 S501 99 542 112 S594 80 621 91 S665 46 701 65 S735 36 760 44"
                      fill="none"
                      stroke="#ff6236"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="absolute inset-x-5 bottom-4 flex justify-between font-mono text-[8px] text-[#4f4941]">
                    <span>0m</span><span>5m</span><span>10m</span><span>15m</span><span>20m</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {CREW.map((ape) => (
                    <div key={ape.name} className="flex min-w-0 items-center gap-2 rounded-lg border border-[#262119] bg-[#12100c] p-2">
                      <Image
                        src={ape.image}
                        alt=""
                        width={28}
                        height={28}
                        className="size-7 shrink-0 rounded-md object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-bold">{ape.name}</p>
                        <p className="truncate font-mono text-[7px] uppercase tracking-wider" style={{ color: ape.color }}>
                          Online
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="min-w-0">
                <div className="flex items-center justify-between border-b border-[#302a20] px-4 py-3.5 sm:px-5">
                  <div>
                    <p className="text-xs font-bold">Decision tape</p>
                    <p className="mt-0.5 text-[9px] text-[#6f685f]">Every ape signs its work</p>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[#6f685f]">Newest first</span>
                </div>
                <ul className="divide-y divide-[#262119]">
                  {SAMPLE_TAPE.map((row, index) => {
                    const ape = CREW.find((member) => member.name === row.who) ?? CREW[0];
                    return (
                      <li key={`${row.who}-${row.action}`} className="flex gap-3 px-4 py-3.5 sm:px-5">
                        <Image
                          src={ape.image}
                          alt=""
                          width={34}
                          height={34}
                          className="size-8 shrink-0 rounded-lg border border-[#302a20] object-cover"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[10px] font-bold" style={{ color: ape.color }}>{row.who}</span>
                            <span className="text-xs font-semibold">{row.action}</span>
                            <span className="font-mono text-[9px] text-[#ff7250]">{row.coin}</span>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-[#7e766c]">{row.why}</p>
                          {index === 3 && (
                            <span className="mt-2 inline-flex rounded-full bg-[#c7ff45]/10 px-2 py-1 font-mono text-[7px] font-bold uppercase tracking-wider text-[#c7ff45]">
                              Needs your call
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyControl({
  label,
  value,
  note,
  progress,
}: {
  label: string;
  value: string;
  note: string;
  progress: string;
}) {
  return (
    <div className="bg-[#12100c] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold">{label}</p>
        <p className="font-mono text-xs font-bold text-[#ff7250]">{value}</p>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#27221a]">
        <div
          className="shimmer h-full rounded-full bg-[linear-gradient(90deg,#ff4f1f,#ff9a45,#ff4f1f)]"
          style={{ width: progress }}
        />
      </div>
      <p className="mt-3 text-[10px] text-[#6f685f]">{note}</p>
    </div>
  );
}
