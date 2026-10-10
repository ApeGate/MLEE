"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CircleDot,
  Eraser,
  Fingerprint,
  FlaskConical,
  GripVertical,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  paperPositionValue,
  quotePaperBuy,
  quotePaperSell,
  type PaperPosition,
  type PaperQuote,
} from "../../../packages/core/src";
import { cn } from "@/lib/utils";
import { useLaunchFeed, type FeedLaunch } from "@/lib/use-launch-feed";
import { usePaperPortfolio } from "@/lib/use-paper-portfolio";
import { useReceipts } from "@/lib/use-receipts";
import { TokenLogo } from "@/components/token/token-logo";

const SIZE_PRESETS = [0.05, 0.1, 0.25, 0.5] as const;

export function PaperDesk() {
  const { launches, status } = useLaunchFeed();
  const { portfolio, buy, sell, reset } = usePaperPortfolio();
  const { receipts, verified, addPaperFill } = useReceipts();
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const [sizeSol, setSizeSol] = useState(0.1);
  const [slippagePct, setSlippagePct] = useState(8);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected =
    launches.find((launch) => launch.facts.mint === selectedMint) ??
    launches[0] ??
    null;

  const buyQuote = useMemo(() => {
    if (!selected) return null;
    try {
      return quotePaperBuy(selected.facts, sizeSol, slippagePct * 100);
    } catch {
      return null;
    }
  }, [selected, sizeSol, slippagePct]);

  const equitySol = useMemo(
    () =>
      portfolio.cashSol +
      portfolio.positions.reduce((sum, position) => {
        const launch = launches.find(
          (item) => item.facts.mint === position.mint,
        );
        return (
          sum +
          (launch
            ? paperPositionValue(position, launch.facts.marketCapSol)
            : position.tokens * position.lastPriceSol)
        );
      }, 0),
    [launches, portfolio.cashSol, portfolio.positions],
  );
  const pnlSol = equitySol - portfolio.startingCashSol;
  const gateNeedsAck =
    selected?.verdict.kind === "WARN" || selected?.verdict.kind === "WAIT";
  const gateBlocks = selected?.verdict.kind === "BLOCK";
  const canBuy = Boolean(
    buyQuote &&
      !gateBlocks &&
      (!gateNeedsAck || acknowledged) &&
      buyQuote.totalSol <= portfolio.cashSol,
  );

  async function executeBuy() {
    if (!buyQuote || !selected || !canBuy) return;
    try {
      const fill = buy(buyQuote);
      await addPaperFill(fill, buyQuote);
      setMessage(
        `PAPER fill · ${formatTokens(fill.tokens)} $${fill.symbol} at the modeled price`,
      );
      setAcknowledged(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paper fill failed");
    }
  }

  async function executeSell(
    position: PaperPosition,
    launch: FeedLaunch,
    fraction: number,
  ) {
    try {
      const quote = quotePaperSell(
        launch.facts,
        position.tokens * fraction,
        slippagePct * 100,
      );
      const fill = sell(quote);
      await addPaperFill(fill, quote);
      setMessage(
        `PAPER exit · ${(fraction * 100).toFixed(0)}% of $${fill.symbol}${
          fill.realizedPnlSol === null
            ? ""
            : ` · ${signed(fill.realizedPnlSol)} SOL realized`
        }`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paper exit failed");
    }
  }

  function resetPaper() {
    reset();
    setMessage("Paper portfolio reset to 10 SOL. Receipt history is unchanged.");
  }

  return (
    <div className="min-h-[100svh] bg-[#080705] text-[#f4efe5]">
      <header className="sticky top-0 z-40 border-b border-[#31291f] bg-[#080705]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-[1540px] items-center justify-between gap-4 px-4 sm:px-6">
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
              <p className="text-xs font-bold">Caesar&apos;s paper desk</p>
              <p className="font-mono text-[7px] uppercase tracking-[0.14em] text-[#6f685f]">
                Simulated fills · zero transactions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge source="PAPER" hot />
            <Link
              href="/feed"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#31291f] px-3 py-2 text-xs font-bold hover:border-[#c7ff45]/50"
            >
              <ArrowLeft className="size-3" />
              Live Gate
            </Link>
          </div>
        </div>
      </header>

      <div className="border-b border-[#31291f] bg-[#0d0b09]">
        <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 text-[10px] text-[#91897e]">
            <span
              className={cn(
                "size-1.5 rounded-full",
                status === "live"
                  ? "live-dot bg-pass"
                  : status === "connecting"
                    ? "animate-pulse bg-wait"
                    : "bg-[#ff7250]",
              )}
            />
            Market input: {status === "live" ? "LIVE" : status === "connecting" ? "CONNECTING" : "REPLAY"}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-[0.13em] text-[#5f584f]">
            10 SOL practice balance · local browser only
          </p>
        </div>
      </div>

      <main className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 sm:py-7">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<WalletCards className="size-4" />}
            label="Paper cash"
            value={`${portfolio.cashSol.toFixed(4)} SOL`}
            source="PAPER"
          />
          <Metric
            icon={<FlaskConical className="size-4" />}
            label="Modeled equity"
            value={`${equitySol.toFixed(4)} SOL`}
            source="PAPER"
          />
          <Metric
            icon={
              pnlSol >= 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )
            }
            label="Paper P&L"
            value={`${signed(pnlSol)} SOL`}
            source="PAPER"
            tone={pnlSol >= 0 ? "pass" : "fail"}
          />
          <Metric
            icon={<Fingerprint className="size-4" />}
            label="Receipt chain"
            value={verified ? "Verified" : "Broken"}
            source="LOCAL"
            tone={verified ? "pass" : "fail"}
          />
        </section>

        {message ? (
          <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-[#c7ff45]/25 bg-[#c7ff45]/6 p-3">
            <p className="text-[10px] leading-relaxed text-[#b5d47b]">
              {message}
            </p>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="font-mono text-[8px] font-bold text-[#71864e]"
            >
              DISMISS
            </button>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_0.78fr_1.05fr]">
          <LaunchLane
            launches={launches}
            selectedMint={selected?.facts.mint ?? null}
            onSelect={(mint) => {
              setSelectedMint(mint);
              setAcknowledged(false);
              setMessage(null);
            }}
          />
          <OrderTicket
            launch={selected}
            quote={buyQuote}
            sizeSol={sizeSol}
            slippagePct={slippagePct}
            cashSol={portfolio.cashSol}
            acknowledged={acknowledged}
            onSize={setSizeSol}
            onSlippage={setSlippagePct}
            onAcknowledge={setAcknowledged}
            onBuy={() => void executeBuy()}
            canBuy={canBuy}
          />
          <BagPanel
            positions={portfolio.positions}
            launches={launches}
            onSell={(position, launch, fraction) =>
              void executeSell(position, launch, fraction)
            }
            onReset={resetPaper}
          />
        </div>

        <FillTape fills={portfolio.fills} receiptCount={receipts.length} />

        <section className="mt-4 rounded-2xl border border-[#ffb13c]/20 bg-[#ffb13c]/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#ffb13c]" />
            <div>
              <p className="text-xs font-bold text-[#d7b477]">
                Simulation is not execution.
              </p>
              <p className="mt-1 text-[9px] leading-relaxed text-[#8f7651]">
                PAPER fills use a deterministic market-cap estimate, modeled
                impact, slippage, the current 1.25% protocol estimate, and the
                locked 0.5% Apegate fee. They do not model a real reserve curve,
                MEV, failed landing, or wallet signature. No transaction is
                built or sent.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LaunchLane({
  launches,
  selectedMint,
  onSelect,
}: {
  launches: FeedLaunch[];
  selectedMint: string | null;
  onSelect: (mint: string) => void;
}) {
  const [order, setOrder] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    setOrder((current) => {
      const available = new Set(launches.map((launch) => launch.facts.mint));
      const kept = current.filter((mint) => available.has(mint));
      const added = launches
        .map((launch) => launch.facts.mint)
        .filter((mint) => !kept.includes(mint));
      return [...kept, ...added];
    });
  }, [launches]);

  const ordered = useMemo(
    () =>
      order
        .map((mint) => launches.find((launch) => launch.facts.mint === mint))
        .filter((launch): launch is FeedLaunch => Boolean(launch)),
    [launches, order],
  );

  function dropOn(target: string) {
    if (!dragging || dragging === target) return;
    setOrder((current) => {
      const next = current.filter((mint) => mint !== dragging);
      const targetIndex = next.indexOf(target);
      next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragging);
      return next;
    });
    setDragging(null);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="border-b border-[#31291f] p-4">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#ffb13c]">
          Cheeta · paper watchlist
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h1 className="text-lg font-extrabold">Pick a launch.</h1>
          <p className="hidden font-mono text-[7px] uppercase text-[#4f4941] sm:block">
            Drag to reorder
          </p>
        </div>
      </div>
      <div className="max-h-[640px] overflow-y-auto">
        {launches.length ? (
          ordered.slice(0, 24).map((launch) => (
            <button
              key={`${launch.source}-${launch.facts.mint}`}
              type="button"
              draggable
              onDragStart={() => setDragging(launch.facts.mint)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(launch.facts.mint)}
              onClick={() => onSelect(launch.facts.mint)}
              className={cn(
                "flex w-full items-center justify-between gap-3 border-b border-[#272119] p-3 text-left last:border-0",
                selectedMint === launch.facts.mint
                  ? "bg-[#c7ff45]/6"
                  : "hover:bg-[#15120e]",
                dragging === launch.facts.mint && "opacity-45",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <GripVertical className="hidden size-3 shrink-0 cursor-grab text-[#4f4941] sm:block" />
                <TokenLogo
                  mint={launch.facts.mint}
                  symbol={launch.facts.symbol}
                  uri={launch.facts.uri}
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold">
                    ${launch.facts.symbol}
                  </p>
                  <p className="truncate text-[8px] text-[#6f685f]">
                    {launch.facts.marketCapSol.toFixed(1)} SOL mcap ·{" "}
                    {launch.source.toUpperCase()}
                  </p>
                  <p className="mt-1 truncate font-mono text-[7px] uppercase text-[#ffca72]">
                    {launch.verdict.timing.label}
                  </p>
                </div>
              </div>
              <VerdictPill kind={launch.verdict.kind} />
            </button>
          ))
        ) : (
          <div className="px-5 py-16 text-center">
            <CircleDot className="mx-auto size-5 animate-pulse text-[#ffb13c]" />
            <p className="mt-2 text-xs font-bold">Opening the practice lane…</p>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderTicket({
  launch,
  quote,
  sizeSol,
  slippagePct,
  cashSol,
  acknowledged,
  onSize,
  onSlippage,
  onAcknowledge,
  onBuy,
  canBuy,
}: {
  launch: FeedLaunch | null;
  quote: PaperQuote | null;
  sizeSol: number;
  slippagePct: number;
  cashSol: number;
  acknowledged: boolean;
  onSize: (value: number) => void;
  onSlippage: (value: number) => void;
  onAcknowledge: (value: boolean) => void;
  onBuy: () => void;
  canBuy: boolean;
}) {
  if (!launch || !quote) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-2xl border border-[#31291f] bg-[#0d0b09] p-6 text-center">
        <p className="text-xs text-[#6f685f]">Waiting for a launch snapshot.</p>
      </section>
    );
  }
  const needsAck =
    launch.verdict.kind === "WARN" || launch.verdict.kind === "WAIT";
  const insufficient = quote.totalSol > cashSol;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex items-start justify-between gap-3 border-b border-[#31291f] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <TokenLogo
            mint={launch.facts.mint}
            symbol={launch.facts.symbol}
            uri={launch.facts.uri}
            size="md"
            eager
          />
          <div className="min-w-0">
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
              Caesar · order preview
            </p>
            <h2 className="mt-1 truncate text-lg font-extrabold">
              PAPER buy ${launch.facts.symbol}
            </h2>
            <p className="mt-1 font-mono text-[7px] uppercase text-[#ffca72]">
              {launch.verdict.timing.label} ·{" "}
              {launch.verdict.timing.entryAllowed ? "entry lane" : "watch only"}
            </p>
          </div>
        </div>
        <SourceBadge source="PAPER" hot />
      </div>

      <div className="space-y-5 p-4">
        <div>
          <p className="text-[9px] font-bold text-[#91897e]">Size</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {SIZE_PRESETS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onSize(size)}
                className={cn(
                  "rounded-lg border px-2 py-2 font-mono text-[9px] font-bold",
                  sizeSol === size
                    ? "border-[#c7ff45]/45 bg-[#c7ff45]/8 text-[#c7ff45]"
                    : "border-[#31291f] text-[#6f685f]",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-bold text-[#91897e]">Slippage model</p>
            <span
              className={cn(
                "font-mono text-[9px] font-bold",
                slippagePct > 15 ? "text-warn" : "text-[#b6aea1]",
              )}
            >
              {slippagePct}%
            </span>
          </div>
          <input
            aria-label="Paper slippage percentage"
            type="range"
            min={1}
            max={25}
            value={slippagePct}
            onChange={(event) => onSlippage(Number(event.target.value))}
            className="mt-3 w-full accent-[#c7ff45]"
          />
          <div className="mt-1 flex justify-between font-mono text-[7px] text-[#4f4941]">
            <span>1%</span>
            <span className="text-warn">WARN &gt;15%</span>
            <span>CAP 25%</span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-[#272119] bg-[#090806] p-3">
          <QuoteRow
            label="Expected tokens"
            value={formatTokens(quote.tokenAmount)}
            source="ESTIMATE"
          />
          <QuoteRow
            label="Minimum tokens"
            value={formatTokens(quote.minimumTokens ?? 0)}
            source="ESTIMATE"
          />
          <QuoteRow
            label="Modeled impact"
            value={`${quote.priceImpactPct.toFixed(2)}%`}
            source="ESTIMATE"
          />
          <div className="my-2 border-t border-[#272119]" />
          <QuoteRow
            label="Protocol estimate"
            value={`${quote.fees.protocolFee.toFixed(6)} SOL`}
            source="ESTIMATE"
          />
          <QuoteRow
            label="Apegate · 0.5%"
            value={`${quote.fees.apegateFee.toFixed(6)} SOL`}
            source="PAPER"
          />
          <QuoteRow
            label="Paper total"
            value={`${quote.totalSol.toFixed(6)} SOL`}
            source="PAPER"
            strong
          />
        </div>

        <div
          className={cn(
            "rounded-xl border p-3",
            launch.verdict.kind === "BLOCK"
              ? "border-block/25 bg-block/6"
              : launch.verdict.kind === "PASS"
                ? "border-pass/25 bg-pass/6"
                : "border-warn/25 bg-warn/6",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold">
              Kong · {launch.verdict.kind}
            </p>
            <span className="font-mono text-[8px] text-[#91897e]">
              {launch.verdict.score}/100
            </span>
          </div>
          <p className="mt-1 text-[9px] leading-relaxed text-[#7f766b]">
            {launch.verdict.topReasons[0] ?? "No top reason available"}
          </p>
        </div>

        {needsAck ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-warn/20 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => onAcknowledge(event.target.checked)}
              className="mt-0.5 size-3.5 accent-[#c7ff45]"
            />
            <span className="text-[9px] leading-relaxed text-[#91897e]">
              I understand {launch.verdict.kind} is incomplete or cautionary.
              PAPER mode cannot bypass this Gate for a real trade.
            </span>
          </label>
        ) : null}

        <button
          type="button"
          onClick={onBuy}
          disabled={!canBuy}
          className="w-full rounded-xl bg-[#c7ff45] px-4 py-3.5 text-sm font-extrabold text-[#090806] enabled:hover:bg-[#d5ff72] disabled:cursor-not-allowed disabled:bg-[#242019] disabled:text-[#5f584f]"
        >
          {launch.verdict.kind === "BLOCK"
            ? "BLOCKED by Kong"
            : insufficient
              ? "Paper balance too low"
              : needsAck && !acknowledged
                ? `Read ${launch.verdict.kind} to continue`
                : `PAPER buy ${sizeSol} SOL`}
        </button>
        <p className="text-center font-mono text-[7px] uppercase tracking-[0.12em] text-[#4f4941]">
          No wallet · no signature · no transaction
        </p>
      </div>
    </section>
  );
}

function BagPanel({
  positions,
  launches,
  onSell,
  onReset,
}: {
  positions: PaperPosition[];
  launches: FeedLaunch[];
  onSell: (
    position: PaperPosition,
    launch: FeedLaunch,
    fraction: number,
  ) => void;
  onReset: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex items-center justify-between gap-3 border-b border-[#31291f] p-4">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#5cc8ff]">
            Cornelius · paper bags
          </p>
          <h2 className="mt-1 text-lg font-extrabold">Positions & exits.</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#31291f] px-2.5 py-2 font-mono text-[7px] font-bold uppercase text-[#6f685f] hover:text-[#f4efe5]"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <div className="border-b border-[#31291f] bg-[#5cc8ff]/[0.035] p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#5cc8ff]/20 bg-[#5cc8ff]/7 text-[#86d8ff]">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-extrabold">Free-ride exit default</p>
              <span className="rounded border border-pass/20 bg-pass/7 px-1.5 py-0.5 font-mono text-[6px] font-bold text-pass">
                ARMED IN PLAN
              </span>
            </div>
            <p className="mt-1 text-[8px] leading-relaxed text-[#6f85a5]">
              Recover stake + fees near 2×, trail the runner 30%, stop at −35%,
              and flag dev, cluster, Gate-flip, or pool-drain exits.
            </p>
          </div>
        </div>
      </div>

      {positions.length ? (
        <div className="max-h-[640px] space-y-3 overflow-y-auto p-4">
          {positions.map((position) => {
            const launch = launches.find(
              (item) => item.facts.mint === position.mint,
            );
            const valueSol = launch
              ? paperPositionValue(position, launch.facts.marketCapSol)
              : position.tokens * position.lastPriceSol;
            const unrealized = valueSol - position.costBasisSol;
            return (
              <article
                key={position.mint}
                className="rounded-xl border border-[#272119] bg-[#090806] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <TokenLogo
                      mint={position.mint}
                      symbol={position.symbol}
                      uri={launch?.facts.uri}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">
                        ${position.symbol}
                      </p>
                      <p className="mt-1 font-mono text-[8px] text-[#5f584f]">
                        {formatTokens(position.tokens)} tokens
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-[10px] font-bold",
                      unrealized >= 0 ? "text-pass" : "text-block",
                    )}
                  >
                    {signed(unrealized)} SOL
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[9px]">
                  <BagStat
                    label="Cost basis"
                    value={`${position.costBasisSol.toFixed(4)} SOL`}
                  />
                  <BagStat
                    label="Modeled value"
                    value={`${valueSol.toFixed(4)} SOL`}
                  />
                </div>
                {launch ? (
                  <div className="mt-3 grid grid-cols-3 gap-1.5">
                    {[0.25, 0.5, 1].map((fraction) => (
                      <button
                        key={fraction}
                        type="button"
                        onClick={() => onSell(position, launch, fraction)}
                        className="rounded-lg border border-[#5cc8ff]/25 bg-[#5cc8ff]/5 px-2 py-2 font-mono text-[8px] font-bold text-[#86d8ff] hover:border-[#5cc8ff]/50"
                      >
                        PAPER sell {fraction * 100}%
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[8px] text-[#5f584f]">
                    Exit quote waits for this mint to return to the feed.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex min-h-[480px] items-center justify-center p-8 text-center">
          <div>
            <Eraser className="mx-auto size-6 text-[#5cc8ff]" />
            <p className="mt-3 text-xs font-bold">No paper bags yet.</p>
            <p className="mt-1 max-w-xs text-[9px] leading-relaxed text-[#6f685f]">
              Pick a launch, inspect the modeled quote, and write a PAPER fill.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function FillTape({
  fills,
  receiptCount,
}: {
  fills: Array<{
    id: string;
    side: "BUY" | "SELL";
    symbol: string;
    quoteAmountSol: number;
    feeSol: number;
    realizedPnlSol: number | null;
    at: number;
  }>;
  receiptCount: number;
}) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#31291f] bg-[#0d0b09]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#31291f] p-4">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[#c7ff45]">
            Paper fills · local tape
          </p>
          <p className="mt-1 text-[9px] text-[#6f685f]">
            {fills.length} fills · {receiptCount} total chained receipts in this browser
          </p>
        </div>
        <SourceBadge source="PAPER" hot />
      </div>
      {fills.length ? (
        <div className="grid divide-y divide-[#272119] lg:grid-cols-4 lg:divide-x lg:divide-y-0">
          {[...fills]
            .reverse()
            .slice(0, 4)
            .map((fill) => (
              <article key={fill.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold">
                    {fill.side} ${fill.symbol}
                  </p>
                  <ReceiptText className="size-3 text-[#c7ff45]" />
                </div>
                <p className="mt-2 font-mono text-[10px] text-[#b6aea1]">
                  {fill.quoteAmountSol.toFixed(6)} SOL
                </p>
                <p className="mt-1 text-[8px] text-[#5f584f]">
                  Fees {fill.feeSol.toFixed(6)} SOL
                  {fill.realizedPnlSol === null
                    ? ""
                    : ` · P&L ${signed(fill.realizedPnlSol)}`}
                </p>
                <p className="mt-3 font-mono text-[7px] uppercase text-[#4f4941]">
                  {new Date(fill.at).toLocaleTimeString()} · PAPER
                </p>
              </article>
            ))}
        </div>
      ) : (
        <div className="p-8 text-center">
          <ReceiptText className="mx-auto size-5 text-[#4f4941]" />
          <p className="mt-2 text-[9px] text-[#6f685f]">
            Paper fills will appear here with itemized fees.
          </p>
        </div>
      )}
    </section>
  );
}

function QuoteRow({
  label,
  value,
  source,
  strong,
}: {
  label: string;
  value: string;
  source: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[9px]">
      <span className="flex items-center gap-1.5 text-[#6f685f]">
        {label}
        <span className="rounded border border-[#31291f] px-1 py-px font-mono text-[6px]">
          {source}
        </span>
      </span>
      <span
        className={cn(
          "font-mono text-[#b6aea1]",
          strong && "font-extrabold text-[#f4efe5]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  source,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  source: string;
  tone?: "neutral" | "pass" | "fail";
}) {
  return (
    <article className="rounded-2xl border border-[#31291f] bg-[#0d0b09] p-4">
      <div className="flex items-start justify-between">
        <span className="text-[#c7ff45]">{icon}</span>
        <SourceBadge source={source} />
      </div>
      <p
        className={cn(
          "mt-4 text-2xl font-extrabold tracking-[-0.04em]",
          tone === "pass" && "text-pass",
          tone === "fail" && "text-block",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[9px] text-[#6f685f]">{label}</p>
    </article>
  );
}

function BagStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#272119] p-2.5">
      <p className="font-mono text-[8px] font-bold text-[#b6aea1]">{value}</p>
      <p className="mt-1 text-[7px] text-[#4f4941]">{label}</p>
    </div>
  );
}

function VerdictPill({ kind }: { kind: FeedLaunch["verdict"]["kind"] }) {
  const color = {
    PASS: "border-pass/25 bg-pass/7 text-pass",
    WARN: "border-warn/25 bg-warn/7 text-warn",
    BLOCK: "border-block/25 bg-block/7 text-block",
    WAIT: "border-wait/25 bg-wait/7 text-wait",
  }[kind];
  return (
    <span className={`rounded border px-1.5 py-1 font-mono text-[7px] font-bold ${color}`}>
      {kind}
    </span>
  );
}

function SourceBadge({
  source,
  hot,
}: {
  source: string;
  hot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-[0.1em]",
        hot
          ? "border-[#c7ff45]/25 bg-[#c7ff45]/7 text-[#c7ff45]"
          : "border-[#ff7250]/20 bg-[#ff4f1f]/7 text-[#ff8a64]",
      )}
    >
      {source}
    </span>
  );
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1_000_000 ? 2 : 0,
  }).format(value);
}
