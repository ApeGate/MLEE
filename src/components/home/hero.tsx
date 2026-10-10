import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { SAMPLE_TAPE } from "@/lib/strategies";

export function HomeHero() {
  return (
    <section className="ape-grid relative overflow-hidden pt-24 sm:pt-28">
      <div className="pointer-events-none absolute left-1/2 top-16 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#ff4f1f]/10 blur-[140px]" />
      <div className="mx-auto grid min-h-[680px] max-w-7xl gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24">
        <div className="rise max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff4f1f]/35 bg-[#1a110c] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8a64]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#ff4f1f]" />
            Simulation live · no wallet connected
          </div>
          <p className="mt-7 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#c7ff45]">
            Four apes. One clear call.
          </p>
          <h1 className="mt-3 text-[3.15rem] font-extrabold leading-[0.94] tracking-[-0.065em] text-[#f4efe5] sm:text-7xl lg:text-[5.35rem] text-balance">
            Your ape crew for the{" "}
            <span className="text-[#ff4f1f]">trenches.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#b6aea1] sm:text-lg">
            Apegate turns your Pump.fun rules into a crew. Kong checks launches.
            Cheeta stalks entries. Caesar lines up the trade. Cornelius protects
            the exit. You see every call before you send it.
          </p>
          <ul className="mt-6 grid max-w-xl gap-2 text-sm text-[#ded7cb] sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#c7ff45]" />
              Clear reasons, not mystery scores
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#c7ff45]" />
              Your budget and exit rules first
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/desk"
              className="group inline-flex items-center gap-2 rounded-lg bg-[#ff4f1f] px-5 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
            >
              Run the simulation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#crew"
              className="rounded-lg border border-[#3a3328] bg-[#12100c]/75 px-5 py-3.5 text-sm font-semibold text-[#f4efe5] hover:border-[#ff4f1f]/65"
            >
              Meet your apes
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#766f65]">
            Practice mode only. Simulated market data, buys, and exits.
          </p>
        </div>

        <div className="rise-delay relative mx-auto w-full max-w-lg">
          <div className="absolute -inset-3 -z-10 rotate-2 rounded-[2rem] border border-[#ff4f1f]/25 bg-[#ff4f1f]/5" />
          <div className="ape-card overflow-hidden rounded-[1.5rem] border border-[#3a3328] shadow-[0_30px_90px_rgb(0_0_0_/_55%)]">
            <div className="flex items-center gap-4 border-b border-[#302a20] p-4 sm:p-5">
              <Image
                src="/apegate-logo.jpg"
                alt="Apegate ape mark"
                width={76}
                height={76}
                priority
                className="size-16 rounded-xl border border-[#ff4f1f]/35 object-cover sm:size-[76px]"
              />
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ff7250]">
                  Apegate decision tape
                </p>
                <p className="mt-1 text-lg font-bold tracking-tight">
                  Crew has the floor
                </p>
                <p className="mt-0.5 text-xs text-[#8f877b]">
                  Sample run · simulated data
                </p>
              </div>
              <span className="ml-auto hidden size-2 rounded-full bg-[#c7ff45] shadow-[0_0_14px_#c7ff45] sm:block" />
            </div>
            <ul className="divide-y divide-[#302a20]">
              {SAMPLE_TAPE.map((row, index) => (
                <li
                  key={`${row.coin}-${row.action}`}
                  className="grid grid-cols-[78px_1fr] gap-3 px-4 py-3.5 sm:grid-cols-[92px_1fr] sm:px-5"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase ${
                        index === 0
                          ? "bg-[#30251e] text-[#ff8a64]"
                          : index === 1
                            ? "bg-[#202816] text-[#c7ff45]"
                            : "bg-[#201c16] text-[#b6aea1]"
                      }`}
                    >
                      {row.who}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-bold text-[#f4efe5]">
                        {row.action}
                      </span>
                      <span className="font-mono text-xs text-[#ff7250]">
                        {row.coin}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#8f877b]">
                      {row.why}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-[#302a20] bg-[#0d0b09] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[#6f685f]">
              <span>Gate status</span>
              <span className="text-[#c7ff45]">Human approval armed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-[#302a20] bg-[#0d0b09] py-3.5">
        <div className="ticker flex w-max whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6f685f]">
          {[0, 1].map((set) => (
            <span key={set}>
              <strong className="text-[#ff4f1f]">Kong scans</strong>
              {"  ◆  "}Cheeta watches{"  ◆  "}
              <strong className="text-[#c7ff45]">Caesar calls</strong>
              {"  ◆  "}Cornelius guards{"  ◆  "}Your rules{"  ◆  "}Your call
              {"  ◆  "}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
