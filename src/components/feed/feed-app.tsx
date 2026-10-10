"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Check,
  CircleDot,
  Coins,
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
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets as useSolanaWallets } from "@privy-io/react-auth/solana";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  estimateFees,
  evaluateGate,
  indexSessionLaunches,
  type GateTiming,
  type GateVerdict,
  type Profile,
  type Receipt,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";
import { useLaunchFeed, type FeedLaunch } from "@/lib/use-launch-feed";
import { useOutcomeTape } from "@/lib/use-outcome-tape";
import { useReceipts } from "@/lib/use-receipts";
import { TokenLogo } from "@/components/token/token-logo";
import { inspectManualBuyTransaction } from "@/lib/manual-buy-transaction";
import { inspectManualSellTransaction } from "@/lib/manual-sell-transaction";

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

type MetaPayload = {
  websiteUrl: string | null;
  websiteHost: string | null;
  websiteReachable: boolean | null;
  websiteMentionsToken: boolean | null;
  websiteMatchesX: boolean | null;
  websiteTemplateHash: string | null;
  domainRegisteredAt: string | null;
  domainAgeDays: number | null;
  xLinkType: "profile" | "community" | "post" | "none";
  xHandle: string | null;
  telegramPresent: boolean;
};

type WalletPosition = {
  mint: string;
  rawAmount: string;
  decimals: number;
  uiAmount: string;
  tokenProgram: string;
  name: string | null;
  symbol: string | null;
  image: string | null;
};

type WalletPositionsPayload = {
  source: string;
  positions: WalletPosition[];
  total: number;
  hasMore: boolean;
  observedAt: number;
};

type PublicCanaryFill = {
  signature: string;
  mint: string;
  symbol: string;
  side: "BUY" | "SELL";
  wallet: string;
  slot: number;
  blockTime: number | null;
  solDelta: number;
  tokenDelta: number;
  feeSol: number;
  receiptHash: string | null;
  confirmed: true;
  solscan: string;
};

type PublicCanaryFillsPayload = {
  verified: true;
  source: string;
  wallet: string;
  fills: PublicCanaryFill[];
  checkedAt: number;
};

type ManualSellTarget = {
  mint: string;
  symbol: string;
  factsHash?: string;
};

const FILTERS = ["ALL", "PASS", "WARN", "BLOCK", "WAIT"] as const;
const PROFILES: Profile[] = ["strict", "standard", "loose"];
const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;
const MANUAL_BUY_SLIPPAGE_PCT = 8;
const MANUAL_BUY_PRIORITY_FEE_SOL = 0.0005;
const MANUAL_BUY_MAX_TIP_LAMPORTS = 100_000;

async function waitForManualTradeConfirmation(signature: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(
      `/api/trade/status?signature=${encodeURIComponent(signature)}`,
      { cache: "no-store" },
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        state: "confirmed" | "failed" | "pending" | "unknown";
        slot: number | null;
      };
      if (payload.state === "confirmed" || payload.state === "failed") {
        return payload;
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 1_500));
  }
  return { state: "pending" as const, slot: null };
}

export function FeedApp() {
  const { launches, status, lastMessageAt, retry, updateLaunch } =
    useLaunchFeed();
  const outcomeTape = useOutcomeTape(launches);
  const {
    receipts,
    verified,
    addVerdict,
    addWalletConnect,
    addManualFill,
    clear,
  } = useReceipts();
  const {
    ready: privyReady,
    authenticated,
    login,
    logout,
    error: privyError,
  } = usePrivy();
  const { ready: walletsReady, wallets } = useSolanaWallets();
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<Profile>("standard");
  const [riskState, setRiskState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);
  const [tradeState, setTradeState] = useState<
    "idle" | "preparing" | "signing" | "sent" | "error"
  >("idle");
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);
  const [positionState, setPositionState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [positionData, setPositionData] =
    useState<WalletPositionsPayload | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const recordedWallet = useRef<string | null>(null);
  const activeWallet = wallets[0] ?? null;
  const walletAddress = wallets[0]?.address ?? null;

  useEffect(() => {
    if (!walletAddress || recordedWallet.current === walletAddress) return;
    recordedWallet.current = walletAddress;
    void addWalletConnect(walletAddress);
  }, [addWalletConnect, walletAddress]);

  const refreshPositions = useCallback(async (owner?: string | null) => {
    if (!owner) return;
    setPositionState("loading");
    setPositionError(null);
    try {
      const response = await fetch(
        `/api/wallet/positions?owner=${encodeURIComponent(owner)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as
        | WalletPositionsPayload
        | { error?: string };
      if (!response.ok || !("positions" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Wallet positions are unavailable",
        );
      }
      setPositionData(payload);
      setPositionState("ready");
    } catch (error) {
      setPositionState("error");
      setPositionError(
        error instanceof Error
          ? error.message
          : "Wallet positions are unavailable",
      );
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      if (!walletAddress) {
        setPositionData(null);
        setPositionState("idle");
        setPositionError(null);
        return;
      }
      void refreshPositions(walletAddress);
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshPositions, walletAddress]);

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
        const metadataQuery = `?uri=${encodeURIComponent(launch.facts.uri)}`;
        const [riskResult, metaResult] = await Promise.allSettled([
          fetch(`/api/risk/${launch.facts.mint}${curve}`).then(
            async (response) => {
              if (!response.ok) throw new Error("Risk sources unavailable");
              return (await response.json()) as RiskPayload;
            },
          ),
          fetch(`/api/meta/${launch.facts.mint}${metadataQuery}`).then(
            async (response) => {
              if (!response.ok) throw new Error("Metadata unavailable");
              return (await response.json()) as MetaPayload;
            },
          ),
        ]);
        if (
          riskResult.status === "rejected" &&
          metaResult.status === "rejected"
        ) {
          throw new Error("Launch evidence is unavailable");
        }
        const risk =
          riskResult.status === "fulfilled" ? riskResult.value : null;
        const metadata =
          metaResult.status === "fulfilled" ? metaResult.value : null;
        const rawFacts = {
          ...launch.facts,
          observedAt: Date.now(),
          ...(risk
            ? {
                mintAuthority: risk.mintAuthority,
                freezeAuthority: risk.freezeAuthority,
                devPct: risk.devPct,
                top10Pct: risk.top10Pct,
                rugScore: risk.rugScore,
                rugRisks: risk.rugRisks,
              }
            : {}),
          ...(metadata
            ? {
                websiteUrl: metadata.websiteUrl,
                websiteHost: metadata.websiteHost,
                websiteReachable: metadata.websiteReachable,
                websiteMentionsToken: metadata.websiteMentionsToken,
                websiteMatchesX: metadata.websiteMatchesX,
                websiteTemplateHash: metadata.websiteTemplateHash,
                domainRegisteredAt: metadata.domainRegisteredAt,
                domainAgeDays: metadata.domainAgeDays,
                xLinkType: metadata.xLinkType,
                xHandle: metadata.xHandle,
                telegramPresent: metadata.telegramPresent,
              }
            : {}),
        };
        const sourceFacts = launches
          .filter((item) => item.source === launch.source)
          .map((item) =>
            item.facts.mint === rawFacts.mint ? rawFacts : item.facts,
          );
        const indexed = indexSessionLaunches(
          sourceFacts,
          launch.source === "live"
            ? Date.now()
            : sourceFacts.reduce(
                (latest, item) => Math.max(latest, item.createdAt),
                rawFacts.createdAt,
              ),
        );
        const facts =
          indexed.find((item) => item.mint === rawFacts.mint) ?? rawFacts;
        const verdict = await evaluateGate(facts, nextProfile, Date.now(), {
          officialApegateMint: OFFICIAL_APEGATE_MINT,
        });
        updateLaunch(facts.mint, (current) => ({
          ...current,
          facts,
          verdict,
        }));
        await addVerdict(facts, verdict, launch.source);
        setRiskState(risk ? "ready" : "error");
      } catch {
        await addVerdict(launch.facts, launch.verdict, launch.source);
        setRiskState("error");
      }
    },
    [addVerdict, launches, profile, updateLaunch],
  );

  async function selectLaunch(launch: FeedLaunch) {
    setSelectedMint(launch.facts.mint);
    setTradeState("idle");
    setTradeMessage(null);
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

  function connectWallet() {
    setWalletError(null);
    if (!privyReady) {
      setWalletError("Privy is still loading. Try again in a moment.");
      return;
    }
    login({ loginMethods: ["wallet"], walletChainType: "solana-only" });
  }

  async function disconnectWallet() {
    setWalletError(null);
    recordedWallet.current = null;
    await logout();
  }

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopyState(key);
    window.setTimeout(() => setCopyState(null), 1_500);
  }

  async function executeManualBuy(launch: FeedLaunch, amountSol: number) {
    setTradeMessage(null);
    if (!activeWallet) {
      setWalletOpen(true);
      return;
    }
    if (
      launch.verdict.kind !== "PASS" ||
      !launch.verdict.timing.entryAllowed
    ) {
      setTradeState("error");
      setTradeMessage(
        `Kong and Cheeta have not cleared this entry: ${launch.verdict.kind} · ${launch.verdict.timing.label}.`,
      );
      return;
    }
    if (Date.now() > launch.verdict.freshUntil) {
      setTradeState("preparing");
      await enrich(launch);
      setTradeState("idle");
      setTradeMessage("Gate refreshed. Review the fresh verdict, then sign.");
      return;
    }

    try {
      setTradeState("preparing");
      const response = await fetch("/api/trade/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey: activeWallet.address,
          mint: launch.facts.mint,
          side: "buy",
          amountSol,
          slippagePct: MANUAL_BUY_SLIPPAGE_PCT,
        }),
      });
      const payload = (await response.json()) as
        | {
            transaction: string;
            firewall: {
              decodedSwap: string;
              fundedLamports: number;
              tippedLamports: number;
              priorityFeeLamports: number;
            };
            expiresAt: number;
          }
        | { error?: string };
      if (!response.ok || !("transaction" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "A fresh guarded transaction could not be prepared",
        );
      }
      if (Date.now() > payload.expiresAt) {
        throw new Error("The prepared transaction expired before approval");
      }
      const bytes = Uint8Array.from(
        window.atob(payload.transaction),
        (character) => character.charCodeAt(0),
      );
      const transaction = VersionedTransaction.deserialize(bytes);
      if (transaction.message.recentBlockhash.length === 0) {
        throw new Error("Prepared transaction has no recent blockhash");
      }
      const inspection = inspectManualBuyTransaction(transaction, {
        expectedSigner: activeWallet.address,
        expectedMint: launch.facts.mint,
        amountSol,
        slippagePct: MANUAL_BUY_SLIPPAGE_PCT,
        priorityFeeSol: MANUAL_BUY_PRIORITY_FEE_SOL,
        maxTipLamports: MANUAL_BUY_MAX_TIP_LAMPORTS,
      });
      if (
        inspection.decodedSwap !== payload.firewall.decodedSwap ||
        inspection.fundedLamports !== payload.firewall.fundedLamports ||
        inspection.tippedLamports !== payload.firewall.tippedLamports ||
        inspection.priorityFeeLamports !==
          payload.firewall.priorityFeeLamports
      ) {
        throw new Error("Browser and server firewall summaries do not match");
      }

      setTradeState("signing");
      setTradeMessage(
        `Check ${amountSol.toFixed(2)} SOL, the mint, and fees in your wallet. Nothing sends without your approval.`,
      );
      const result = await activeWallet.signAndSendTransaction({
        transaction: bytes,
        chain: "solana:mainnet",
        options: {
          commitment: "confirmed",
          skipPreflight: false,
          maxRetries: 2,
        },
      });
      const signature = bs58.encode(result.signature);
      setTradeState("sent");
      setTradeMessage(`Submitted · ${signature} · waiting for confirmation`);
      const confirmation = await waitForManualTradeConfirmation(signature);
      if (confirmation.state === "failed") {
        throw new Error(
          `Transaction landed but failed · ${signature}`,
        );
      }
      if (confirmation.state !== "confirmed") {
        setTradeMessage(
          `Submitted · confirmation still pending · ${signature}`,
        );
        return;
      }
      await addManualFill({
        mint: launch.facts.mint,
        symbol: launch.facts.symbol,
        wallet: activeWallet.address,
        side: "BUY",
        amountSol,
        signature,
        factsHash: launch.verdict.factsHash,
        slot: confirmation.slot,
      });
      await refreshPositions(activeWallet.address);
      setTradeState("sent");
      setTradeMessage(`Confirmed · ${signature}`);
    } catch (error) {
      setTradeState("error");
      setTradeMessage(
        error instanceof Error
          ? error.message
          : "The wallet did not send the transaction",
      );
    }
  }

  async function executeManualSell(target: ManualSellTarget, percent: number) {
    setTradeMessage(null);
    if (!activeWallet) {
      setWalletOpen(true);
      return;
    }

    try {
      setTradeState("preparing");
      const response = await fetch("/api/trade/prepare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          publicKey: activeWallet.address,
          mint: target.mint,
          side: "sell",
          percent,
          slippagePct: MANUAL_BUY_SLIPPAGE_PCT,
        }),
      });
      const payload = (await response.json()) as
        | {
            transaction: string;
            firewall: {
              decodedSwap: string;
              soldTokenBaseUnits: string;
              minOutputLamports: string;
              fundedLamports: number;
              tippedLamports: number;
              priorityFeeLamports: number;
            };
            intent: {
              maxSellTokenBaseUnits: string;
              minimumOutputLamports: string;
              maxAccountFundingLamports: number;
            };
            quote: {
              expectedLamports: number;
              minimumOutputLamports: number;
              source: string;
            };
            expiresAt: number;
          }
        | { error?: string };
      if (!response.ok || !("transaction" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "A guarded exit could not be prepared",
        );
      }
      if (Date.now() > payload.expiresAt) {
        throw new Error("The prepared exit expired before approval");
      }
      const bytes = Uint8Array.from(
        window.atob(payload.transaction),
        (character) => character.charCodeAt(0),
      );
      const transaction = VersionedTransaction.deserialize(bytes);
      const inspection = inspectManualSellTransaction(transaction, {
        expectedSigner: activeWallet.address,
        expectedMint: target.mint,
        maxSellTokenBaseUnits: payload.intent.maxSellTokenBaseUnits,
        minimumOutputLamports: payload.intent.minimumOutputLamports,
        maxAccountFundingLamports:
          payload.intent.maxAccountFundingLamports,
        priorityFeeSol: MANUAL_BUY_PRIORITY_FEE_SOL,
        maxTipLamports: MANUAL_BUY_MAX_TIP_LAMPORTS,
      });
      if (
        inspection.decodedSwap !== payload.firewall.decodedSwap ||
        inspection.soldTokenBaseUnits !==
          payload.firewall.soldTokenBaseUnits ||
        inspection.minOutputLamports !==
          payload.firewall.minOutputLamports ||
        inspection.fundedLamports !== payload.firewall.fundedLamports ||
        inspection.tippedLamports !== payload.firewall.tippedLamports ||
        inspection.priorityFeeLamports !==
          payload.firewall.priorityFeeLamports
      ) {
        throw new Error("Browser and server exit summaries do not match");
      }

      setTradeState("signing");
      setTradeMessage(
        `Exit ${percent}% of $${target.symbol}. Independent floor ${(payload.quote.minimumOutputLamports / 1_000_000_000).toFixed(6)} SOL · check the mint in your wallet.`,
      );
      const result = await activeWallet.signAndSendTransaction({
        transaction: bytes,
        chain: "solana:mainnet",
        options: {
          commitment: "confirmed",
          skipPreflight: false,
          maxRetries: 2,
        },
      });
      const signature = bs58.encode(result.signature);
      setTradeState("sent");
      setTradeMessage(`Exit submitted · ${signature} · waiting for confirmation`);
      const confirmation = await waitForManualTradeConfirmation(signature);
      if (confirmation.state === "failed") {
        throw new Error(`Exit landed but failed · ${signature}`);
      }
      if (confirmation.state !== "confirmed") {
        setTradeMessage(
          `Exit submitted · confirmation still pending · ${signature}`,
        );
        return;
      }
      await addManualFill({
        mint: target.mint,
        symbol: target.symbol,
        wallet: activeWallet.address,
        side: "SELL",
        percent,
        signature,
        factsHash: target.factsHash,
        slot: confirmation.slot,
      });
      await refreshPositions(activeWallet.address);
      setTradeState("sent");
      setTradeMessage(`Exit confirmed · ${signature}`);
    } catch (error) {
      setTradeState("error");
      setTradeMessage(
        error instanceof Error
          ? error.message
          : "The wallet did not send the exit",
      );
    }
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
                Gate · manual sign · receipts
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
              Real launches · user-approved signing
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6">
        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            note="gate-1.2.0 decisions"
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
          <Metric
            label="Outcome tape"
            value={String(outcomeTape.entries.length)}
            note={`${outcomeTape.checkpointCount} raw checkpoints`}
            source="LOCAL"
            icon={<Activity className="size-4" />}
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
                tradeState={tradeState}
                tradeMessage={tradeMessage}
                onTrade={(amountSol) => void executeManualBuy(selected, amountSol)}
                onExit={(percent) =>
                  void executeManualSell(
                    {
                      mint: selected.facts.mint,
                      symbol: selected.facts.symbol,
                      factsHash: selected.verdict.factsHash,
                    },
                    percent,
                  )
                }
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

        <LiveFillTape />

        <WalletPositions
          walletAddress={walletAddress}
          state={positionState}
          data={positionData}
          error={positionError}
          tradeState={tradeState}
          tradeMessage={tradeMessage}
          onConnect={() => setWalletOpen(true)}
          onRefresh={() => void refreshPositions(walletAddress)}
          onExit={(position, percent) =>
            void executeManualSell(
              {
                mint: position.mint,
                symbol: position.symbol ?? short(position.mint),
              },
              percent,
            )
          }
        />

        <ReceiptTape receipts={receipts} verified={verified} onClear={clear} />
      </main>

      {walletOpen ? (
        <WalletPanel
          address={walletAddress}
          error={walletError}
          privyError={privyError?.message ?? null}
          privyReady={privyReady}
          authenticated={authenticated}
          walletsReady={walletsReady}
          onClose={() => setWalletOpen(false)}
          onConnect={connectWallet}
          onDisconnect={() => void disconnectWallet()}
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
        <TokenLogo
          mint={launch.facts.mint}
          symbol={launch.facts.symbol}
          uri={launch.facts.uri}
        />
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
          <LaunchSignalChips launch={launch} compact />
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
        <VerdictStamp verdict={launch.verdict} />
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
  tradeState,
  tradeMessage,
  onTrade,
  onExit,
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
  tradeState: "idle" | "preparing" | "signing" | "sent" | "error";
  tradeMessage: string | null;
  onTrade: (amountSol: number) => void;
  onExit: (percent: number) => void;
}) {
  const { facts, verdict, source } = launch;
  const [tradeSize, setTradeSize] = useState(0.02);
  const feePreview = estimateFees(
    tradeSize,
    125,
    MANUAL_BUY_PRIORITY_FEE_SOL,
  );
  const manualRouteSupported =
    facts.pool === "pump-amm" || facts.pool === "pumpswap";
  const tradeCleared =
    manualRouteSupported &&
    verdict.kind === "PASS" &&
    verdict.timing.entryAllowed;
  const tradePending =
    tradeState === "preparing" || tradeState === "signing";
  return (
    <div>
      <div className="border-b border-[#31291f] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <TokenLogo
              mint={facts.mint}
              symbol={facts.symbol}
              uri={facts.uri}
              size="lg"
              eager
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-[-0.045em]">
                  ${facts.symbol}
                </h2>
                <SourceBadge source={source.toUpperCase()} />
                <TimingBadge timing={verdict.timing} />
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
        <LaunchSignalChips launch={launch} />
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

      <div className="border-b border-[#31291f] bg-[linear-gradient(90deg,rgb(255_177_60_/_7%),transparent)] px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-ape-cheeta">
              Cheeta · timing call
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#a79f92]">
              {verdict.timing.reason}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <TimingBadge timing={verdict.timing} />
            {verdict.timing.insidersOut ? (
              <span className="font-mono text-[7px] font-bold text-pass">
                INSIDERS OUT
              </span>
            ) : null}
          </div>
        </div>
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
            Caesar · Privy manual sign
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0.01, 0.02, 0.05].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTradeSize(amount)}
                className={cn(
                  "rounded-lg border px-2 py-2 font-mono text-[8px] font-bold",
                  tradeSize === amount
                    ? "border-[#c7ff45]/40 bg-[#c7ff45]/7 text-[#c7ff45]"
                    : "border-[#31291f] text-[#6f685f]",
                )}
              >
                {amount} SOL
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 text-[10px]">
            <FeeRow
              label="Pump fee estimate"
              value={feePreview.protocolFee.toFixed(6) + " SOL"}
            />
            <FeeRow
              label="Apegate · 0.5%"
              value={`${feePreview.apegateFee.toFixed(6)} SOL · beta waived`}
            />
            <FeeRow label="Priority fee" value="0.000500 SOL" />
          </div>
          <button
            type="button"
            disabled={tradePending || !tradeCleared}
            onClick={() =>
              walletAddress ? onTrade(tradeSize) : onWallet()
            }
            className="mt-4 w-full rounded-lg border border-[#c7ff45]/25 bg-[#c7ff45]/7 px-3 py-2.5 text-xs font-extrabold text-[#c7ff45] enabled:hover:border-[#c7ff45]/55 disabled:cursor-not-allowed disabled:border-[#31291f] disabled:bg-[#17130e] disabled:text-[#5f584f]"
          >
            {tradeState === "preparing"
              ? "Building guarded transaction…"
              : tradeState === "signing"
                ? "Approve in your wallet…"
                : !tradeCleared
                  ? !manualRouteSupported
                    ? "Curve signing locked · use PAPER"
                    : `${verdict.kind} · ${verdict.timing.label}`
                  : walletAddress
                    ? `Review & sign ${tradeSize} SOL`
                    : "Connect wallet to sign"}
          </button>
          {tradeMessage ? (
            <p
              className={cn(
                "mt-2 break-all text-[8px] leading-relaxed",
                tradeState === "error" ? "text-block" : "text-[#8da966]",
              )}
            >
              {tradeMessage}
            </p>
          ) : null}
          <p className="mt-2 text-[7px] leading-relaxed text-[#4f4941]">
            Fresh PASS + entry timing required. PumpSwap bytes are decoded in
            the server and browser before Privy opens your wallet.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ape-cornelius">
            Cornelius · limits
          </p>
          <h3 className="mt-1 text-sm font-bold">
            {walletAddress ? "Wallet connected" : "Your wallet keeps custody"}
          </h3>
          <p className="mt-2 text-[10px] leading-relaxed text-[#766f65]">
            Manual signing is the default. PumpSwap signing is bounded and
            decoded; bonding-curve signing stays locked until its v3 decoder
            passes canaries.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[50, 100].map((percent) => (
              <button
                key={percent}
                type="button"
                disabled={tradePending}
                onClick={() =>
                  walletAddress ? onExit(percent) : onWallet()
                }
                className="rounded-lg border border-block/25 bg-block/6 px-2 py-2.5 text-[10px] font-extrabold text-[#ff8f7b] enabled:hover:border-block/55 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {percent === 100 ? "Exit 100%" : "Sell 50%"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[7px] leading-relaxed text-[#4f4941]">
            Exits never require a PASS. PumpSwap bytes are decoded before your
            wallet opens; a missing position fails closed.
          </p>
          <button
            type="button"
            onClick={onWallet}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#3a3328] px-3 py-2.5 text-xs font-bold hover:border-ape-cornelius/50"
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
  privyError,
  privyReady,
  authenticated,
  walletsReady,
  onClose,
  onConnect,
  onDisconnect,
}: {
  address: string | null;
  error: string | null;
  privyError: string | null;
  privyReady: boolean;
  authenticated: boolean;
  walletsReady: boolean;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
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
                Every transaction requires your wallet&apos;s approval.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={!privyReady || Boolean(address)}
            className="mt-4 w-full rounded-xl bg-[#f4efe5] px-4 py-3 text-sm font-extrabold text-[#090806] hover:bg-white disabled:cursor-default disabled:opacity-70"
          >
            {!privyReady
              ? "Loading secure wallet login"
              : address
                ? `Connected · ${short(address)}`
                : "Connect Solana wallet"}
          </button>
          {address ? (
            <button
              type="button"
              onClick={onDisconnect}
              className="mt-2 w-full px-4 py-2 text-[10px] font-bold text-[#766f65] hover:text-[#f4efe5]"
            >
              Disconnect this session
            </button>
          ) : null}
          {error || privyError ? (
            <p className="mt-3 text-[10px] leading-relaxed text-block">
              {error ?? "Privy could not initialize. Check the allowed domains."}
            </p>
          ) : null}
          <p className="mt-3 text-[9px] leading-relaxed text-[#6f685f]">
            Privy authenticates the external Solana wallet and opens its signing
            prompt only after the Gate, timing, fee-payer, and program checks.
            Never enter a seed phrase into Apegate.
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
            Privy client: {privyReady ? "ready" : "loading"} · Solana wallets:{" "}
            {walletsReady ? "ready" : "loading"} · session:{" "}
            {authenticated ? "authenticated" : "signed out"} · Vault
            authorization remains locked
          </div>
          <button
            type="button"
            disabled
            className="mt-3 w-full cursor-not-allowed rounded-xl border border-[#31291f] px-4 py-3 text-xs font-bold text-[#554f47]"
          >
            Vault unavailable · manual signing only
          </button>
        </div>
      </section>
    </div>
  );
}

function LiveFillTape() {
  const [state, setState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [data, setData] = useState<PublicCanaryFillsPayload | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const response = await fetch("/api/live-fills", { cache: "no-store" });
      const payload = (await response.json()) as
        | PublicCanaryFillsPayload
        | { verified?: false; error?: string };
      if (!response.ok || payload.verified !== true || !("fills" in payload)) {
        throw new Error("Live verification unavailable");
      }
      setData(payload);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#31291f] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl border border-pass/25 bg-pass/8 text-pass">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-pass">
              Mainnet fill receipts
            </p>
            <p className="mt-1 text-xs text-[#91897e]">
              Operator canaries · wallet and balance deltas verified from chain
            </p>
          </div>
        </div>
        {data ? (
          <div className="flex items-center gap-2">
            <SourceBadge source={data.source} compact />
            <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase text-pass">
              <Check className="size-3" /> {data.fills.length} confirmed
            </span>
          </div>
        ) : null}
      </div>

      {state === "loading" && !data ? (
        <div className="grid gap-px bg-[#272119] md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse bg-[#0d0b09] p-4">
              <span className="block h-3 w-24 rounded bg-[#211b14]" />
              <span className="mt-3 block h-2 w-full rounded bg-[#17130e]" />
              <span className="mt-2 block h-2 w-2/3 rounded bg-[#17130e]" />
            </div>
          ))}
        </div>
      ) : state === "error" && !data ? (
        <div className="px-5 py-8 text-center">
          <AlertTriangle className="mx-auto size-5 text-warn" />
          <p className="mt-2 text-xs font-bold">Chain verification timed out</p>
          <p className="mt-1 text-[10px] text-[#6f685f]">
            No fill is labeled confirmed while the RPC evidence is unavailable.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-[10px] font-bold text-signal hover:text-[#ff9b7d]"
          >
            Retry chain read
          </button>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-px bg-[#272119] md:grid-cols-3">
            {data.fills.map((fill) => (
              <article key={fill.signature} className="min-w-0 bg-[#0d0b09] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[8px] font-black tracking-[0.12em]",
                      fill.side === "BUY"
                        ? "border-pass/25 bg-pass/8 text-pass"
                        : "border-block/25 bg-block/8 text-[#ff8f7b]",
                    )}
                  >
                    {fill.side}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-[8px] font-bold uppercase text-pass">
                    <Check className="size-3" /> Confirmed
                  </span>
                </div>
                <p className="mt-3 text-sm font-extrabold">${fill.symbol}</p>
                <div className="mt-2 space-y-1 font-mono text-[9px] tabular-nums text-[#91897e]">
                  <p>
                    {fill.solDelta > 0 ? "+" : ""}
                    {fill.solDelta.toFixed(9)} SOL
                  </p>
                  <p>
                    {fill.tokenDelta > 0 ? "+" : ""}
                    {fill.tokenDelta.toLocaleString("en-US", {
                      maximumFractionDigits: 6,
                    })}{" "}
                    tokens
                  </p>
                  <p className="text-[#5f584f]">
                    fee {fill.feeSol.toFixed(6)} SOL · slot{" "}
                    {fill.slot.toLocaleString("en-US")}
                  </p>
                </div>
                {fill.receiptHash ? (
                  <p
                    className="mt-2 truncate font-mono text-[8px] text-[#5f584f]"
                    title={fill.receiptHash}
                  >
                    RECEIPT {fill.receiptHash}
                  </p>
                ) : null}
                <a
                  href={fill.solscan}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-[9px] font-bold text-signal hover:text-[#ff9b7d]"
                >
                  Open on Solscan <ExternalLink className="size-2.5" />
                </a>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#31291f] px-4 py-2.5 font-mono text-[8px] text-[#5f584f]">
            <span>QA wallet {short(data.wallet)}</span>
            <span>
              Verified {formatClock(data.checkedAt)} · public mainnet evidence
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function WalletPositions({
  walletAddress,
  state,
  data,
  error,
  tradeState,
  tradeMessage,
  onConnect,
  onRefresh,
  onExit,
}: {
  walletAddress: string | null;
  state: "idle" | "loading" | "ready" | "error";
  data: WalletPositionsPayload | null;
  error: string | null;
  tradeState: "idle" | "preparing" | "signing" | "sent" | "error";
  tradeMessage: string | null;
  onConnect: () => void;
  onRefresh: () => void;
  onExit: (position: WalletPosition, percent: number) => void;
}) {
  const tradePending =
    tradeState === "preparing" || tradeState === "signing";
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#31291f] px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl border border-ape-caesar/25 bg-ape-caesar/8 text-ape-caesar">
            <Coins className="size-4" />
          </span>
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ape-caesar">
              Caesar · wallet positions
            </p>
            <p className="mt-1 text-xs text-[#91897e]">
              Confirmed on-chain balances · custody stays in your wallet
            </p>
          </div>
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-2">
            {data ? (
              <SourceBadge source={data.source} compact />
            ) : null}
            <button
              type="button"
              onClick={onRefresh}
              disabled={state === "loading"}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-[#31291f] text-[#766f65] hover:border-ape-caesar/40 hover:text-ape-caesar disabled:cursor-wait"
              aria-label="Refresh wallet positions"
            >
              <RefreshCw
                className={cn(
                  "size-3.5",
                  state === "loading" && "animate-spin",
                )}
              />
            </button>
          </div>
        ) : null}
      </div>

      {walletAddress && tradeMessage ? (
        <div
          className={cn(
            "border-b border-[#31291f] px-4 py-2.5 font-mono text-[8px] leading-relaxed",
            tradeState === "error"
              ? "bg-block/6 text-block"
              : "bg-ape-caesar/5 text-[#9eb673]",
          )}
        >
          {tradeMessage}
        </div>
      ) : null}

      {!walletAddress ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <WalletCards className="size-6 text-[#554f47]" />
          <p className="mt-3 text-sm font-bold">Connect to read your positions</p>
          <p className="mt-1 max-w-md text-[10px] leading-relaxed text-[#6f685f]">
            Apegate reads public SPL and Token-2022 balances. It never needs
            custody or a seed phrase.
          </p>
          <button
            type="button"
            onClick={onConnect}
            className="mt-4 rounded-lg border border-ape-caesar/35 bg-ape-caesar/8 px-4 py-2 text-xs font-bold text-ape-caesar hover:border-ape-caesar/60"
          >
            Connect Solana wallet
          </button>
        </div>
      ) : state === "loading" && !data ? (
        <div className="grid gap-px bg-[#272119] sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex animate-pulse gap-3 bg-[#0d0b09] p-4">
              <span className="size-10 rounded-xl bg-[#211b14]" />
              <span className="flex-1">
                <span className="block h-3 w-24 rounded bg-[#211b14]" />
                <span className="mt-2 block h-2 w-36 rounded bg-[#17130e]" />
              </span>
            </div>
          ))}
        </div>
      ) : state === "error" && !data ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <AlertTriangle className="size-5 text-warn" />
          <p className="mt-2 text-sm font-bold">Position read timed out</p>
          <p className="mt-1 text-[10px] text-[#6f685f]">
            {error ?? "The Solana RPC did not return a safe response."}
          </p>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-3 text-[10px] font-bold text-signal hover:text-[#ff9b7d]"
          >
            Retry confirmed read
          </button>
        </div>
      ) : data?.positions.length ? (
        <>
          <div className="max-h-[420px] divide-y divide-[#272119] overflow-y-auto sm:grid sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
            {data.positions.map((position) => (
              <article
                key={position.mint}
                className="min-w-0 border-[#272119] p-4 sm:border-b sm:[&:nth-child(odd)]:border-r xl:[&:nth-child(odd)]:border-r-0 xl:[&:not(:nth-child(3n))]:border-r"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo
                    mint={position.mint}
                    symbol={position.symbol ?? "COIN"}
                    imageUrl={position.image}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-extrabold">
                        {position.symbol ? `$${position.symbol}` : short(position.mint)}
                      </p>
                      <p
                        className="max-w-[55%] truncate font-mono text-[10px] font-bold tabular-nums text-[#ded7cb]"
                        title={position.uiAmount}
                      >
                        {formatTokenBalance(position.uiAmount)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="truncate text-[9px] text-[#6f685f]">
                        {position.name ?? "Metadata resolving"}
                      </p>
                      <a
                        href={`https://solscan.io/token/${position.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-[8px] font-bold text-[#766f65] hover:text-signal"
                      >
                        Evidence <ExternalLink className="size-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[50, 100].map((percent) => (
                    <button
                      key={percent}
                      type="button"
                      disabled={tradePending}
                      onClick={() => onExit(position, percent)}
                      aria-label={`${percent === 100 ? "Exit" : "Sell"} ${percent}% of ${position.symbol ? `$${position.symbol}` : position.mint}`}
                      className="rounded-lg border border-block/25 bg-block/6 px-2 py-2 text-[9px] font-extrabold text-[#ff8f7b] enabled:hover:border-block/55 disabled:cursor-wait disabled:opacity-50"
                    >
                      {percent === 100 ? "Exit 100%" : "Sell 50%"}
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#31291f] px-4 py-2.5 font-mono text-[8px] text-[#5f584f]">
            <span>
              {data.total} non-zero position{data.total === 1 ? "" : "s"} ·{" "}
              {formatClock(data.observedAt)}
            </span>
            <span>
              {data.hasMore
                ? `Showing first ${data.positions.length} · largest balances first`
                : "SPL + Token-2022 · confirmed"}
            </span>
          </div>
        </>
      ) : (
        <div className="px-5 py-10 text-center">
          <Coins className="mx-auto size-5 text-[#554f47]" />
          <p className="mt-2 text-sm font-bold">No token positions found</p>
          <p className="mt-1 text-[10px] text-[#6f685f]">
            This wallet has no confirmed non-zero SPL or Token-2022 balances.
          </p>
        </div>
      )}
    </section>
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
                      : receipt.kind === "manual_fill"
                        ? receipt.outputs.side === "SELL"
                          ? `SELL $${String(receipt.outputs.symbol)} · ${String(receipt.outputs.percent)}%`
                          : `BUY $${String(receipt.outputs.symbol)} · ${String(receipt.outputs.amountSol)} SOL`
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
                {receipt.kind === "manual_fill" &&
                typeof receipt.outputs.signature === "string" ? (
                  <a
                    href={`https://solscan.io/tx/${receipt.outputs.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-signal hover:text-[#ff9b7d]"
                  >
                    Open live fill <ExternalLink className="size-2.5" />
                  </a>
                ) : null}
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

function LaunchSignalChips({
  launch,
  compact,
}: {
  launch: FeedLaunch;
  compact?: boolean;
}) {
  const { facts, verdict } = launch;
  const serial =
    (facts.creatorLaunches1h ?? 0) > 1 ||
    (facts.creatorLaunches24h ?? 0) > 1;
  const clones = (facts.cloneCount1h ?? 0) > 1;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        compact ? "mt-1" : "mt-3",
      )}
    >
      <SignalChip
        label={verdict.timing.label}
        tone={verdict.timing.entryAllowed ? "pass" : "wait"}
      />
      {verdict.timing.insidersOut ? (
        <SignalChip label="Insiders out" tone="pass" />
      ) : null}
      {serial ? (
        <SignalChip
          label={`${facts.creatorLaunches1h ?? 0}/1h · ${facts.creatorLaunches24h ?? 0}/24h`}
          tone="warn"
        />
      ) : null}
      {clones ? (
        <SignalChip
          label={`Clone ${facts.cloneRank1h ?? "?"}/${facts.cloneCount1h}`}
          tone="warn"
        />
      ) : null}
      {clones && facts.cloneLeaderMint === facts.mint ? (
        <SignalChip label="MC leader" tone="neutral" />
      ) : null}
      {facts.websiteReachable === true ? (
        <SignalChip
          label={
            facts.websiteMentionsToken && facts.websiteMatchesX
              ? "Website checked"
              : "Website live"
          }
          tone={
            facts.websiteMentionsToken && facts.websiteMatchesX
              ? "pass"
              : "neutral"
          }
        />
      ) : facts.websiteReachable === false ? (
        <SignalChip label="Website down" tone="warn" />
      ) : null}
      {facts.xLinkType && facts.xLinkType !== "none" ? (
        <SignalChip
          label={`X ${facts.xLinkType}`}
          tone={facts.xLinkType === "profile" ? "pass" : "warn"}
        />
      ) : null}
      {(facts.websiteTemplateReuse24h ?? 0) >= 3 ? (
        <SignalChip
          label={`${facts.websiteTemplateReuse24h} site matches`}
          tone="warn"
        />
      ) : null}
      {facts.launchIndexScope === "session" ? (
        <SignalChip
          label={facts.launchIndexLabel ?? "This session"}
          tone="neutral"
        />
      ) : null}
    </div>
  );
}

function SignalChip({
  label,
  tone,
}: {
  label: string;
  tone: "pass" | "warn" | "wait" | "neutral";
}) {
  const colors = {
    pass: "border-pass/25 bg-pass/7 text-pass",
    warn: "border-warn/25 bg-warn/7 text-warn",
    wait: "border-wait/25 bg-wait/7 text-wait",
    neutral: "border-[#3a3328] bg-[#17130e] text-[#91897e]",
  };
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.06em]",
        colors[tone],
      )}
    >
      {label}
    </span>
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

function TimingBadge({
  timing,
  compact,
}: {
  timing: GateTiming;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border font-mono font-bold uppercase tracking-[0.08em]",
        timing.entryAllowed
          ? "border-pass/25 bg-pass/7 text-pass"
          : "border-[#ffb13c]/25 bg-[#ffb13c]/7 text-[#ffca72]",
        compact ? "px-1 py-px text-[6px]" : "px-1.5 py-0.5 text-[7px]",
      )}
      title={timing.reason}
    >
      {timing.label}
    </span>
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

function formatTokenBalance(value: string) {
  const [integer = "0", fraction = ""] = value.split(".");
  const grouped = BigInt(integer || "0").toLocaleString("en-US");
  const visibleFraction = fraction.slice(0, 4).replace(/0+$/, "");
  return visibleFraction ? `${grouped}.${visibleFraction}` : grouped;
}

function formatClock(value: number) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}
