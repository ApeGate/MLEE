"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Check,
  CircleDot,
  Copy,
  ExternalLink,
  Fingerprint,
  LockKeyhole,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  estimateFees,
  evaluateGate,
  type GateVerdict,
  type Profile,
  type Receipt,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";
import { useLaunchFeed, type FeedLaunch } from "@/lib/use-launch-feed";
import { useReceipts } from "@/lib/use-receipts";

type RiskPayload = {
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  devPct: number | null;
  top10Pct: number | null;
  rugScore: number | null;
  rugRisks: Array<{
    name: string;
    value?: string;
    description: string;
    level: "warn" | "danger";
  }>;
  sources: {
    mintSafety: string | null;
    concentration: string | null;
  };
};

type BrowserWallet = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
};

const FILTERS = ["ALL", "PASS", "WARN", "BLOCK", "WAIT"] as const;
const PROFILES: Profile[] = ["strict", "standard", "loose"];
const FEE_PREVIEW = estimateFees(0.25, 125, 0.000_01);
const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;

export function FeedApp() {
  const { launches, status, lastMessageAt, retry, updateLaunch } =
    useLaunchFeed();
  const { receipts, verified, addVerdict, addWalletConnect, clear } =
    useReceipts();
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<Profile>("standard");
  const [riskState, setRiskState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);

  const selected =
    launches.find((launch) => launch.facts.mint === selectedMint) ??
    launches[0] ??
    null;

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return launches.filter((launch) => {
      const matchesVerdict =
        filter === "ALL" || launch.verdict.kind === filter;
      const matchesQuery =
        !normalized ||
        launch.facts.symbol.toLowerCase().includes(normalized) ||
        launch.facts.name.toLowerCase().includes(normalized) ||
        launch.facts.mint.toLowerCase().includes(normalized);
      return matchesVerdict && matchesQuery;
    });
  }, [filter, launches, query]);

  const enrich = useCallback(
    async (launch: FeedLaunch, nextProfile: Profile = profile) => {
      setRiskState("loading");
      try {
        const curve = launch.facts.bondingCurve
          ? `?curve=${encodeURIComponent(launch.facts.bondingCurve)}`
          : "";
        const response = await fetch(
          `/api/risk/${launch.facts.mint}${curve}`,
        );
        if (!response.ok) throw new Error("Risk sources unavailable");
        const risk = (await response.json()) as RiskPayload;
        const facts = {
          ...launch.facts,
          observedAt: Date.now(),
          mintAuthority: risk.mintAuthority,
          freezeAuthority: risk.freezeAuthority,
          devPct: risk.devPct,
          top10Pct: risk.top10Pct,
          rugScore: risk.rugScore,
          rugRisks: risk.rugRisks,
        };
        const verdict = await evaluateGate(facts, nextProfile, Date.now(), {
          officialApegateMint: OFFICIAL_APEGATE_MINT,
        });
        updateLaunch(facts.mint, (current) => ({
          ...current,
          facts,
          verdict,
        }));
        await addVerdict(facts, verdict, launch.source);
        setRiskState("ready");
      } catch {
        await addVerdict(launch.facts, launch.verdict, launch.source);
        setRiskState("error");
      }
    },
    [addVerdict, profile, updateLaunch],
  );

  async function selectLaunch(launch: FeedLaunch) {
    setSelectedMint(launch.facts.mint);
    if (
      launch.facts.mintAuthority === undefined ||
      launch.verdict.profile !== profile
    ) {
      await enrich(launch);
    }
  }

  async function changeProfile(next: Profile) {
    setProfile(next);
    if (!selected) return;
    if (selected.facts.mintAuthority === undefined) {
      await enrich(selected, next);
      return;
    }
    const verdict = await evaluateGate(selected.facts, next, Date.now(), {
      officialApegateMint: OFFICIAL_APEGATE_MINT,
    });
    updateLaunch(selected.facts.mint, (current) => ({
      ...current,
      verdict,
    }));
    await addVerdict(selected.facts, verdict, selected.source);
  }

  async function connectWallet() {
    setWalletError(null);
    const wallet = (window as unknown as { solana?: BrowserWallet }).solana;
    if (!wallet) {
      setWalletError(
        "No compatible Solana wallet was found. Install one, then retry. Apegate never asks for your seed phrase.",
      );
      return;
    }
    try {
      const result = await wallet.connect();
      const address = result.publicKey.toString();
      setWalletAddress(address);
      await addWalletConnect(address);
    } catch {
      setWalletError("You declined in your wallet. Nothing was sent.");
    }
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopyState(key);
    window.setTimeout(() => setCopyState(null), 1_500);
  }

  const statusCopy =
    status === "live"
      ? "Live launch stream connected"
      : status === "connecting"
        ? "Opening live launch stream"
        : "Recorded launch tape fallback";

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/88 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
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
              <span className="hidden text-sm font-extrabold tracking-[-0.04em] sm:block">
                APEGATE
              </span>
            </Link>
            <span className="h-5 w-px bg-[#31291f]" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">Kong&apos;s Gate</p>
              <p className="truncate font-mono text-[8px] uppercase tracking-[0.15em] text-[#766f65]">
                Read-only intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge source={status === "live" ? "LIVE" : "REPLAY"} />
            <Link
              href="/paper"
              className="hidden h-9 items-center rounded-full border border-[#c7ff45]/25 bg-[#c7ff45]/6 px-3 text-xs font-bold text-[#c7ff45] hover:border-[#c7ff45]/50 sm:inline-flex"
            >
              Paper desk
            </Link>
            <button
              type="button"
              onClick={() => setWalletOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-[#3a3328] bg-[#12100c] px-3 text-xs font-bold hover:border-ape-cornelius/60"
            >
              <WalletCards className="size-3.5 text-ape-cornelius" />
              <span className="hidden sm:inline">
                {walletAddress ? short(walletAddress) : "Connect wallet"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[#31291f] bg-[#0d0b09]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] text-[#91897e]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "live"
                  ? "live-dot bg-pass text-pass"
                  : status === "connecting"
                    ? "animate-pulse bg-wait"
                    : "bg-block",
              )}
            />
            <span>{statusCopy}</span>
            {lastMessageAt ? (
              <span className="hidden text-[#5f584f] sm:inline">
                · last event {formatClock(lastMessageAt)}
              </span>
            ) : null}
          </div>
          {status !== "live" ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-signal hover:text-[#ff9b7d]"
            >
              <RefreshCw className="size-3" /> Retry live
            </button>
          ) : (
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-[#5f584f]">
              Real launches · no trading
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric
            label="Launches on desk"
            value={String(launches.length)}
            note="Live plus fallback tape"
            source={status === "live" ? "LIVE" : "REPLAY"}
            icon={<Radio className="size-4" />}
          />
          <Metric
            label="Kong blocked"
            value={String(
              launches.filter((item) => item.verdict.kind === "BLOCK").length,
            )}
            note="gate-1.1.0 decisions"
            source={status === "live" ? "LIVE" : "REPLAY"}
            icon={<ShieldCheck className="size-4" />}
          />
          <Metric
            label="Receipt chain"
            value={verified ? "Verified" : "Broken"}
            note={`${receipts.length} local decisions`}
            source="LOCAL"
            icon={<Fingerprint className="size-4" />}
          />
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(430px,1.05fr)]">
          <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
            <div className="border-b border-[#31291f] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ape-cheeta">
                    Cheeta · Fresh lane
                  </p>
                  <h1 className="mt-1 text-xl font-extrabold tracking-[-0.035em]">
                    New launches at the gate
                  </h1>
                </div>
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#6f685f]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ticker, name, or mint"
                    className="h-9 w-full rounded-lg border border-[#31291f] bg-[#090806] pl-9 pr-3 text-xs placeholder:text-[#554f47] focus:border-signal"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-1 overflow-x-auto">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 font-mono text-[9px] font-bold",
                      filter === item
                        ? "bg-[#f4efe5] text-[#090806]"
                        : "text-[#766f65] hover:bg-[#19150f] hover:text-[#ded7cb]",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden grid-cols-[1.25fr_0.65fr_0.65fr_0.72fr_auto] gap-3 border-b border-[#31291f] px-4 py-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[#5f584f] sm:grid">
              <span>Coin</span>
              <span>Market cap</span>
              <span>Trades seen</span>
              <span>Creator buy</span>
              <span>Gate</span>
            </div>
            <div className="max-h-[660px] overflow-y-auto">
              {visible.length ? (
                visible.map((launch) => (
                  <LaunchRow
                    key={`${launch.source}-${launch.facts.mint}`}
                    launch={launch}
                    active={selected?.facts.mint === launch.facts.mint}
                    onClick={() => void selectLaunch(launch)}
                  />
                ))
              ) : (
                <div className="px-5 py-16 text-center">
                  <p className="text-sm font-bold">
                    Nothing in this lane matches.
                  </p>
                  <p className="mt-1 text-xs text-[#766f65]">
                    Loosen a filter, or wait — Cheeta never sleeps.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
            {selected ? (
              <CoinPanel
                launch={selected}
                profile={profile}
                riskState={riskState}
                onProfile={(next) => void changeProfile(next)}
                onRefresh={() => void enrich(selected)}
                onCopy={copy}
                copied={copyState}
                walletAddress={walletAddress}
                onWallet={() => setWalletOpen(true)}
              />
            ) : (
              <div className="flex min-h-[560px] items-center justify-center p-8 text-center">
                <div>
                  <Activity className="mx-auto size-6 text-ape-cheeta" />
                  <p className="mt-3 text-sm font-bold">
                    Cheeta&apos;s waking up the firehose…
                  </p>
                  <p className="mt-1 text-xs text-[#766f65]">
                    A recorded launch tape appears if the live stream cannot.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <ReceiptTape receipts={receipts} verified={verified} onClear={clear} />
      </main>

      {walletOpen ? (
        <WalletPanel
          address={walletAddress}
          error={walletError}
          onClose={() => setWalletOpen(false)}
          onConnect={() => void connectWallet()}
        />
      ) : null}
    </div>
  );
}

function LaunchRow({
  launch,
  active,
  onClick,
}: {
  launch: FeedLaunch;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[1fr_auto] gap-3 border-b border-[#272119] px-4 py-3 text-left transition-colors last:border-0 sm:grid-cols-[1.25fr_0.65fr_0.65fr_0.72fr_auto] sm:items-center",
        active ? "bg-[#ff4f1f]/7" : "hover:bg-[#15120e]",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <TokenMark symbol={launch.facts.symbol} mayhem={launch.facts.isMayhem} />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-sm font-extrabold">
              ${launch.facts.symbol}
            </p>
            <SourceBadge source={launch.source.toUpperCase()} compact />
          </div>
          <p className="truncate text-[10px] text-[#766f65]">
            {launch.facts.name}
          </p>
        </div>
      </div>
      <VerdictStamp verdict={launch.verdict} compact />
      <Cell
        value={`${launch.facts.marketCapSol.toFixed(1)} SOL`}
        label="Market cap"
      />
      <Cell
        value={String(launch.facts.tradeCount ?? 1)}
        label="Trades seen"
      />
      <Cell
        value={`${launch.facts.initialBuySol.toFixed(2)} SOL`}
        label="Creator buy"
      />
      <div className="hidden sm:block">
        <VerdictStamp verdict={launch.verdict} compact />
      </div>
    </button>
  );
}

function CoinPanel({
  launch,
  profile,
  riskState,
  onProfile,
  onRefresh,
  onCopy,
  copied,
  walletAddress,
  onWallet,
}: {
  launch: FeedLaunch;
  profile: Profile;
  riskState: "idle" | "loading" | "ready" | "error";
  onProfile: (profile: Profile) => void;
  onRefresh: () => void;
  onCopy: (value: string, key: string) => void;
  copied: string | null;
  walletAddress: string | null;
  onWallet: () => void;
}) {
  const { facts, verdict, source } = launch;
  return (
    <div>
      <div className="border-b border-[#31291f] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <TokenMark symbol={facts.symbol} mayhem={facts.isMayhem} large />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-[-0.045em]">
                  ${facts.symbol}
                </h2>
                <SourceBadge source={source.toUpperCase()} />
                {facts.isMayhem ? (
                  <span className="rounded border border-warn/25 bg-warn/8 px-1.5 py-0.5 font-mono text-[8px] font-bold text-warn">
                    MAYHEM
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-[#91897e]">{facts.name}</p>
            </div>
          </div>
          <VerdictStamp verdict={verdict} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 truncate font-mono text-[9px] text-[#766f65]">
            {facts.mint}
          </code>
          <button
            type="button"
            onClick={() => onCopy(facts.mint, "mint")}
            className="shrink-0 text-[#766f65] hover:text-[#f4efe5]"
            aria-label="Copy mint"
          >
            {copied === "mint" ? (
              <Check className="size-3" />
            ) : (
              <Copy className="size-3" />
            )}
          </button>
          <a
            href={`https://solscan.io/token/${facts.mint}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[#766f65] hover:text-[#f4efe5]"
            aria-label="Open mint evidence"
          >
            <ExternalLink className="size-3" />
          </a>
          <Link
            href={`/coin/${facts.mint}${
              facts.bondingCurve
                ? `?curve=${encodeURIComponent(facts.bondingCurve)}`
                : ""
            }`}
            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-[#31291f] px-2.5 py-1.5 text-[9px] font-bold text-[#91897e] hover:border-[#ff7250]/40 hover:text-[#f4efe5]"
          >
            Public dossier <ExternalLink className="size-2.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-[#31291f]">
        <DetailMetric
          label="Market cap"
          value={`${facts.marketCapSol.toFixed(2)} SOL`}
          source={source.toUpperCase()}
        />
        <DetailMetric
          label="Trades seen"
          value={String(facts.tradeCount ?? 1)}
          source={source.toUpperCase()}
        />
        <DetailMetric
          label="Creator buy"
          value={`${facts.initialBuySol.toFixed(3)} SOL`}
          source={source.toUpperCase()}
        />
      </div>

      <div className="border-b border-[#31291f] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Kong&apos;s checklist</p>
            <p className="mt-0.5 text-[10px] text-[#766f65]">
              Facts → checks → verdict → receipt
            </p>
          </div>
          <div className="flex items-center gap-1">
            {PROFILES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onProfile(item)}
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-[8px] font-bold uppercase",
                  profile === item
                    ? "bg-[#f4efe5] text-[#090806]"
                    : "text-[#6f685f] hover:text-[#ded7cb]",
                )}
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={onRefresh}
              className="ml-1 rounded-md p-1.5 text-[#6f685f] hover:bg-[#19150f] hover:text-signal"
              aria-label="Refresh risk checks"
            >
              <RefreshCw
                className={cn(
                  "size-3",
                  riskState === "loading" && "animate-spin",
                )}
              />
            </button>
          </div>
        </div>

        {riskState === "error" ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warn/25 bg-warn/8 p-3 text-[10px] leading-relaxed text-warn">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            Live risk sources timed out. Kong kept the on-chain creation facts
            and will not turn missing data into a PASS.
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          {verdict.checks.map((check) => (
            <div
              key={check.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-[#272119] bg-[#090806]/55 p-3"
            >
              <CheckIcon outcome={check.outcome} />
              <div className="min-w-0">
                <p className="text-xs font-bold">{check.label}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[#766f65]">
                  {check.reason}
                </p>
                {check.threshold ? (
                  <p className="mt-1 font-mono text-[8px] uppercase text-[#4f4941]">
                    Line · {check.threshold}
                  </p>
                ) : null}
              </div>
              <span className="font-mono text-[9px] font-bold text-[#b6aea1]">
                {check.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="border-b border-[#31291f] p-4 sm:p-5 md:border-b-0 md:border-r">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ape-caesar">
            Caesar · manual sign
          </p>
          <h3 className="mt-1 text-sm font-bold">0.25 SOL preview</h3>
          <div className="mt-3 space-y-1.5 text-[10px]">
            <FeeRow label="Pump fee estimate" value="0.003125 SOL" />
            <FeeRow label="Apegate · 0.5%" value={`${FEE_PREVIEW.apegateFee.toFixed(6)} SOL`} />
            <FeeRow label="Network estimate" value="0.000010 SOL" />
          </div>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg border border-[#31291f] bg-[#17130e] px-3 py-2.5 text-xs font-extrabold text-[#5f584f]"
          >
            Trading locked · Phase 1 read-only
          </button>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ape-cornelius">
            Cornelius · limits
          </p>
          <h3 className="mt-1 text-sm font-bold">
            {walletAddress ? "Wallet connected" : "Your wallet keeps custody"}
          </h3>
          <p className="mt-2 text-[10px] leading-relaxed text-[#766f65]">
            Manual signing is the default. Apegate cannot send a transaction or
            move funds in this read-only release.
          </p>
          <button
            type="button"
            onClick={onWallet}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#3a3328] px-3 py-2.5 text-xs font-bold hover:border-ape-cornelius/50"
          >
            <WalletCards className="size-3.5 text-ape-cornelius" />
            {walletAddress ? short(walletAddress) : "Connect for manual signing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WalletPanel({
  address,
  error,
  onClose,
  onConnect,
}: {
  address: string | null;
  error: string | null;
  onClose: () => void;
  onConnect: () => void;
}) {
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        aria-label="Close wallet panel"
        onClick={onClose}
        className="absolute inset-0"
      />
      <section className="relative w-full max-w-lg rounded-t-3xl border border-[#3a3328] bg-[#0d0b09] p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ape-cornelius">
              Wallet control
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em]">
              Your keys stay yours.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#31291f] p-2 text-[#766f65] hover:text-[#f4efe5]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-ape-cornelius/30 bg-ape-cornelius/7 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-ape-cornelius text-[#090806]">
              <WalletCards className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Manual signing · default</p>
              <p className="text-[10px] text-[#91897e]">
                Every future transaction requires your wallet.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnect}
            className="mt-4 w-full rounded-xl bg-[#f4efe5] px-4 py-3 text-sm font-extrabold text-[#090806] hover:bg-white"
          >
            {address ? `Connected · ${short(address)}` : "Connect Solana wallet"}
          </button>
          {error ? (
            <p className="mt-3 text-[10px] leading-relaxed text-block">
              {error}
            </p>
          ) : null}
          <p className="mt-3 text-[9px] leading-relaxed text-[#6f685f]">
            Connect only. No message or transaction is signed. Never enter a
            seed phrase into Apegate.
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-[#31291f] bg-[#090806] p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-ape-cornelius/25 bg-ape-cornelius/8 text-ape-cornelius">
              <LockKeyhole className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold">Privy Vault</p>
                <SourceBadge source="SCAFFOLD" />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[#766f65]">
                Opt-in automation is not active. The planned Vault is a separate
                policy wallet with per-trade caps, daily limits, allowlisted
                programs, and withdrawals only to your main wallet.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-[#272119] px-3 py-2 text-[9px] text-[#6f685f]">
            Privy client config: {privyConfigured ? "detected" : "not set"} ·
            server authorization still required · no Vault can be created
          </div>
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-xl border border-[#31291f] px-4 py-3 text-xs font-bold text-[#554f47]"
          >
            Vault unavailable in read-only release
          </button>
        </div>
      </section>
    </div>
  );
}

function ReceiptTape({
  receipts,
  verified,
  onClear,
}: {
  receipts: Receipt[];
  verified: boolean;
  onClear: () => void;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#31291f] px-4 py-3.5">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-signal">
            Decision receipts · local tape
          </p>
          <p className="mt-1 text-xs text-[#91897e]">
            Canonical JSON · SHA-256 · each receipt links to the previous hash
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase",
              verified ? "text-pass" : "text-block",
            )}
          >
            {verified ? (
              <ShieldCheck className="size-3" />
            ) : (
              <AlertTriangle className="size-3" />
            )}
            {verified ? "Chain verified" : "Chain broken"}
          </span>
          {receipts.length ? (
            <button
              type="button"
              onClick={onClear}
              className="text-[9px] font-bold text-[#6f685f] hover:text-signal"
            >
              Clear local tape
            </button>
          ) : null}
        </div>
      </div>
      {receipts.length ? (
        <div className="grid divide-y divide-[#272119] lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {[...receipts]
            .reverse()
            .slice(0, 3)
            .map((receipt) => (
              <article key={receipt.hash} className="min-w-0 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-signal">
                    {receipt.actor} · {receipt.kind}
                  </span>
                  <SourceBadge source={receipt.source.toUpperCase()} compact />
                </div>
                <p className="mt-2 text-xs font-bold">
                  {receipt.kind === "verdict"
                    ? `${String(receipt.outputs.verdict)} · score ${String(receipt.outputs.score)}`
                    : receipt.kind === "paper_fill"
                      ? `${String(receipt.outputs.side)} $${String(receipt.outputs.symbol)} · PAPER`
                      : receipt.kind === "plan_change"
                        ? `${String(receipt.outputs.name)} · plan saved`
                        : receipt.kind === "vault_preview"
                          ? "Privy policy preview"
                          : "Manual wallet connected"}
                </p>
                <div className="mt-3 space-y-1 font-mono text-[8px] text-[#5f584f]">
                  <p className="truncate">HASH {receipt.hash}</p>
                  <p className="truncate">
                    PREV {receipt.prev ?? "GENESIS"}
                  </p>
                </div>
                <p className="mt-2 text-[9px] text-[#6f685f]">
                  {formatClock(receipt.at.ts)} · stored in this browser only
                </p>
              </article>
            ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center">
          <Fingerprint className="mx-auto size-5 text-[#554f47]" />
          <p className="mt-2 text-xs font-bold">No receipts on this browser yet</p>
          <p className="mt-1 text-[10px] text-[#6f685f]">
            Open a launch and Kong will write the first decision.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  note,
  source,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  source: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#31291f] bg-[linear-gradient(135deg,rgb(255_255_255_/_3%),transparent_45%),#0d0b09] p-4">
      <div className="flex items-start justify-between">
        <span className="text-signal">{icon}</span>
        <SourceBadge source={source} compact />
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-[-0.04em]">{value}</p>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-bold">{label}</p>
        <p className="text-right text-[9px] text-[#5f584f]">{note}</p>
      </div>
    </article>
  );
}

function DetailMetric({
  label,
  value,
  source,
}: {
  label: string;
  value: string;
  source: string;
}) {
  return (
    <div className="border-r border-[#31291f] p-3 last:border-r-0 sm:p-4">
      <p className="truncate text-sm font-bold tabular-nums">{value}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        <p className="text-[8px] text-[#6f685f]">{label}</p>
        <SourceBadge source={source} micro />
      </div>
    </div>
  );
}

function FeeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#6f685f]">{label}</span>
      <span className="font-mono text-[#b6aea1]">{value}</span>
    </div>
  );
}

function Cell({ value, label }: { value: string; label: string }) {
  return (
    <div className="hidden sm:block">
      <p className="font-mono text-[10px] font-semibold">{value}</p>
      <p className="mt-0.5 text-[8px] text-[#554f47]">{label}</p>
    </div>
  );
}

function TokenMark({
  symbol,
  mayhem,
  large,
}: {
  symbol: string;
  mayhem: boolean;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border text-xs font-black",
        large ? "size-12 text-sm" : "size-9",
        mayhem
          ? "border-warn/35 bg-warn/8 text-warn"
          : "border-signal/25 bg-signal/8 text-signal",
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255_/_14%),transparent_45%)]" />
      <span className="relative">{symbol.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function VerdictStamp({
  verdict,
  compact,
}: {
  verdict: GateVerdict;
  compact?: boolean;
}) {
  const colors = {
    PASS: "border-pass/35 bg-pass/8 text-pass",
    WARN: "border-warn/35 bg-warn/8 text-warn",
    BLOCK: "border-block/35 bg-block/8 text-block",
    WAIT: "border-wait/35 bg-wait/8 text-wait",
  };
  return (
    <div
      aria-label={`Kong verdict: ${verdict.kind.toLowerCase()}. ${verdict.topReasons[0] ?? ""}`}
      className={cn(
        "shrink-0 border font-mono font-extrabold tracking-[0.08em]",
        colors[verdict.kind],
        compact
          ? "rounded-md px-2 py-1 text-[8px] sm:hidden"
          : "rounded-lg px-2.5 py-1.5 text-[9px]",
      )}
    >
      {verdict.kind} · {verdict.score}
    </div>
  );
}

function CheckIcon({ outcome }: { outcome: string }) {
  if (outcome === "pass") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-pass/10 text-pass">
        <Check className="size-3" />
      </span>
    );
  }
  if (outcome === "fail") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-block/10 text-block">
        <X className="size-3" />
      </span>
    );
  }
  if (outcome === "warn") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-warn/10 text-warn">
        <AlertTriangle className="size-3" />
      </span>
    );
  }
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-wait/10 text-wait">
      <CircleDot className="size-3" />
    </span>
  );
}

function SourceBadge({
  source,
  compact,
  micro,
}: {
  source: string;
  compact?: boolean;
  micro?: boolean;
}) {
  const live = source === "LIVE";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-[0.1em]",
        live
          ? "border-pass/25 bg-pass/8 text-pass"
          : "border-signal/25 bg-signal/7 text-[#ff8a64]",
        micro
          ? "px-1 py-px text-[6px]"
          : compact
            ? "px-1.5 py-0.5 text-[7px]"
            : "px-2 py-1 text-[8px]",
      )}
    >
      {source}
    </span>
  );
}

function short(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function formatClock(value: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
