import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const TICKETS = [
  {
    symbol: "RICK",
    name: "Gucci Rick",
    reason: "Safety reads resolving",
    mayhem: true,
  },
  {
    symbol: "ATLAS",
    name: "Atlas Pad",
    reason: "1 trade observed",
    mayhem: false,
  },
  {
    symbol: "PF",
    name: "Print.Fun",
    reason: "Mint checks in progress",
    mayhem: false,
  },
] as const;

export function GateHero() {
  return (
    <section className="ape-grid relative overflow-hidden pt-24 sm:pt-28">
      <div className="pointer-events-none absolute left-[16%] top-12 -z-10 size-[520px] rounded-full bg-[#ff4f1f]/10 blur-[150px]" />
      <div className="mx-auto grid min-h-[720px] max-w-7xl gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12 lg:pb-24">
        <div className="rise max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff4f1f]/35 bg-[#1a110c] px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#ff8a64]">
            <span className="live-dot size-1.5 rounded-full bg-[#ff4f1f] text-[#ff4f1f]" />
            Recorded Pump launches at the gate
            <SourcePill>REPLAY</SourcePill>
          </div>
          <p className="mt-7 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ape-kong">
            Kong checks. You decide.
          </p>
          <h1 className="mt-3 text-[3.35rem] font-extrabold leading-[0.91] tracking-[-0.07em] text-[#f4efe5] sm:text-7xl lg:text-[5.8rem] text-balance">
            Ape through
            <br />
            <span className="text-[#ff4f1f]">the gate.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#b6aea1] sm:text-lg">
            Apegate puts every fresh Pump.fun launch through Kong&apos;s
            evidence-backed checks. See what passed, what got blocked, and the
            receipt behind every call—before your wallet signs.
          </p>
          <div className="mt-6 grid max-w-xl gap-2 text-sm text-[#ded7cb] sm:grid-cols-3">
            <Trust icon={<ShieldCheck className="size-4" />}>Chain facts</Trust>
            <Trust icon={<Fingerprint className="size-4" />}>
              Hashed receipts
            </Trust>
            <Trust icon={<WalletCards className="size-4" />}>Manual sign</Trust>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/feed"
              className="group inline-flex items-center gap-2 rounded-full bg-fg px-5 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5 hover:bg-fg-2"
            >
              Open the live gate
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#receipts"
              className="rounded-full border border-[#3a3328] bg-[#12100c]/75 px-5 py-3.5 text-sm font-semibold text-[#f4efe5] hover:border-[#ff4f1f]/65"
            >
              Inspect a receipt
            </Link>
          </div>
          <p className="mt-4 max-w-lg text-xs leading-relaxed text-[#766f65]">
            Read-only intelligence is live when the public stream is reachable.
            Real trading is disabled; PAPER mode is available. Recorded tape
            takes over if the stream drops.
          </p>
        </div>

        <div className="rise-delay relative mx-auto min-h-[560px] w-full max-w-[680px] lg:min-h-[640px]">
          <div className="agent-glow absolute inset-x-[16%] bottom-[5%] h-[64%] rounded-full bg-[#ff4f1f]/25 blur-[110px]" />
          <div className="absolute inset-x-[2%] bottom-[2%] top-[4%] overflow-hidden rounded-[2rem] border border-[#3a3328] bg-[linear-gradient(145deg,rgb(255_255_255_/_4%),transparent_38%),#0c0a08] shadow-[inset_0_1px_0_rgb(255_255_255_/_6%),0_38px_110px_rgb(0_0_0_/_60%)]">
            <div className="flex items-center justify-between border-b border-[#302a20] px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/apegate-logo.jpg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 rounded-lg border border-[#ff4f1f]/30 object-cover"
                />
                <div>
                  <p className="text-xs font-bold">Kong&apos;s Gate</p>
                  <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                    gate-1.1.0 · standard
                  </p>
                </div>
              </div>
              <SourcePill>REPLAY</SourcePill>
            </div>

            <div className="relative grid min-h-[500px] gap-0 sm:grid-cols-[0.95fr_1.05fr]">
              <div className="relative overflow-hidden border-b border-[#302a20] p-4 sm:border-b-0 sm:border-r sm:p-5">
                <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgb(255_255_255_/_4%)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_4%)_1px,transparent_1px)] [background-size:36px_36px]" />
                <div className="relative">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-ape-cheeta">
                    Cheeta · incoming
                  </p>
                  <div className="mt-4 space-y-2.5">
                    {TICKETS.map((ticket, index) => (
                      <article
                        key={ticket.symbol}
                        className={`rise-delay-${index === 0 ? "2" : ""} group rounded-xl border border-[#31291f] bg-[#12100c]/95 p-3 shadow-[0_12px_32px_rgb(0_0_0_/_25%)]`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-ape-kong/25 bg-signal/10 text-[10px] font-black text-ape-kong">
                              {ticket.symbol.slice(0, 2)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold">
                                ${ticket.symbol}
                              </p>
                              <p className="truncate text-[8px] text-[#6f685f]">
                                {ticket.name}
                              </p>
                            </div>
                          </div>
                          <span className="rounded border border-wait/30 bg-wait/8 px-1.5 py-1 font-mono text-[7px] font-bold text-wait">
                            WAIT
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#272119] pt-2">
                          <p className="truncate font-mono text-[7px] text-[#766f65]">
                            {ticket.reason}
                          </p>
                          {ticket.mayhem ? (
                            <span className="font-mono text-[6px] font-bold text-warn">
                              MAYHEM
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col p-4 sm:p-5">
                <div className="scan-line absolute inset-x-[12%] top-[24%] h-px bg-gradient-to-r from-transparent via-ape-kong to-transparent shadow-[0_0_18px_#ff4f1f]" />
                <div className="relative mx-auto w-[74%] overflow-hidden rounded-[1.4rem] border border-[#ff4f1f]/30 bg-[#090806] shadow-[0_22px_70px_rgb(0_0_0_/_60%)]">
                  <div className="relative aspect-[1.2/1]">
                    <Image
                      src="/agents/kong.jpg"
                      alt="Kong, keeper of Apegate's Gate"
                      fill
                      priority
                      sizes="(max-width: 768px) 60vw, 300px"
                      className="agent-float object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#090806] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-mono text-[7px] font-bold uppercase tracking-[0.16em] text-ape-kong">
                        Gate keeper
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold">Kong</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#302a20] bg-[#12100c] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold">Latest receipt</p>
                    <span className="font-mono text-[7px] text-pass">
                      SHA-256 ✓
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-[9px]">
                    <ReceiptLine done>Creation transaction linked</ReceiptLine>
                    <ReceiptLine done>Mayhem flag decoded</ReceiptLine>
                    <ReceiptLine>Holder reads collecting</ReceiptLine>
                  </div>
                  <p className="mt-3 truncate border-t border-[#272119] pt-2 font-mono text-[7px] text-[#4f4941]">
                    47e9a19d…c4b0 · previous 8b21…06fa
                  </p>
                </div>

                <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
                  <GateCounter label="Captured" value="8" />
                  <GateCounter label="Verdict" value="WAIT" />
                  <GateCounter label="Mode" value="READ" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden border-y border-[#302a20] bg-[#0d0b09] py-3.5">
        <div className="ticker flex w-max whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6f685f]">
          {[0, 1].map((set) => (
            <span key={set}>
              <strong className="text-[#ff4f1f]">Fresh facts in</strong>
              {"  ◆  "}Kong checks{"  ◆  "}
              <strong className="text-pass">Receipt out</strong>
              {"  ◆  "}Limits stay armed{"  ◆  "}Your wallet signs{"  ◆  "}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-pass">{icon}</span>
      {children}
    </span>
  );
}

function ReceiptLine({
  children,
  done,
}: {
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="size-3 text-pass" />
      ) : (
        <span className="ml-0.5 size-2 animate-pulse rounded-full bg-wait" />
      )}
      <span className={done ? "text-[#91897e]" : "text-wait"}>
        {children}
      </span>
    </div>
  );
}

function GateCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#272119] bg-[#090806] p-2 text-center">
      <p className="font-mono text-[9px] font-bold">{value}</p>
      <p className="mt-0.5 text-[6px] uppercase tracking-wider text-[#554f47]">
        {label}
      </p>
    </div>
  );
}

function SourcePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-signal/25 bg-signal/8 px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-[0.1em] text-[#ff8a64]">
      {children}
    </span>
  );
}
