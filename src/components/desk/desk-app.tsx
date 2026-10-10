"use client";

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
  idle: "IDLE",
  paused: "PAUSED",
  scouting: "SCOUT",
  watching: "WATCH",
  awaiting_approval: "APPROVE",
  managing: "DESK",
  blocked: "BLOCKED",
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
    <div className="flex min-h-[100svh] flex-col bg-[#0a0a0a] text-[#e0e0e0]">
      {/* Terminal chrome */}
      <header className="shrink-0 border-b-[3px] border-[#ff3300]">
        <div className="flex items-stretch">
          <div className="flex items-center border-r-[3px] border-[#ff3300] bg-[#ff3300] px-3 py-2 sm:px-4">
            <span className="text-base font-bold tracking-tight text-[#0a0a0a] sm:text-lg">
              CLEAT
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2 sm:px-4">
            <p className="truncate text-[11px] leading-tight text-[#e0e0e0] sm:text-xs">
              Scout filters coins · Watch waits for entries · Desk buys and
              exits within your rules
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px]">
              <span>
                <span className="text-[#777777]">PHASE </span>
                <span className="font-bold text-[#ff3300]">
                  {PHASE_LABEL[phase]}
                </span>
                {state.running ? (
                  <span className="blink text-[#ff3300]"> █</span>
                ) : null}
              </span>
              <span className="hidden text-[#2a2a2a] sm:inline">|</span>
              <span className="font-bold text-[#ff3300]">{step}</span>
            </div>
          </div>
          {started && (
            <div className="flex shrink-0 items-stretch border-l-[3px] border-[#ff3300]">
              <ChromeBtn onClick={toggleRunning}>
                {state.running ? "PAUSE" : "RESUME"}
              </ChromeBtn>
              <ChromeBtn onClick={resetDesk} edge>
                RESET
              </ChromeBtn>
            </div>
          )}
        </div>
        {started && (
          <Pipeline phase={state.phase} stats={state.stats} />
        )}
      </header>

      <main className="flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
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
    <div className="mx-auto grid max-w-5xl gap-0 lg:grid-cols-[1.35fr_0.9fr] lg:border-[3px] lg:border-[#ff3300]">
      {/* Left: controls */}
      <div className="space-y-0 border-[3px] border-[#ff3300] lg:border-0 lg:border-r-[3px]">
        <SectionHead>01 CONFIG</SectionHead>
        <div className="space-y-4 p-3 sm:p-4">
          <p className="text-[11px] text-[#777777]">
            Set style and capital limits. Simulated market — no wallet.
          </p>

          <div>
            <Label>STYLE</Label>
            <div className="mt-1.5 grid gap-0 sm:grid-cols-3">
              {(Object.keys(STYLE_META) as StrategyStyle[]).map((style, i) => {
                const active = strategy.style === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => onStyle(style)}
                    className={cn(
                      "border-[3px] border-[#ff3300] px-2.5 py-3 text-left",
                      i > 0 && "sm:-ml-[3px]",
                      active
                        ? "relative z-[1] bg-[#ff3300] text-[#0a0a0a]"
                        : "bg-[#0a0a0a] text-[#e0e0e0] hover:bg-[#0f0f0f]",
                    )}
                  >
                    <div className="text-sm font-bold">
                      {STYLE_META[style].label}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[10px] leading-snug",
                        active ? "text-[#0a0a0a]/75" : "text-[#777777]",
                      )}
                    >
                      {STYLE_META[style].summary}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <NumberField
            label="BUDGET SOL"
            value={strategy.budgetSol}
            min={2}
            max={25}
            step={0.5}
            onChange={onBudget}
          />
          <NumberField
            label="MAX PER COIN SOL"
            value={strategy.maxPerCoinSol}
            min={0.3}
            max={5}
            step={0.1}
            onChange={onMaxPer}
          />
          <NumberField
            label="MAX OPEN POSITIONS"
            value={strategy.maxPositions}
            min={1}
            max={6}
            step={1}
            onChange={(n) => onMaxPos(Math.round(n))}
          />

          <label className="flex cursor-pointer items-center justify-between gap-3 border-[3px] border-[#ff3300] bg-[#0f0f0f] px-3 py-3">
            <span>
              <span className="block text-xs font-bold">ASK BEFORE BUY</span>
              <span className="mt-0.5 block text-[10px] text-[#777777]">
                Enter = approve · Esc = skip
              </span>
            </span>
            <input
              type="checkbox"
              checked={strategy.askBeforeBuy}
              onChange={(e) => onAsk(e.target.checked)}
              className="size-5 shrink-0 accent-[#ff3300]"
            />
          </label>
        </div>
      </div>

      {/* Right: rules + run — asymmetric sticky feel */}
      <div className="mt-3 flex flex-col border-[3px] border-[#ff3300] lg:mt-0 lg:border-0">
        <SectionHead>02 RULES</SectionHead>
        <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
          <p className="text-xs leading-relaxed text-[#e0e0e0]">
            {strategyLine(strategy)}
          </p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t-[3px] border-[#2a2a2a] pt-3 text-[11px]">
            <Meta k="TP" v={`+${strategy.exit.takeProfitPct}%`} />
            <Meta k="PARTIAL" v={`${strategy.exit.partialSellPct}%`} />
            <Meta k="STOP" v={`−${strategy.exit.stopLossPct}%`} />
            <Meta k="TRAIL" v={`${strategy.exit.trailingStopPct}%`} />
            <Meta k="AGE" v={`≤${strategy.filters.maxAgeMinutes}m`} />
            <Meta k="LIQ" v={`≥${strategy.filters.minLiquiditySol}`} />
            <Meta k="TOP" v={`≤${strategy.filters.maxTopHolderPct}%`} />
            <Meta k="VEL" v={`≥${strategy.filters.minVelocity.toFixed(1)}×`} />
          </dl>
          <div className="mt-auto pt-2">
            <button
              type="button"
              data-testid="start-desk"
              onClick={onStart}
              className="w-full border-[3px] border-[#ff3300] bg-[#ff3300] px-4 py-4 text-left text-sm font-bold text-[#0a0a0a] hover:brightness-110"
            >
              RUN DESK →
            </button>
            <p className="mt-2 text-[10px] text-[#777777]">
              Starts Scout on a simulated Solana tape.
            </p>
          </div>
        </div>
      </div>
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
    <div className="mx-auto flex max-w-6xl flex-col gap-3">
      {state.pending && (
        <div className="grid gap-0 border-[3px] border-[#ff3300] bg-[#0f0f0f] sm:grid-cols-[1fr_auto]">
          <div className="p-3 sm:p-4">
            <div className="text-[10px] font-bold tracking-wider text-[#ff3300]">
              {"// APPROVAL REQUIRED"}
            </div>
            <div className="mt-1 text-lg font-bold leading-none sm:text-xl">
              BUY ${state.pending.token.ticker}
            </div>
            <div className="mt-1.5 text-xs text-[#777777]">
              {formatSol(state.pending.sizeSol)} · {state.pending.reason} · liq{" "}
              {state.pending.token.liquiditySol} · top{" "}
              {state.pending.token.topHolderPct}%
            </div>
          </div>
          <div className="flex sm:flex-col">
            <button
              type="button"
              onClick={onApprove}
              className="flex-1 border-t-[3px] border-[#ff3300] bg-[#ff3300] px-5 py-3 text-sm font-bold text-[#0a0a0a] sm:border-t-0 sm:border-l-[3px]"
            >
              APPROVE ↵
            </button>
            <button
              type="button"
              onClick={onReject}
              className="flex-1 border-t-[3px] border-l-[3px] border-[#ff3300] bg-[#0a0a0a] px-5 py-3 text-sm text-[#e0e0e0] sm:border-t-[3px] sm:border-l-[3px]"
            >
              SKIP ESC
            </button>
          </div>
        </div>
      )}

      {state.lastError && !state.pending && (
        <div className="border-[3px] border-[#ff3300] bg-[#0f0f0f] px-3 py-2.5 text-xs text-[#ff3300]">
          <span className="font-bold">ERR </span>
          {state.lastError}. Raise budget / max positions, or wait for Desk
          exits.
        </div>
      )}

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.85fr)]">
        {/* Tape — primary surface */}
        <section className="flex min-h-[420px] flex-col border-[3px] border-[#ff3300] bg-[#0f0f0f] lg:min-h-[560px]">
          <div className="flex items-center justify-between border-b-[3px] border-[#ff3300] px-3 py-2">
            <span className="text-[11px] font-bold tracking-wider text-[#ff3300]">
              DECISION TAPE
            </span>
            <span className="text-[10px] text-[#777777]">
              {state.events.length} lines · newest first
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {state.events.length === 0 ? (
              <EmptyState
                title="TAPE EMPTY"
                body="Scout writes here as soon as the desk is running."
              />
            ) : (
              state.events.map((event) => (
                <TapeLine key={event.id} event={event} />
              ))
            )}
          </ul>
        </section>

        {/* Right rail — stacked utility */}
        <aside className="flex flex-col gap-3">
          <Panel title="CAPITAL" compact>
            <div className="grid grid-cols-2 gap-px bg-[#2a2a2a]">
              <StatCell label="LEFT" value={formatSol(budgetLeft)} />
              <StatCell label="IN PLAY" value={formatSol(state.spentSol)} />
              <StatCell label="OPEN" value={String(state.positions.length)} />
              <StatCell label="WATCH" value={String(state.watched.length)} />
            </div>
          </Panel>

          <Panel title="POSITIONS">
            {state.positions.length === 0 ? (
              <EmptyState
                compact
                title="NO POSITIONS"
                body="Fills land here after Desk buys."
              />
            ) : (
              <ul>
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-2 border-b border-[#2a2a2a] px-3 py-2.5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        ${p.ticker}
                      </div>
                      <div className="text-[10px] text-[#777777]">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={cn(
                        "shrink-0 text-sm font-bold tabular-nums",
                        p.pnlPct < 0 ? "text-[#ff3300]" : "text-[#e0e0e0]",
                      )}
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="MARKET" className="min-h-0 flex-1">
            {state.tokens.length === 0 ? (
              <EmptyState
                compact
                title="LOADING TAPE"
                body="Waiting on first Scout scan…"
              />
            ) : (
              <>
                <ul className="max-h-52 overflow-y-auto lg:max-h-none">
                  {state.tokens.slice(0, 10).map((t) => {
                    const watching = state.watched.includes(t.id);
                    return (
                      <li
                        key={t.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-[#2a2a2a] px-3 py-1.5 text-[11px] last:border-b-0"
                      >
                        <span className="truncate font-bold">
                          ${t.ticker}
                          {watching ? (
                            <span className="text-[#ff3300]"> *</span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-[#777777]">
                          {t.velocity.toFixed(2)}× · {t.liquiditySol}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="border-t border-[#2a2a2a] px-3 py-2 text-[10px] leading-snug text-[#777777]">
                  * Watch · age≤{strategy.filters.maxAgeMinutes}m liq≥
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
  const stages: { id: Phase; label: string; short: string }[] = [
    { id: "scouting", label: "SCOUT", short: "01" },
    { id: "watching", label: "WATCH", short: "02" },
    { id: "awaiting_approval", label: "APPROVE", short: "03" },
    { id: "managing", label: "DESK", short: "04" },
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
    <div className="flex flex-col border-t-[3px] border-[#ff3300] sm:flex-row">
      <div className="grid flex-1 grid-cols-4">
        {stages.map((s, i) => {
          const on = active === s.id;
          return (
            <div
              key={s.id}
              className={cn(
                "border-[#ff3300] px-1.5 py-1.5 text-center sm:px-2",
                i > 0 && "border-l-[3px]",
                on ? "bg-[#ff3300] text-[#0a0a0a]" : "bg-[#0a0a0a] text-[#777777]",
              )}
            >
              <div className="text-[9px] leading-none opacity-70 sm:text-[10px]">
                {s.short}
              </div>
              <div className="mt-0.5 text-[10px] font-bold leading-none sm:text-xs">
                {s.label}
                {on ? " ◄" : ""}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t-[3px] border-[#ff3300] px-3 py-1.5 text-[10px] text-[#777777] sm:border-t-0 sm:border-l-[3px]">
        <span>
          S<span className="text-[#e0e0e0]">{stats.scanned}</span>
        </span>
        <span>
          K<span className="text-[#e0e0e0]">{stats.skipped}</span>
        </span>
        <span>
          P<span className="text-[#e0e0e0]">{stats.passed}</span>
        </span>
        <span>
          B<span className="text-[#e0e0e0]">{stats.bought}</span>
        </span>
        <span>
          X<span className="text-[#e0e0e0]">{stats.sold}</span>
        </span>
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
  const ticker =
    event.ticker != null
      ? `$${event.ticker}`
      : event.title.replace(
          /^(SCAN|SKIP|PASS → WATCH|WATCH|ENTRY READY|ENTRY|BUY|STOP|TRAIL|TP|BLOCKED|SKIPPED BUY|DESK ONLINE)\s*/,
          "",
        );

  return (
    <li className="grid grid-cols-[52px_64px_44px_minmax(0,1fr)] gap-x-2 border-b border-[#2a2a2a] px-3 py-2 text-[11px] leading-snug sm:grid-cols-[64px_72px_52px_minmax(0,1fr)] sm:text-xs">
      <span className="tabular-nums text-[#777777]">{formatTime(event.at)}</span>
      <span className="font-bold text-[#ff3300]">
        {event.specialist.toUpperCase().slice(0, 6)}
      </span>
      <span className={cn("font-bold", hot ? "text-[#ff3300]" : "text-[#e0e0e0]")}>
        {KIND_PREFIX[event.kind]}
      </span>
      <div className="min-w-0">
        <div className="truncate font-bold">{ticker}</div>
        <div className="truncate text-[10px] text-[#777777] sm:text-[11px]">
          {event.detail}
        </div>
      </div>
    </li>
  );
}

function Panel({
  title,
  children,
  compact,
  className,
}: {
  title: string;
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col border-[3px] border-[#ff3300] bg-[#0f0f0f]",
        className,
      )}
    >
      <div className="border-b-[3px] border-[#ff3300] px-3 py-2 text-[11px] font-bold tracking-wider text-[#ff3300]">
        {title}
      </div>
      <div className={cn(compact ? "" : "min-h-0 flex-1")}>{children}</div>
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0f0f0f] px-3 py-2.5">
      <div className="text-[9px] tracking-wider text-[#777777]">{label}</div>
      <div className="mt-0.5 text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  compact,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-center px-3",
        compact ? "py-6" : "min-h-[200px] py-10",
      )}
    >
      <div className="text-[10px] text-[#ff3300]">┌─ {title} ─┐</div>
      <p className="mt-2 max-w-[28ch] text-[11px] leading-relaxed text-[#777777]">
        {body}
      </p>
      <div className="mt-2 text-[10px] text-[#ff3300]">└──────────┘</div>
    </div>
  );
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="border-b-[3px] border-[#ff3300] bg-[#0f0f0f] px-3 py-2 text-[11px] font-bold tracking-wider text-[#ff3300]">
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-wider text-[#ff3300]">
      {children}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#2a2a2a] pb-1">
      <dt className="text-[#777777]">{k}</dt>
      <dd className="font-bold tabular-nums">{v}</dd>
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
        className="mt-1.5 w-full border-[3px] border-[#ff3300] bg-[#0a0a0a] px-3 py-3 text-base font-bold tabular-nums text-[#e0e0e0] outline-none focus:bg-[#0f0f0f]"
      />
    </label>
  );
}

function ChromeBtn({
  children,
  onClick,
  edge,
}: {
  children: ReactNode;
  onClick: () => void;
  edge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-[#ff3300] bg-[#0a0a0a] px-3 py-2 text-[10px] font-bold text-[#e0e0e0] hover:bg-[#0f0f0f] sm:px-4 sm:text-xs",
        !edge && "border-r-[3px]",
      )}
    >
      {children}
    </button>
  );
}
