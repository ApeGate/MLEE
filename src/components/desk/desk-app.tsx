"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import {
  STYLE_META,
  createStrategy,
  strategyLine,
  type Strategy,
  type StrategyStyle,
} from "@/lib/strategies";
import {
  approvePending,
  createInitialState,
  nextStepLabel,
  rejectPending,
  simTick,
  type DeskEvent,
  type Phase,
  type SimState,
} from "@/lib/simulation";
import { cn, formatPct, formatSol, formatTime } from "@/lib/utils";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Setup",
  paused: "Paused",
  scouting: "Checking coins",
  watching: "Waiting for entry",
  awaiting_approval: "Needs your OK",
  managing: "Managing bags",
  blocked: "Hit a limit",
};

const WHO_LABEL: Record<DeskEvent["specialist"], string> = {
  scout: "Check",
  watch: "Watch",
  desk: "Trade",
  system: "System",
};

const KIND_LABEL: Record<DeskEvent["kind"], string> = {
  scan: "Looking",
  skip: "Skip",
  pass: "Pass",
  watching: "Waiting",
  entry: "Entry",
  pending: "Ready",
  buy: "Bought",
  sell: "Sold",
  note: "Note",
  error: "Blocked",
};

export function DeskApp() {
  const [strategy, setStrategy] = useState<Strategy>(() =>
    createStrategy("clips"),
  );
  const [state, setState] = useState<SimState>(() => createInitialState());
  const [started, setStarted] = useState(false);
  const [showExits, setShowExits] = useState(false);
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => {
      setState((prev) => simTick(prev, strategyRef.current));
    }, 650);
    return () => window.clearInterval(id);
  }, [state.running]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!state.pending) return;
      if (e.key === "Enter") {
        e.preventDefault();
        setState((s) => approvePending(s));
      } else if (e.key === "Escape") {
        e.preventDefault();
        setState((s) => rejectPending(s));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.pending]);

  function updateStyle(style: StrategyStyle) {
    setStrategy((prev) =>
      createStrategy(style, {
        budgetSol: prev.budgetSol,
        maxPerCoinSol: prev.maxPerCoinSol,
        maxPositions: prev.maxPositions,
        askBeforeBuy: prev.askBeforeBuy,
      }),
    );
  }

  function startDesk() {
    startTransition(() => {
      setStarted(true);
      setState({
        ...createInitialState(),
        running: true,
        phase: "scouting",
        events: [
          {
            id: "boot",
            at: Date.now(),
            specialist: "system",
            kind: "note",
            title: "Simulated desk started",
            detail: strategyLine(strategy),
          },
        ],
      });
    });
  }

  function toggleRunning() {
    setState((prev) => {
      const running = !prev.running;
      return {
        ...prev,
        running,
        phase: running
          ? prev.pending
            ? "awaiting_approval"
            : prev.watched.length
              ? "watching"
              : "scouting"
          : "paused",
      };
    });
  }

  function resetDesk() {
    setStarted(false);
    setState(createInitialState());
  }

  const budgetLeft = Math.max(0, strategy.budgetSol - state.spentSol);
  const phase = started ? state.phase : ("idle" as Phase);
  const step = nextStepLabel(started ? state : { ...state, phase: "idle" });

  return (
    <div className="min-h-[100svh]">
      <header className="sticky top-0 z-30 border-b border-[#243044] bg-[#0b1220]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="shrink-0 text-lg font-bold text-[#3dd6c6]">
              Blotter
            </Link>
            <span className="hidden rounded-full bg-[#182235] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#f5a524] sm:inline">
              Simulated
            </span>
          </div>
          <div className="flex items-center gap-2">
            {started && (
              <>
                <GhostBtn onClick={toggleRunning}>
                  {state.running ? "Pause" : "Resume"}
                </GhostBtn>
                <GhostBtn onClick={resetDesk}>Reset</GhostBtn>
              </>
            )}
            <Link
              href="/"
              className="rounded-md border border-[#243044] px-3 py-1.5 text-xs text-[#8b9bb0] hover:border-[#3dd6c6] hover:text-[#3dd6c6]"
            >
              Home
            </Link>
          </div>
        </div>
        <div className="border-t border-[#243044]">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm">
              <span className="text-[#8b9bb0]">Status · </span>
              <span className="font-semibold text-[#3dd6c6]">
                {PHASE_LABEL[phase]}
              </span>
            </p>
            <p className="text-sm text-[#8b9bb0]">{step}</p>
          </div>
        </div>
        {started && <Pipeline phase={state.phase} stats={state.stats} />}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {!started ? (
          <Setup
            strategy={strategy}
            showExits={showExits}
            onToggleExits={() => setShowExits((v) => !v)}
            onStyle={updateStyle}
            onBudget={(v) => setStrategy((s) => ({ ...s, budgetSol: v }))}
            onMaxPer={(v) => setStrategy((s) => ({ ...s, maxPerCoinSol: v }))}
            onMaxPos={(v) => setStrategy((s) => ({ ...s, maxPositions: v }))}
            onAsk={(v) => setStrategy((s) => ({ ...s, askBeforeBuy: v }))}
            onStart={startDesk}
          />
        ) : (
          <Live
            strategy={strategy}
            state={state}
            budgetLeft={budgetLeft}
            onApprove={() => setState((s) => approvePending(s))}
            onReject={() => setState((s) => rejectPending(s))}
          />
        )}
      </main>
    </div>
  );
}

function Setup({
  strategy,
  showExits,
  onToggleExits,
  onStyle,
  onBudget,
  onMaxPer,
  onMaxPos,
  onAsk,
  onStart,
}: {
  strategy: Strategy;
  showExits: boolean;
  onToggleExits: () => void;
  onStyle: (s: StrategyStyle) => void;
  onBudget: (n: number) => void;
  onMaxPer: (n: number) => void;
  onMaxPos: (n: number) => void;
  onAsk: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#3dd6c6]">
          Step 1 of 2 · Plan
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Set your Pump.fun rules
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#8b9bb0]">
          Start with a style. Adjust how much SOL the desk can use. Everything
          here runs on <strong className="font-medium text-[#e8eef7]">simulated</strong>{" "}
          market data — no wallet, no real buys.
        </p>

        <div className="mt-8">
          <Label>Which coins should it look for?</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(Object.keys(STYLE_META) as StrategyStyle[]).map((style) => {
              const active = strategy.style === style;
              const meta = STYLE_META[style];
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onStyle(style)}
                  className={cn(
                    "rounded-xl border px-3.5 py-3.5 text-left transition-colors",
                    active
                      ? "border-[#3dd6c6] bg-[#3dd6c6]/10"
                      : "border-[#243044] bg-[#121a2a]/50 hover:border-[#3dd6c6]/40",
                  )}
                >
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="mt-0.5 text-xs text-[#3dd6c6]">{meta.plain}</div>
                  <div className="mt-2 text-[11px] leading-snug text-[#8b9bb0]">
                    {meta.summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <Label>How much can it spend?</Label>
          <NumberField
            label="Total budget"
            hint="Max SOL this run can put into buys"
            value={strategy.budgetSol}
            min={2}
            max={25}
            step={0.5}
            onChange={onBudget}
            suffix="SOL"
          />
          <NumberField
            label="Max per coin"
            hint="Largest single buy size"
            value={strategy.maxPerCoinSol}
            min={0.3}
            max={5}
            step={0.1}
            onChange={onMaxPer}
            suffix="SOL"
          />
          <NumberField
            label="Max open positions"
            hint="How many coins it can hold at once"
            value={strategy.maxPositions}
            min={1}
            max={6}
            step={1}
            onChange={(n) => onMaxPos(Math.round(n))}
          />
        </div>

        <label className="mt-6 flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#243044] bg-[#121a2a]/70 px-4 py-3.5">
          <span>
            <span className="block text-sm font-semibold">Ask before each buy</span>
            <span className="mt-1 block text-xs text-[#8b9bb0]">
              Recommended. When an entry is ready, you Approve or Skip (Enter /
              Esc).
            </span>
          </span>
          <input
            type="checkbox"
            checked={strategy.askBeforeBuy}
            onChange={(e) => onAsk(e.target.checked)}
            className="mt-1 size-4 accent-[#3dd6c6]"
          />
        </label>

        <div className="mt-4">
          <button
            type="button"
            onClick={onToggleExits}
            className="text-xs font-medium text-[#3dd6c6] hover:underline"
          >
            {showExits ? "Hide exit details" : "Show exit details (take-profit, stop, trail)"}
          </button>
          {showExits && (
            <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[#243044] bg-[#121a2a]/50 p-4 font-mono text-xs">
              <Meta k="Take profit" v={`+${strategy.exit.takeProfitPct}%`} />
              <Meta k="Sell then" v={`${strategy.exit.partialSellPct}%`} />
              <Meta k="Stop loss" v={`−${strategy.exit.stopLossPct}%`} />
              <Meta k="Trail" v={`${strategy.exit.trailingStopPct}%`} />
            </dl>
          )}
        </div>
      </div>

      <aside className="flex h-fit flex-col rounded-2xl border border-[#243044] bg-[#121a2a]/80 lg:sticky lg:top-28">
        <div className="border-b border-[#243044] px-5 py-3.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#3dd6c6]">
            Step 2 of 2 · Confirm
          </p>
          <h2 className="mt-1 text-lg font-semibold">What will run</h2>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed text-[#e8eef7]">
            {strategyLine(strategy)}
          </p>
          <div className="rounded-lg bg-[#182235] px-3 py-2.5 text-xs text-[#8b9bb0]">
            After you start: Blotter checks coins → waits for entries → asks you
            to approve buys → manages exits. Watch the decision log on the left.
          </div>
          <button
            type="button"
            data-testid="start-desk"
            onClick={onStart}
            className="mt-auto w-full rounded-md bg-[#3dd6c6] px-4 py-3.5 text-sm font-semibold text-[#041016] hover:bg-[#5eead4]"
          >
            Start simulated run →
          </button>
        </div>
      </aside>
    </div>
  );
}

function Live({
  strategy,
  state,
  budgetLeft,
  onApprove,
  onReject,
}: {
  strategy: Strategy;
  state: SimState;
  budgetLeft: number;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#f5a524]/40 bg-[#f5a524]/10 px-4 py-2.5 text-xs text-[#f5a524]">
        Simulated market — decisions here do not move real funds.
      </div>

      {state.pending && (
        <div className="overflow-hidden rounded-2xl border border-[#3dd6c6] bg-[#121a2a]">
          <div className="grid sm:grid-cols-[1fr_auto]">
            <div className="p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#3dd6c6]">
                Buy ready for your OK
              </p>
              <p className="mt-1 text-2xl font-bold">
                ${state.pending.token.ticker}{" "}
                <span className="text-lg font-semibold text-[#8b9bb0]">
                  · {formatSol(state.pending.sizeSol)}
                </span>
              </p>
              <p className="mt-2 text-sm text-[#8b9bb0]">
                {state.pending.reason}. Liquidity{" "}
                {state.pending.token.liquiditySol} SOL · top holders{" "}
                {state.pending.token.topHolderPct}%.
              </p>
            </div>
            <div className="flex sm:flex-col">
              <button
                type="button"
                onClick={onApprove}
                className="flex-1 bg-[#3dd6c6] px-6 py-4 text-sm font-semibold text-[#041016] sm:min-w-[148px]"
              >
                Approve ↵
              </button>
              <button
                type="button"
                onClick={onReject}
                className="flex-1 border-t border-[#243044] px-6 py-4 text-sm text-[#e8eef7] sm:border-l sm:border-t-0"
              >
                Skip Esc
              </button>
            </div>
          </div>
        </div>
      )}

      {state.lastError && !state.pending && (
        <div className="rounded-xl border border-[#ff6b6b]/50 bg-[#ff6b6b]/10 px-4 py-3 text-sm text-[#ff6b6b]">
          <span className="font-semibold">Can’t open another buy — </span>
          {state.lastError}. Raise budget / max positions, or wait for an exit.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#243044] bg-[#121a2a]/80 lg:min-h-[520px]">
          <div className="flex items-center justify-between border-b border-[#243044] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Decision log</h2>
              <p className="text-[11px] text-[#8b9bb0]">
                Newest first · why each coin was skipped, watched, or bought
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#8b9bb0]">
              {state.events.length}
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {state.events.length === 0 ? (
              <Empty
                title="Waiting for the first check…"
                body="New coins appear here as soon as the simulated tape starts."
              />
            ) : (
              state.events.map((event) => (
                <TapeLine key={event.id} event={event} />
              ))
            )}
          </ul>
        </section>

        <aside className="flex flex-col gap-4">
          <Panel title="Capital">
            <div className="grid grid-cols-2 gap-3 p-4">
              <Stat label="Budget left" value={formatSol(budgetLeft)} />
              <Stat label="In play" value={formatSol(state.spentSol)} />
              <Stat label="Open bags" value={String(state.positions.length)} />
              <Stat label="On watch" value={String(state.watched.length)} />
            </div>
          </Panel>

          <Panel title="Open positions">
            {state.positions.length === 0 ? (
              <Empty
                compact
                title="No open bags yet"
                body="Approved buys show up here with live P&amp;L."
              />
            ) : (
              <ul>
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-3 border-b border-[#243044] px-4 py-3 last:border-0"
                  >
                    <div>
                      <div className="font-semibold">${p.ticker}</div>
                      <div className="font-mono text-[11px] text-[#8b9bb0]">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        p.pnlPct < 0 ? "text-[#ff6b6b]" : "text-[#7dffb3]",
                      )}
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Market tape">
            {state.tokens.length === 0 ? (
              <Empty
                compact
                title="Loading coins…"
                body="First scan usually lands within a second."
              />
            ) : (
              <>
                <ul className="max-h-48 overflow-y-auto">
                  {state.tokens.slice(0, 10).map((t) => (
                    <li
                      key={t.id}
                      className="flex justify-between gap-2 border-b border-[#243044] px-4 py-2 text-xs last:border-0"
                    >
                      <span className="font-semibold">
                        ${t.ticker}
                        {state.watched.includes(t.id) ? (
                          <span className="text-[#3dd6c6]"> · watching</span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[#8b9bb0]">
                        {t.velocity.toFixed(2)}× · {t.liquiditySol} SOL
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-[#243044] px-4 py-2.5 text-[11px] leading-snug text-[#8b9bb0]">
                  Filters: age ≤ {strategy.filters.maxAgeMinutes}m · liquidity ≥{" "}
                  {strategy.filters.minLiquiditySol} SOL · top holders ≤{" "}
                  {strategy.filters.maxTopHolderPct}% · entry ≥{" "}
                  {strategy.filters.minVelocity.toFixed(1)}× velocity
                </p>
              </>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Pipeline({
  phase,
  stats,
}: {
  phase: Phase;
  stats: SimState["stats"];
}) {
  const stages: { id: Phase; label: string }[] = [
    { id: "scouting", label: "Check" },
    { id: "watching", label: "Watch" },
    { id: "awaiting_approval", label: "Approve" },
    { id: "managing", label: "Trade" },
  ];
  const active: Phase | null =
    phase === "blocked" || phase === "paused" || phase === "idle"
      ? null
      : phase === "scouting"
        ? "scouting"
        : phase === "watching"
          ? "watching"
          : phase === "awaiting_approval"
            ? "awaiting_approval"
            : "managing";

  return (
    <div className="border-t border-[#243044] bg-[#121a2a]/40">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row">
        <div className="grid flex-1 grid-cols-4">
          {stages.map((s, i) => {
            const on = active === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "px-2 py-2.5 text-center text-[11px] font-semibold sm:text-xs",
                  i > 0 && "border-l border-[#243044]",
                  on ? "bg-[#3dd6c6] text-[#041016]" : "text-[#8b9bb0]",
                )}
              >
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 border-t border-[#243044] px-4 py-2 font-mono text-[10px] text-[#8b9bb0] sm:border-l sm:border-t-0">
          <span>
            checked <span className="text-[#e8eef7]">{stats.scanned}</span>
          </span>
          <span>
            skipped <span className="text-[#e8eef7]">{stats.skipped}</span>
          </span>
          <span>
            passed <span className="text-[#e8eef7]">{stats.passed}</span>
          </span>
          <span>
            bought <span className="text-[#e8eef7]">{stats.bought}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function TapeLine({ event }: { event: DeskEvent }) {
  const hot =
    event.kind === "buy" ||
    event.kind === "pass" ||
    event.kind === "pending" ||
    event.kind === "error" ||
    event.kind === "sell";
  return (
    <li className="border-b border-[#243044] px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-[11px] text-[#8b9bb0]">
          {formatTime(event.at)}
        </span>
        <span className="text-[11px] font-semibold text-[#3dd6c6]">
          {WHO_LABEL[event.specialist]}
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            hot ? "text-[#3dd6c6]" : "text-[#e8eef7]",
          )}
        >
          {KIND_LABEL[event.kind]}
        </span>
        {event.ticker ? (
          <span className="font-mono text-sm font-semibold">
            ${event.ticker}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-[#8b9bb0]">{event.detail}</p>
    </li>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#243044] bg-[#121a2a]/80">
      <div className="border-b border-[#243044] px-4 py-3 text-sm font-semibold">
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#182235] px-3 py-2.5">
      <div className="text-[11px] text-[#8b9bb0]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Empty({
  title,
  body,
  compact,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("px-4", compact ? "py-8" : "flex min-h-[160px] flex-col justify-center py-12")}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-[30ch] text-xs leading-relaxed text-[#8b9bb0]">
        {body}
      </p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-semibold text-[#e8eef7]">{children}</div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#243044] pb-2 last:border-0">
      <dt className="text-[#8b9bb0]">{k}</dt>
      <dd className="font-semibold tabular-nums text-[#e8eef7]">{v}</dd>
    </div>
  );
}

function NumberField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block rounded-xl border border-[#243044] bg-[#121a2a]/40 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-[#3dd6c6]">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-[#8b9bb0]">{hint}</p>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[#3dd6c6]"
      />
    </label>
  );
}

function GhostBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-[#243044] px-3 py-1.5 text-xs text-[#e8eef7] hover:border-[#3dd6c6] hover:text-[#3dd6c6]"
    >
      {children}
    </button>
  );
}
