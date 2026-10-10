import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

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
              className="group inline-flex items-center gap-2 rounded-full bg-[#ff4f1f] px-5 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
            >
              Run the simulation
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#crew"
              className="rounded-full border border-[#3a3328] bg-[#12100c]/75 px-5 py-3.5 text-sm font-semibold text-[#f4efe5] hover:border-[#ff4f1f]/65"
            >
              Meet your apes
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#766f65]">
            Practice mode only. Simulated market data, buys, and exits.
          </p>
        </div>

        <div className="rise-delay relative mx-auto h-[500px] w-full max-w-[560px] sm:h-[580px]">
          <div className="agent-glow absolute inset-x-[12%] bottom-[3%] h-[54%] rounded-full bg-[#ff4f1f]/25 blur-[100px]" />
          <div className="absolute inset-x-[3%] bottom-[2%] h-[74%] rounded-[2rem] border border-[#3a3328] bg-[radial-gradient(circle_at_50%_75%,rgb(255_79_31_/_14%),transparent_58%),linear-gradient(180deg,rgb(18_16_12_/_20%),rgb(18_16_12_/_80%))] shadow-[inset_0_1px_0_rgb(255_255_255_/_6%),0_35px_100px_rgb(0_0_0_/_58%)]" />
          <div className="scan-line absolute inset-x-[9%] top-[26%] z-20 h-px bg-gradient-to-r from-transparent via-[#ff7250] to-transparent shadow-[0_0_18px_#ff4f1f]" />

          <article className="agent-float absolute bottom-[4%] left-1/2 z-10 w-[57%] -translate-x-1/2 overflow-hidden rounded-[1.6rem] border border-[#ff4f1f]/30 bg-[#0c0a08] shadow-[0_28px_70px_rgb(0_0_0_/_70%)]">
            <div className="relative aspect-square overflow-hidden">
              <Image
                src="/agents/kong.jpg"
                alt="Kong, Apegate scout"
                fill
                priority
                sizes="(max-width: 768px) 60vw, 320px"
                className="object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#090806] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                  Lead scout
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <h2 className="text-2xl font-extrabold tracking-[-0.04em]">Kong</h2>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-[#b8b0a4]">
                    <span className="live-dot size-1.5 rounded-full bg-[#c7ff45] text-[#c7ff45]" />
                    Scanning
                  </span>
                </div>
              </div>
            </div>
          </article>

          <AgentMini
            name="Cheeta"
            role="Watching"
            image="/agents/cheeta.jpg"
            color="#ffb13c"
            className="agent-float agent-float-delay-1 left-[0%] top-[8%]"
          />
          <AgentMini
            name="Caesar"
            role="Trade ready"
            image="/agents/caesar.jpg"
            color="#c7ff45"
            className="agent-float agent-float-delay-2 right-[0%] top-[2%]"
          />
          <AgentMini
            name="Cornelius"
            role="Limits armed"
            image="/agents/cornelius.jpg"
            color="#9ab7ff"
            className="agent-float agent-float-delay-3 bottom-[8%] right-[0%]"
          />

          <div className="glass-panel absolute bottom-[8%] left-[0%] z-20 hidden rounded-xl border border-[#3a3328] px-3 py-2.5 sm:block">
            <div className="flex -space-x-1.5">
              {["kong", "cheeta", "caesar", "cornelius"].map((ape) => (
                <Image
                  key={ape}
                  src={`/agents/${ape}.jpg`}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 rounded-full border-2 border-[#15120e] object-cover"
                />
              ))}
            </div>
            <p className="mt-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
              4 apes on your plan
            </p>
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

function AgentMini({
  name,
  role,
  image,
  color,
  className,
}: {
  name: string;
  role: string;
  image: string;
  color: string;
  className: string;
}) {
  return (
    <article
      className={`glass-panel absolute z-20 w-[32%] overflow-hidden rounded-2xl border border-[#3a3328] p-1.5 sm:w-[29%] ${className}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Image
          src={image}
          alt={`${name}, Apegate agent`}
          fill
          sizes="180px"
          className="object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#090806] to-transparent" />
      </div>
      <div className="px-1.5 pb-1 pt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs font-bold sm:text-sm">{name}</p>
          <span
            className="live-dot size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color, color }}
          />
        </div>
        <p
          className="mt-0.5 truncate font-mono text-[7px] font-bold uppercase tracking-wider sm:text-[8px]"
          style={{ color }}
        >
          {role}
        </p>
      </div>
    </article>
  );
}
