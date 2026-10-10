import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Binoculars,
  BrainCircuit,
  Check,
  CircleOff,
  Crosshair,
  FlaskConical,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Crew",
  description:
    "Meet Apegate's six bounded jobs: Gate, scout, plans, exits, explanations, and replay accuracy.",
  alternates: {
    canonical: "https://apegate.io/crew",
  },
};

const CREW = [
  {
    name: "Kong",
    role: "The Gate",
    summary:
      "Turns observed facts into deterministic PASS, WARN, BLOCK, or WAIT decisions and signs every call with evidence.",
    can: "Decide the Gate and block unsafe actions",
    cannot: "Sign, send, or override your wallet",
    status: "LIVE",
    statusCopy: "Gate 1.1 checks and local decision receipts",
    color: "#ff4f1f",
    image: "/agents/kong.jpg",
    icon: ScanSearch,
  },
  {
    name: "Cheeta",
    role: "Scout & watch",
    summary:
      "Keeps fresh launches moving through the lane and makes live versus recorded discovery impossible to miss.",
    can: "Discover launches and raise watch events",
    cannot: "Chase a coin or decide an entry",
    status: "LIVE",
    statusCopy: "Public launch stream with recorded-tape fallback",
    color: "#ffb13c",
    image: "/agents/cheeta.jpg",
    icon: Binoculars,
  },
  {
    name: "Caesar",
    role: "Plans & trades",
    summary:
      "Prepares explicit order previews, fees, routes, and plans. Manual wallet approval remains the default.",
    can: "Prepare paper and manual-sign actions",
    cannot: "Send around Kong or your configured caps",
    status: "PREVIEW",
    statusCopy: "Fee preview and Launch Bay preparation",
    color: "#c7ff45",
    image: "/agents/caesar.jpg",
    icon: Crosshair,
  },
  {
    name: "Cornelius",
    role: "Bags & exits",
    summary:
      "Owns spend limits, position truth, exit ladders, and the hard boundaries around the future policy Vault.",
    can: "Tighten exits and enforce wallet policy",
    cannot: "Loosen protection without your receipt",
    status: "SCAFFOLD",
    statusCopy: "Manual custody path and Privy readiness",
    color: "#5cc8ff",
    image: "/agents/cornelius.jpg",
    icon: ShieldCheck,
  },
  {
    name: "Rafiki",
    role: "Explain-only AI",
    summary:
      "Explains a receipt from its cited facts and can draft a plan for review. Numbers stay injected from deterministic data.",
    can: "Explain, cite, and draft for review",
    cannot: "Trade, size, approve, or change exits",
    status: "SCAFFOLD",
    statusCopy: "Deterministic fallback ships before model access",
    color: "#a47bff",
    image: null,
    icon: BrainCircuit,
  },
  {
    name: "Zira",
    role: "Replay & accuracy",
    summary:
      "Replays the same rules over recorded tape and keeps misses, saves, fees, and base rates in the open.",
    can: "Measure what happened on real tape",
    cannot: "Turn a replay into a promise",
    status: "TAPE ON",
    statusCopy: "Recorded-real fixture; full Lab follows",
    color: "#ff7ad9",
    image: null,
    icon: FlaskConical,
  },
] as const;

export default function CrewPage() {
  return (
    <main className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="border-b border-[#31291f] bg-[#080705]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/apegate-logo.jpg"
              alt=""
              width={38}
              height={38}
              priority
              className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
            />
            <span className="text-sm font-extrabold">APEGATE</span>
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#ff7250]/50"
          >
            <ArrowLeft className="size-3" />
            Kong&apos;s Gate
          </Link>
        </div>
      </header>

      <section className="px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                Six bounded jobs · one Gate
              </p>
              <h1 className="mt-3 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-7xl">
                Every ape has
                <br />
                <span className="text-stroke">a hard stop.</span>
              </h1>
            </div>
            <p className="max-w-xl text-sm leading-relaxed text-[#91897e]">
              The crew is an ownership map, not six opinions. Kong owns the
              decision. Each other ape has a narrow job, visible evidence, and
              a boundary it cannot cross.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-2">
          {CREW.map((ape, index) => {
            const Icon = ape.icon;
            return (
              <article
                key={ape.name}
                className="group overflow-hidden rounded-[1.5rem] border border-[#302a20] bg-[#0d0b09] transition-transform hover:-translate-y-1"
              >
                <div className="grid min-h-full sm:grid-cols-[190px_1fr]">
                  <div className="relative min-h-64 overflow-hidden border-b border-[#302a20] bg-[#090806] sm:min-h-full sm:border-b-0 sm:border-r">
                    {ape.image ? (
                      <Image
                        src={ape.image}
                        alt={`${ape.name}, Apegate ${ape.role}`}
                        fill
                        sizes="190px"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `radial-gradient(circle at 50% 40%, ${ape.color}35, transparent 34%), #090806`,
                        }}
                      >
                        <Icon
                          className="size-16 opacity-85"
                          style={{ color: ape.color }}
                        />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#090806] to-transparent" />
                    <span
                      className="absolute bottom-4 left-4 rounded-full border bg-[#090806]/85 px-2.5 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.14em] backdrop-blur"
                      style={{ color: ape.color, borderColor: `${ape.color}55` }}
                    >
                      0{index + 1} · {ape.status}
                    </span>
                  </div>

                  <div className="flex flex-col p-5 sm:p-6">
                    <p
                      className="font-mono text-[8px] font-bold uppercase tracking-[0.17em]"
                      style={{ color: ape.color }}
                    >
                      {ape.role}
                    </p>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-[-0.05em]">
                      {ape.name}
                    </h2>
                    <p className="mt-4 text-[11px] leading-relaxed text-[#91897e]">
                      {ape.summary}
                    </p>
                    <div className="mt-5 space-y-2 border-t border-[#302a20] pt-4">
                      <Boundary
                        icon={<Check className="size-3" />}
                        copy={ape.can}
                        color="text-pass"
                      />
                      <Boundary
                        icon={<CircleOff className="size-3" />}
                        copy={ape.cannot}
                        color="text-[#6f685f]"
                      />
                    </div>
                    <p className="mt-auto pt-5 font-mono text-[7px] uppercase tracking-[0.12em] text-[#4f4941]">
                      Current · {ape.statusCopy}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#c7ff45]">
              The rule above every role
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.05em]">
              Facts → checks → verdict → receipt.
            </h2>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#6f685f]">
              AI can explain the chain. It cannot alter the chain, the rules,
              the wallet policy, or a user&apos;s approval.
            </p>
          </div>
          <Link
            href="/feed"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f4efe5] px-5 py-3 text-sm font-extrabold text-[#090806]"
          >
            Ape through the Gate
          </Link>
        </div>
      </section>
    </main>
  );
}

function Boundary({
  icon,
  copy,
  color,
}: {
  icon: React.ReactNode;
  copy: string;
  color: string;
}) {
  return (
    <p className={`flex items-start gap-2 text-[9px] leading-relaxed ${color}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      {copy}
    </p>
  );
}
