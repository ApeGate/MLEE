import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Ban,
  Binoculars,
  BrainCircuit,
  Check,
  CircleOff,
  Crosshair,
  Fingerprint,
  FlaskConical,
  LockKeyhole,
  ScanSearch,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const CREW = [
  {
    name: "Kong",
    role: "Gate",
    job: "Turns chain facts into PASS, WARN, BLOCK, or WAIT—with evidence.",
    can: "Decide the Gate",
    cannot: "Sign a trade",
    color: "#ff7250",
    image: "/agents/kong.jpg",
    icon: ScanSearch,
  },
  {
    name: "Cheeta",
    role: "Scout & watch",
    job: "Finds fresh launches and keeps lifecycle lanes moving.",
    can: "Watch the firehose",
    cannot: "Chase an entry",
    color: "#ffb13c",
    image: "/agents/cheeta.jpg",
    icon: Binoculars,
  },
  {
    name: "Caesar",
    role: "Plans & trades",
    job: "Builds the trade preview and asks before a manual send.",
    can: "Prepare a trade",
    cannot: "Bust your caps",
    color: "#c7ff45",
    image: "/agents/caesar.jpg",
    icon: Crosshair,
  },
  {
    name: "Cornelius",
    role: "Bags & exits",
    job: "Guards spend limits, open bags, and every planned exit.",
    can: "Enforce limits",
    cannot: "Loosen exits",
    color: "#9ab7ff",
    image: "/agents/cornelius.jpg",
    icon: ShieldCheck,
  },
  {
    name: "Rafiki",
    role: "Explain-only AI",
    job: "Explains receipts and drafts plain-English plans for review.",
    can: "Explain the facts",
    cannot: "Trade or size",
    color: "#a47bff",
    image: null,
    icon: BrainCircuit,
  },
  {
    name: "Zira",
    role: "Replay & accuracy",
    job: "Replays plans on real tape and grades Kong without spin.",
    can: "Measure the record",
    cannot: "Promise tomorrow",
    color: "#ff7ad9",
    image: null,
    icon: FlaskConical,
  },
] as const;

export function GateSections() {
  return (
    <>
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                Real utility · right now
              </p>
              <h2 className="mt-3 text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
                Fresh launches.
                <br />
                <span className="text-stroke">No mystery call.</span>
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-[#91897e]">
              The public feed connects directly to the Pump launch stream,
              follows new-token trades, reads mint safety from Solana, and asks
              an independent risk service for holder and creator context. If a
              source is missing, Kong says WAIT—never PASS by omission.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-3">
            <UtilityCard
              icon={<Binoculars className="size-5" />}
              eyebrow="Cheeta"
              title="Live discovery"
              body="Fresh Pump.fun creates arrive in the feed as they happen. A recorded real tape is the visible fallback."
              source="LIVE / REPLAY"
            />
            <UtilityCard
              icon={<ScanSearch className="size-5" />}
              eyebrow="Kong"
              title="Risk checks"
              body="Mint authorities, creator share, top-holder concentration, mayhem mode, and independent flags feed one deterministic ruleset."
              source="CHAIN"
            />
            <UtilityCard
              icon={<Fingerprint className="size-5" />}
              eyebrow="Every call"
              title="Decision receipts"
              body="Canonical JSON is SHA-256 hashed and linked to the previous decision. The Phase 1 tape stays local to this browser."
              source="LOCAL"
            />
          </div>

          <div className="mt-5 flex justify-center">
            <Link
              href="/feed"
              className="group inline-flex items-center gap-2 rounded-full bg-[#f4efe5] px-5 py-3 text-sm font-extrabold text-[#090806] transition-transform hover:-translate-y-0.5"
            >
              Watch Kong work
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="receipts"
        className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#c7ff45]">
              Say no with receipts
            </p>
            <h2 className="mt-3 text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
              Kong shows
              <br />
              <span className="text-stroke">his work.</span>
            </h2>
            <div className="mt-7 space-y-4">
              <ProofLine>
                Numbers come from the chain or named risk sources—not a
                chatbot.
              </ProofLine>
              <ProofLine>
                Rule version, profile, facts hash, and evidence travel with the
                verdict.
              </ProofLine>
              <ProofLine>
                Each local receipt links to the previous hash, so edits break
                the chain.
              </ProofLine>
            </div>
            <p className="mt-7 max-w-lg text-xs leading-relaxed text-[#6f685f]">
              Server persistence and daily Solana anchoring are not live yet.
              Today&apos;s receipts are cryptographically real and stored only
              in your browser.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-12 -z-10 bg-[radial-gradient(circle,rgb(199_255_69_/_8%),transparent_62%)]" />
            <article className="overflow-hidden rounded-[1.6rem] border border-[#3a3328] bg-[#090806] shadow-[0_40px_100px_rgb(0_0_0_/_45%)]">
              <div className="flex items-center justify-between border-b border-[#302a20] bg-[#12100c] px-5 py-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/agents/kong.jpg"
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-xl border border-[#ff7250]/25 object-cover"
                  />
                  <div>
                    <p className="text-sm font-extrabold">Kong · verdict</p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#6f685f]">
                      gate-1.0.0 · standard
                    </p>
                  </div>
                </div>
                <span className="rotate-[-3deg] rounded-md border-2 border-[#9ab7ff] px-3 py-1 font-mono text-xs font-black tracking-[0.12em] text-[#9ab7ff]">
                  WAIT
                </span>
              </div>
              <div className="grid md:grid-cols-[1fr_0.8fr]">
                <div className="border-b border-[#302a20] p-5 md:border-b-0 md:border-r">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#ff7250]">
                    Checklist
                  </p>
                  <div className="mt-4 space-y-2">
                    <ReceiptCheck state="pass" label="Creation transaction" value="linked" />
                    <ReceiptCheck state="pass" label="Mayhem mode" value="off" />
                    <ReceiptCheck state="wait" label="Mint authority" value="reading" />
                    <ReceiptCheck state="wait" label="Top holders" value="reading" />
                    <ReceiptCheck state="wait" label="Trade tape" value="1 seen" />
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
                    Receipt chain
                  </p>
                  <div className="mt-4 space-y-4">
                    <HashBlock label="Facts" value="90d8b55a…4f7e" />
                    <HashBlock label="Receipt" value="47e9a19d…c4b0" hot />
                    <HashBlock label="Previous" value="8b210cb2…06fa" />
                  </div>
                  <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#c7ff45]/20 bg-[#c7ff45]/6 p-2.5 text-[9px] text-[#c7ff45]">
                    <ShieldCheck className="size-3.5" />
                    Local chain verified
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <div className="overflow-hidden rounded-[1.7rem] border border-[#3a3328] bg-[#0d0b09] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ab7ff]">
                    Cornelius · wallet policy
                  </p>
                  <h3 className="mt-1 text-xl font-extrabold">
                    Limits before speed.
                  </h3>
                </div>
                <span className="rounded-full border border-[#c7ff45]/25 bg-[#c7ff45]/7 px-2.5 py-1 font-mono text-[8px] font-bold text-[#c7ff45]">
                  MANUAL DEFAULT
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <WalletNode
                  icon={<WalletCards className="size-5" />}
                  title="Main wallet"
                  note="You approve every send"
                  active
                />
                <ArrowRight className="mx-auto size-4 rotate-90 text-[#554f47] sm:rotate-0" />
                <WalletNode
                  icon={<LockKeyhole className="size-5" />}
                  title="Privy Vault"
                  note="Scaffold only · disabled"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[9px]">
                <LimitChip>Per-trade cap</LimitChip>
                <LimitChip>Daily spend cap</LimitChip>
                <LimitChip>Allowed programs</LimitChip>
                <LimitChip>Withdraw home only</LimitChip>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#302a20] pt-4">
                <div>
                  <p className="text-xs font-bold">Apegate execution fee</p>
                  <p className="mt-0.5 text-[9px] text-[#6f685f]">
                    Itemized before any future signature
                  </p>
                </div>
                <span className="text-2xl font-extrabold tracking-[-0.04em] text-[#ff7250]">
                  0.5%
                </span>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ab7ff]">
                The wallet is the hard stop
              </p>
              <h2 className="mt-3 text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
                Your limits.
                <br />
                <span className="text-stroke">Your signature.</span>
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#91897e]">
                Wallet connect is available now for the manual path, but no
                transaction builder is enabled in this read-only release.
                Privy Vault support is prepared as a clearly disabled scaffold
                until policy signing, keys, and safety canaries are ready.
              </p>
              <div className="mt-6 rounded-xl border border-[#302a20] bg-[#12100c] p-4 text-xs leading-relaxed text-[#a79f92]">
                <strong className="text-[#f4efe5]">Worst case today:</strong>{" "}
                Apegate can read a public wallet address after you connect. It
                cannot build, sign, or send a transaction.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="crew" className="border-y border-[#302a20] bg-[#0d0b09] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                Six apes · one gate
              </p>
              <h2 className="mt-3 text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
                Staffed for the call.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#91897e]">
              The Gate is the product. The crew makes ownership visible—who can
              check, prepare, explain, measure, or stop.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {CREW.map((ape, index) => {
              const Icon = ape.icon;
              return (
                <article
                  key={ape.name}
                  className={`ape-card group overflow-hidden rounded-2xl border border-[#302a20] transition-all hover:-translate-y-1 hover:border-[#4b4134] agent-float-delay-${index % 4}`}
                >
                  <div className="grid grid-cols-[112px_1fr] sm:grid-cols-[132px_1fr]">
                    <div className="relative min-h-48 overflow-hidden bg-[#090806]">
                      {ape.image ? (
                        <Image
                          src={ape.image}
                          alt={`${ape.name}, Apegate ${ape.role}`}
                          fill
                          sizes="150px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            background: `radial-gradient(circle at 50% 38%, ${ape.color}33, transparent 38%), #090806`,
                          }}
                        >
                          <Icon className="size-10" style={{ color: ape.color }} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#12100c] to-transparent" />
                    </div>
                    <div className="flex min-w-0 flex-col p-4">
                      <p
                        className="font-mono text-[8px] font-bold uppercase tracking-[0.16em]"
                        style={{ color: ape.color }}
                      >
                        {ape.role}
                      </p>
                      <h3 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">
                        {ape.name}
                      </h3>
                      <p className="mt-3 text-[10px] leading-relaxed text-[#91897e]">
                        {ape.job}
                      </p>
                      <div className="mt-auto space-y-1.5 pt-4 font-mono text-[7px] uppercase tracking-wider">
                        <p className="flex items-center gap-1.5 text-[#c7ff45]">
                          <Check className="size-2.5" /> {ape.can}
                        </p>
                        <p className="flex items-center gap-1.5 text-[#6f685f]">
                          <CircleOff className="size-2.5" /> {ape.cannot}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.9rem] border border-[#3a3328] bg-[#12100c]">
          <div className="grid lg:grid-cols-[1fr_0.62fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
                The gate is open
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] sm:text-6xl">
                See the launch.
                <br />
                See the reason.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#91897e]">
                Open Apegate without a wallet. Watch fresh launches arrive,
                inspect Kong&apos;s evidence, and leave with a receipt—not a
                mystery score.
              </p>
              <Link
                href="/feed"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-[#c7ff45] px-5 py-3.5 text-sm font-extrabold text-[#090806] transition-transform hover:-translate-y-0.5"
              >
                Ape through the gate
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="relative flex min-h-72 items-center justify-center border-t border-[#302a20] bg-[#090806] p-8 lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(255_79_31_/_18%),transparent_60%)]" />
              <Image
                src="/apegate-logo.jpg"
                alt="Apegate ape mark"
                width={280}
                height={280}
                className="relative w-52 rounded-3xl border border-[#ff4f1f]/25 object-cover shadow-[0_28px_80px_rgb(255_79_31_/_12%)] sm:w-64"
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
            <span className="font-bold text-[#a79f92]">
              APEGATE · apegate.io
            </span>
          </div>
          <p>
            Read-only intelligence · Trading disabled · Not financial advice
          </p>
        </footer>
      </section>
    </>
  );
}

function UtilityCard({
  icon,
  eyebrow,
  title,
  body,
  source,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  source: string;
}) {
  return (
    <article className="ape-card rounded-2xl border border-[#302a20] p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-10 items-center justify-center rounded-xl border border-[#ff7250]/25 bg-[#ff4f1f]/8 text-[#ff7250]">
          {icon}
        </span>
        <span className="rounded border border-[#ff7250]/20 px-1.5 py-0.5 font-mono text-[7px] font-bold tracking-wider text-[#ff8a64]">
          {source}
        </span>
      </div>
      <p className="mt-5 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#6f685f]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-extrabold tracking-[-0.04em]">{title}</h3>
      <p className="mt-3 text-xs leading-relaxed text-[#91897e]">{body}</p>
    </article>
  );
}

function ProofLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#c7ff45]/10 text-[#c7ff45]">
        <Check className="size-3" />
      </span>
      <p className="text-sm leading-relaxed text-[#b6aea1]">{children}</p>
    </div>
  );
}

function ReceiptCheck({
  state,
  label,
  value,
}: {
  state: "pass" | "wait";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#272119] px-3 py-2.5">
      <span className="flex items-center gap-2 text-[10px]">
        <span
          className={`size-1.5 rounded-full ${
            state === "pass"
              ? "bg-[#c7ff45]"
              : "animate-pulse bg-[#9ab7ff]"
          }`}
        />
        {label}
      </span>
      <span className="font-mono text-[8px] uppercase text-[#6f685f]">
        {value}
      </span>
    </div>
  );
}

function HashBlock({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[7px] uppercase tracking-wider text-[#4f4941]">
        {label}
      </p>
      <p
        className={`mt-1 truncate font-mono text-[10px] ${
          hot ? "text-[#c7ff45]" : "text-[#91897e]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function WalletNode({
  icon,
  title,
  note,
  active,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        active
          ? "border-[#c7ff45]/30 bg-[#c7ff45]/6"
          : "border-[#31291f] bg-[#090806]"
      }`}
    >
      <span className={active ? "text-[#c7ff45]" : "text-[#9ab7ff]"}>
        {icon}
      </span>
      <p className="mt-4 text-xs font-bold">{title}</p>
      <p className="mt-1 text-[9px] text-[#6f685f]">{note}</p>
    </div>
  );
}

function LimitChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg border border-[#272119] bg-[#090806] px-2.5 py-2 text-[#91897e]">
      <Ban className="size-2.5 text-[#9ab7ff]" />
      {children}
    </span>
  );
}
