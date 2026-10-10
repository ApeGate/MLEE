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
  idle: "Idle",
  paused: "Paused",
  scouting: "Scout",
  watching: "Watch",
  awaiting_approval: "Approve",
  managing: "Desk",
  blocked: "Blocked",
};

const KIND_PREFIX: Record<DeskEvent["kind"], string> = {
  scan: "SCAN",
  skip: "SKIP",
  pass: "PASS",
  watching: "WATCH",
  entry: "ENTRY",
  pending: "READY",
  buy: "BUY",
  sell: "SELL",
  note: "SYS",
  error: "ERR",
};

export function DeskApp() {
  const [strategy, setStrategy] = useState<Strategy>(() =>
    createStrategy("clips"),
  );
  const [state, setState] = useState<SimState>(() => createInitialState());
  const [started, setStarted] = useState(false);
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
            title: "DESK ONLINE",
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
    <div className="relative min-h-[100svh]">
      <div className="noise pointer-events-none absolute inset-0 opacity-50" />

      <header className="relative border-b border-[#242824] bg-[#070807]/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              className="shrink-0 font-display text-lg font-bold tracking-tight text-[#ff5c2e]"
            >
              RIVET
            </Link>
            <span className="hidden truncate font-mono text-[11px] text-[#8d9488] sm:inline">
              Pump.fun strategy desk
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
              className="hidden border border-[#242824] px-3 py-1.5 text-xs text-[#8d9488] hover:border-[#ff5c2e] hover:text-[#ff5c2e] sm:inline"
            >
              Home
            </Link>
          </div>
        </div>
        <div className="border-t border-[#242824]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 font-mono text-[11px] sm:px-6">
            <span>
              <span className="text-[#8d9488]">Phase </span>
              <span className="font-semibold text-[#ff5c2e]">
                {PHASE_LABEL[phase]}
              </span>
            </span>
            <span className="text-[#ff5c2e]">{step.replace(/^NEXT:\s*/, "Next: ")}</span>
          </div>
        </div>
        {started && <Pipeline phase={state.phase} stats={state.stats} />}
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {!started ? (
          <Setup
            strategy={strategy}
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
  onStyle,
  onBudget,
  onMaxPer,
  onMaxPos,
  onAsk,
  onStart,
}: {
  strategy: Strategy;
  onStyle: (s: StrategyStyle) => void;
  onBudget: (n: number) => void;
  onMaxPer: (n: number) => void;
  onMaxPos: (n: number) => void;
  onAsk: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Configure the desk
        </h1>
        <p className="mt-2 max-w-md text-sm text-[#8d9488]">
          Pick a Pump.fun style, set capital limits, then run. Simulated market
          — no wallet.
        </p>

        <div className="mt-8">
          <Label>Style</Label>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {(Object.keys(STYLE_META) as StrategyStyle[]).map((style) => {
              const active = strategy.style === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onStyle(style)}
                  className={cn(
                    "border px-3 py-3 text-left transition-colors",
                    active
                      ? "border-[#ff5c2e] bg-[#ff5c2e]/10 text-[#e9ece6]"
                      : "border-[#242824] text-[#8d9488] hover:border-[#ff5c2e]/50 hover:text-[#e9ece6]",
                  )}
                >
                  <div className="font-display text-sm font-semibold text-[#e9ece6]">
                    {STYLE_META[style].label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug">
                    {STYLE_META[style].summary}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <NumberField
            label="Budget (SOL)"
            value={strategy.budgetSol}
            min={2}
            max={25}
            step={0.5}
            onChange={onBudget}
          />
          <NumberField
            label="Max per coin (SOL)"
            value={strategy.maxPerCoinSol}
            min={0.3}
            max={5}
            step={0.1}
            onChange={onMaxPer}
          />
          <NumberField
            label="Max open positions"
            value={strategy.maxPositions}
            min={1}
            max={6}
            step={1}
            onChange={(n) => onMaxPos(Math.round(n))}
          />
        </div>

        <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 border border-[#242824] bg-[#101210] px-4 py-3">
          <span>
            <span className="block text-sm font-medium">Ask before each buy</span>
            <span className="mt-0.5 block text-[11px] text-[#8d9488]">
              Enter approves · Esc skips when live
            </span>
          </span>
          <input
            type="checkbox"
            checked={strategy.askBeforeBuy}
            onChange={(e) => onAsk(e.target.checked)}
            className="size-4 accent-[#ff5c2e]"
          />
        </label>
      </div>

      <aside className="flex flex-col border border-[#242824] bg-[#101210]">
        <div className="border-b border-[#242824] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff5c2e]">
          Plan preview
        </div>
        <div className="flex flex-1 flex-col gap-5 p-4">
          <p className="text-sm leading-relaxed text-[#e9ece6]">
            {strategyLine(strategy)}
          </p>
          <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
            <Meta k="Take profit" v={`+${strategy.exit.takeProfitPct}%`} />
            <Meta k="Partial" v={`${strategy.exit.partialSellPct}%`} />
            <Meta k="Stop" v={`−${strategy.exit.stopLossPct}%`} />
            <Meta k="Trail" v={`${strategy.exit.trailingStopPct}%`} />
          </dl>
          <button
            type="button"
            data-testid="start-desk"
            onClick={onStart}
            className="mt-auto w-full bg-[#ff5c2e] px-4 py-3.5 text-left text-sm font-semibold text-[#070807] hover:bg-[#ff734d]"
          >
            Run desk →
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
      {state.pending && (
        <div className="grid gap-0 border border-[#ff5c2e] bg-[#101210] sm:grid-cols-[1fr_auto]">
          <div className="p-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff5c2e]">
              Approval needed
            </div>
            <div className="mt-1 font-display text-xl font-semibold">
              Buy ${state.pending.token.ticker} ·{" "}
              {formatSol(state.pending.sizeSol)}
            </div>
            <p className="mt-1 text-xs text-[#8d9488]">
              {state.pending.reason} · liq {state.pending.token.liquiditySol}{" "}
              SOL · top {state.pending.token.topHolderPct}%
            </p>
          </div>
          <div className="flex sm:flex-col">
            <button
              type="button"
              onClick={onApprove}
              className="flex-1 bg-[#ff5c2e] px-5 py-3 text-sm font-semibold text-[#070807] sm:min-w-[140px]"
            >
              Approve ↵
            </button>
            <button
              type="button"
              onClick={onReject}
              className="flex-1 border-t border-[#ff5c2e] px-5 py-3 text-sm text-[#e9ece6] sm:border-t-0 sm:border-l"
            >
              Skip Esc
            </button>
          </div>
        </div>
      )}

      {state.lastError && !state.pending && (
        <div className="border border-[#ff5c2e]/60 bg-[#101210] px-4 py-3 text-sm text-[#ff5c2e]">
          <span className="font-semibold">Blocked — </span>
          {state.lastError}. Raise limits or wait for exits.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.9fr)]">
        <section className="flex min-h-[440px] flex-col border border-[#242824] bg-[#101210] lg:min-h-[540px]">
          <div className="flex items-center justify-between border-b border-[#242824] px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff5c2e]">
              Decision tape
            </span>
            <span className="font-mono text-[10px] text-[#8d9488]">
              {state.events.length} lines
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {state.events.length === 0 ? (
              <Empty
                title="Tape is quiet"
                body="Scout starts writing as soon as the desk is running."
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
            <div className="grid grid-cols-2 gap-px bg-[#242824]">
              <Stat label="Left" value={formatSol(budgetLeft)} />
              <Stat label="In play" value={formatSol(state.spentSol)} />
              <Stat label="Open" value={String(state.positions.length)} />
              <Stat label="Watching" value={String(state.watched.length)} />
            </div>
          </Panel>

          <Panel title="Positions">
            {state.positions.length === 0 ? (
              <Empty compact title="No positions" body="Fills appear after Desk buys." />
            ) : (
              <ul>
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-3 border-b border-[#242824] px-4 py-3 last:border-0"
                  >
                    <div>
                      <div className="font-display text-sm font-semibold">
                        ${p.ticker}
                      </div>
                      <div className="font-mono text-[10px] text-[#8d9488]">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        p.pnlPct < 0 ? "text-[#ff5c2e]" : "text-[#b6f34d]",
                      )}
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Market" className="min-h-0 flex-1">
            {state.tokens.length === 0 ? (
              <Empty compact title="Loading market" body="Waiting on first Scout scan…" />
            ) : (
              <>
                <ul className="max-h-48 overflow-y-auto">
                  {state.tokens.slice(0, 10).map((t) => (
                    <li
                      key={t.id}
                      className="flex justify-between gap-2 border-b border-[#242824] px-4 py-2 font-mono text-[11px] last:border-0"
                    >
                      <span className="font-semibold">
                        ${t.ticker}
                        {state.watched.includes(t.id) ? (
                          <span className="text-[#ff5c2e]"> *</span>
                        ) : null}
                      </span>
                      <span className="text-[#8d9488]">
                        {t.velocity.toFixed(2)}× · {t.liquiditySol}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-[#242824] px-4 py-2 font-mono text-[10px] text-[#8d9488]">
                  * on Watch · age≤{strategy.filters.maxAgeMinutes}m liq≥
                  {strategy.filters.minLiquiditySol} top≤
                  {strategy.filters.maxTopHolderPct}% vel≥
                  {strategy.filters.minVelocity.toFixed(1)}×
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
    { id: "scouting", label: "Scout" },
    { id: "watching", label: "Watch" },
    { id: "awaiting_approval", label: "Approve" },
    { id: "managing", label: "Desk" },
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
    <div className="border-t border-[#242824]">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row sm:items-stretch">
        <div className="grid flex-1 grid-cols-4">
          {stages.map((s, i) => {
            const on = active === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "px-2 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]",
                  i > 0 && "border-l border-[#242824]",
                  on ? "bg-[#ff5c2e] text-[#070807]" : "text-[#8d9488]",
                )}
              >
                {s.label}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 border-t border-[#242824] px-4 py-2 font-mono text-[10px] text-[#8d9488] sm:border-l sm:border-t-0">
          <span>
            S<span className="text-[#e9ece6]">{stats.scanned}</span>
          </span>
          <span>
            K<span className="text-[#e9ece6]">{stats.skipped}</span>
          </span>
          <span>
            P<span className="text-[#e9ece6]">{stats.passed}</span>
          </span>
          <span>
            B<span className="text-[#e9ece6]">{stats.bought}</span>
          </span>
          <span>
            X<span className="text-[#e9ece6]">{stats.sold}</span>
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
  const ticker = event.ticker ? `$${event.ticker}` : event.title;

  return (
    <li className="grid grid-cols-[52px_58px_44px_minmax(0,1fr)] gap-x-2 border-b border-[#242824] px-4 py-2.5 font-mono text-[11px] leading-snug sm:grid-cols-[64px_68px_52px_minmax(0,1fr)] sm:text-xs">
      <span className="tabular-nums text-[#8d9488]">{formatTime(event.at)}</span>
      <span className="font-semibold text-[#ff5c2e]">
        {event.specialist.toUpperCase().slice(0, 6)}
      </span>
      <span className={cn("font-semibold", hot ? "text-[#ff5c2e]" : "text-[#e9ece6]")}>
        {KIND_PREFIX[event.kind]}
      </span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#e9ece6]">{ticker}</div>
        <div className="truncate text-[10px] text-[#8d9488] sm:text-[11px]">
          {event.detail}
        </div>
      </div>
    </li>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("flex flex-col border border-[#242824] bg-[#101210]", className)}
    >
      <div className="border-b border-[#242824] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff5c2e]">
        {title}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#101210] px-4 py-3">
      <div className="font-mono text-[10px] text-[#8d9488]">{label}</div>
      <div className="mt-0.5 font-display text-sm font-semibold tabular-nums">
        {value}
      </div>
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
    <div className={cn("px-4", compact ? "py-8" : "flex min-h-[180px] flex-col justify-center py-12")}>
      <div className="font-display text-sm font-semibold text-[#e9ece6]">
        {title}
      </div>
      <p className="mt-1 max-w-[28ch] text-xs leading-relaxed text-[#8d9488]">
        {body}
      </p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#ff5c2e]">
      {children}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#242824] pb-2">
      <dt className="text-[#8d9488]">{k}</dt>
      <dd className="font-semibold tabular-nums text-[#e9ece6]">{v}</dd>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="mt-1.5 w-full border border-[#242824] bg-[#070807] px-3 py-3 font-mono text-base font-semibold tabular-nums text-[#e9ece6] outline-none focus:border-[#ff5c2e]"
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
      className="border border-[#242824] px-3 py-1.5 text-xs text-[#e9ece6] hover:border-[#ff5c2e] hover:text-[#ff5c2e]"
    >
      {children}
    </button>
  );
}
