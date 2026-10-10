"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleOff,
  FlaskConical,
  Fingerprint,
  RotateCw,
} from "lucide-react";
import { useState } from "react";
import {
  buildLabReport,
  type LabReport,
} from "../../../packages/core/src";
import { useLaunchFeed } from "@/lib/use-launch-feed";

export function LabReplay() {
  const { launches, status } = useLaunchFeed();
  const [report, setReport] = useState<LabReport | null>(null);
  const [running, setRunning] = useState(false);
  const replay = launches.filter((launch) => launch.source === "replay");

  async function run() {
    setRunning(true);
    setReport(
      await buildLabReport(
        replay.map((launch) => ({
          facts: launch.facts,
          verdict: launch.verdict,
        })),
      ),
    );
    setRunning(false);
  }

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <Image
                src="/apegate-logo.jpg"
                alt=""
                width={38}
                height={38}
                priority
                className="size-9 rounded-xl border border-[#ff4f1f]/35 object-cover"
              />
              <span className="hidden text-sm font-extrabold sm:block">
                APEGATE
              </span>
            </Link>
            <span className="h-5 w-px bg-[#31291f]" />
            <div>
              <p className="text-xs font-bold">Zira&apos;s Lab</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Deterministic replay · limited tape
              </p>
            </div>
          </div>
          <Link
            href="/plans"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#ff7ad9]/50"
          >
            <ArrowLeft className="size-3" />
            Plans
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff7ad9]/25 bg-[#ff7ad9]/7 px-3 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#ff9ee4]">
              <FlaskConical className="size-3" />
              REPLAY · {replay.length} recorded creates
            </span>
            <h1 className="mt-6 text-5xl font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-7xl">
              Show the gaps.
              <br />
              <span className="text-stroke">Not a fake score.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#91897e]">
              Zira recomputes the same Gate facts into a deterministic replay
              hash. This fixture has real create events, but not enough history
              or outcome labels for win rate, precision, recall, or a report
              card.
            </p>
            <button
              type="button"
              onClick={() => void run()}
              disabled={running || replay.length === 0}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#ff7ad9] px-5 py-3.5 text-sm font-extrabold text-[#090806] disabled:bg-[#242019] disabled:text-[#5f584f]"
            >
              <RotateCw className={`size-4 ${running ? "animate-spin" : ""}`} />
              {running ? "Recomputing…" : "Run deterministic replay"}
            </button>
            <Link
              href="/rafiki"
              className="ml-2 inline-flex items-center rounded-full border border-[#a47bff]/25 px-4 py-3.5 text-sm font-bold text-[#c1a8ff] hover:border-[#a47bff]/50"
            >
              Ask Rafiki
            </Link>
            <p className="mt-3 font-mono text-[7px] uppercase tracking-[0.12em] text-[#4f4941]">
              Live feed status · {status.toUpperCase()} · replay input only
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#0d0b09] shadow-[0_35px_90px_rgb(0_0_0_/_35%)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#31291f] p-5">
              <div>
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#ff7ad9]">
                  Kong report card
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {report ? "Limited replay result" : "Awaiting replay"}
                </h2>
              </div>
              <span className="rounded border border-wait/25 bg-wait/7 px-2 py-1 font-mono text-[7px] font-bold text-wait">
                NOT PUBLISHED
              </span>
            </div>

            {report ? (
              <div className="p-5">
                <div className="grid grid-cols-4 gap-2">
                  {(["PASS", "WARN", "BLOCK", "WAIT"] as const).map((kind) => (
                    <div
                      key={kind}
                      className="rounded-xl border border-[#272119] bg-[#090806] p-3"
                    >
                      <p className="text-xl font-extrabold">
                        {report.verdicts[kind]}
                      </p>
                      <p className="mt-1 font-mono text-[7px] text-[#5f584f]">
                        {kind}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <UnavailableMetric label="Precision / recall" />
                  <UnavailableMetric label="Win rate / expectancy" />
                  <UnavailableMetric label="Max drawdown" />
                  <div className="rounded-xl border border-pass/20 bg-pass/5 p-3">
                    <p className="flex items-center gap-1.5 text-[9px] font-bold text-pass">
                      <Check className="size-3" />
                      Replay deterministic
                    </p>
                    <p className="mt-1 text-[7px] text-[#668e7a]">
                      Same ordered tape produces the same hash.
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-[#272119] bg-[#090806] p-3">
                  <p className="flex items-center gap-2 font-mono text-[7px] uppercase tracking-wider text-[#4f4941]">
                    <Fingerprint className="size-3 text-[#ff7ad9]" />
                    Replay hash
                  </p>
                  <p className="mt-2 break-all font-mono text-[8px] text-[#91897e]">
                    {report.replayHash}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-96 items-center justify-center p-8 text-center">
                <div>
                  <FlaskConical className="mx-auto size-7 text-[#ff7ad9]" />
                  <p className="mt-3 text-xs font-bold">No report generated.</p>
                  <p className="mt-1 text-[9px] text-[#6f685f]">
                    Run the replay to hash the current recorded tape.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Production tape",
              copy: "Seven consecutive days are required before later calibration work.",
            },
            {
              title: "Outcome labels",
              copy: "Graduated, died, rugged, and survived labels are not present in this fixture.",
            },
            {
              title: "Canary calibration",
              copy: "Real landing, latency, slippage, and failure bands need bounded mainnet canaries.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#31291f] bg-[#0d0b09] p-5"
            >
              <CircleOff className="size-4 text-wait" />
              <h2 className="mt-4 text-sm font-extrabold">{item.title}</h2>
              <p className="mt-2 text-[9px] leading-relaxed text-[#6f685f]">
                {item.copy}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#ffb13c]/20 bg-[#ffb13c]/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ffb13c]" />
          <p className="text-[9px] leading-relaxed text-[#9f8358]">
            This Lab slice proves deterministic recomputation only. It does not
            backtest an entry model, estimate returns, or claim Kong accuracy.
          </p>
        </div>
      </main>
    </div>
  );
}

function UnavailableMetric({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-[#272119] bg-[#090806] p-3">
      <p className="text-sm font-extrabold text-wait">Unavailable</p>
      <p className="mt-1 text-[7px] text-[#5f584f]">{label}</p>
    </div>
  );
}
