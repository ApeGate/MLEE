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
  awaiting_approval: "APPROVAL",
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
  note: "NOTE",
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
  const step = nextStepLabel(
    started ? state : { ...state, phase: "idle" },
  );

  return (
    <div className="min-h-[100svh] bg-[#0a0a0a] text-[#e0e0e0]">
      <header className="border-b-[3px] border-[#ff3300] px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-lg font-bold text-[#ff3300]">RELAY</span>
            <span className="text-xs text-[#888888] sm:text-sm">
              runs a Solana strategy: Scout filters coins, Watch waits for
              entries, Desk buys and exits within your rules.
            </span>
          </div>
          {started && (
            <div className="flex gap-2">
              <ActionButton onClick={toggleRunning}>
                {state.running ? "PAUSE" : "RESUME"}
              </ActionButton>
              <ActionButton onClick={resetDesk}>RESET</ActionButton>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span>
            PHASE{" "}
            <span className="text-[#ff3300]">
              {started ? PHASE_LABEL[state.phase] : "IDLE"}
            </span>
            {state.running && <span className="blink text-[#ff3300]"> █</span>}
          </span>
          <span className="text-[#ff3300]">{step}</span>
        </div>
      </header>

      <main className="px-3 py-4 sm:px-4">
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
    <div className="mx-auto max-w-3xl space-y-5">
      <p className="text-sm text-[#888888]">
        Configure rules, then RUN. Simulated market — no wallet.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-xs text-[#ff3300]">STYLE</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(STYLE_META) as StrategyStyle[]).map((style) => {
            const active = strategy.style === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => onStyle(style)}
                className={cn(
                  "border-[3px] px-3 py-3 text-left text-sm",
                  active
                    ? "border-[#ff3300] bg-[#ff3300] text-[#0a0a0a]"
                    : "border-[#333333] bg-[#111111] text-[#e0e0e0] hover:border-[#ff3300]",
                )}
              >
                <div className="font-bold">{STYLE_META[style].label}</div>
                <div
                  className={cn(
                    "mt-1 text-xs",
                    active ? "text-[#0a0a0a]/80" : "text-[#888888]",
                  )}
                >
                  {STYLE_META[style].summary}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <NumberField
        label="BUDGET (SOL)"
        value={strategy.budgetSol}
        min={2}
        max={25}
        step={0.5}
        onChange={onBudget}
      />
      <NumberField
        label="MAX PER COIN (SOL)"
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

      <label className="flex cursor-pointer items-center justify-between gap-4 border-[3px] border-[#ff3300] bg-[#111111] px-3 py-3">
        <span className="text-sm">
          ASK BEFORE EACH BUY
          <span className="mt-1 block text-xs text-[#888888]">
            Desk pauses for APPROVE / SKIP (Enter / Esc when live)
          </span>
        </span>
        <input
          type="checkbox"
          checked={strategy.askBeforeBuy}
          onChange={(e) => onAsk(e.target.checked)}
          className="size-5 accent-[#ff3300]"
        />
      </label>

      <div className="border-[3px] border-[#333333] bg-[#111111] px-3 py-3 text-xs leading-relaxed text-[#888888]">
        <span className="text-[#ff3300]">RULES </span>
        {strategyLine(strategy)}
      </div>

      <button
        type="button"
        data-testid="start-desk"
        onClick={onStart}
        className="w-full border-[3px] border-[#ff3300] bg-[#ff3300] px-4 py-4 text-left text-base font-bold text-[#0a0a0a] hover:bg-[#ff5522]"
      >
        RUN DESK →
      </button>
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
    <div className="mx-auto max-w-6xl space-y-4">
      <Pipeline phase={state.phase} />

      {state.pending && (
        <div className="border-[3px] border-[#ff3300] bg-[#111111] px-3 py-4">
          <div className="text-xs text-[#ff3300]">APPROVAL NEEDED</div>
          <div className="mt-1 text-base font-bold">
            BUY ${state.pending.token.ticker} ·{" "}
            {formatSol(state.pending.sizeSol)}
          </div>
          <div className="mt-1 text-xs text-[#888888]">
            {state.pending.reason} · liq{" "}
            {state.pending.token.liquiditySol} SOL · top{" "}
            {state.pending.token.topHolderPct}%
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="border-[3px] border-[#ff3300] bg-[#ff3300] px-4 py-2 text-sm font-bold text-[#0a0a0a]"
            >
              APPROVE [Enter]
            </button>
            <button
              type="button"
              onClick={onReject}
              className="border-[3px] border-[#ff3300] bg-[#0a0a0a] px-4 py-2 text-sm text-[#e0e0e0]"
            >
              SKIP [Esc]
            </button>
          </div>
        </div>
      )}

      {state.lastError && !state.pending && (
        <div className="border-[3px] border-[#ff3300] px-3 py-2 text-sm text-[#ff3300]">
          BLOCKED: {state.lastError}. Raise budget/positions or wait for sells.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="border-[3px] border-[#ff3300] bg-[#111111]">
          <div className="border-b-[3px] border-[#ff3300] px-3 py-2 text-xs text-[#ff3300]">
            DECISION TAPE
          </div>
          <ul className="max-h-[560px] overflow-y-auto">
            {state.events.length === 0 && (
              <li className="px-3 py-8 text-sm text-[#888888]">
                Empty. Scout emits lines when the desk is running.
              </li>
            )}
            {state.events.map((event) => (
              <TapeLine key={event.id} event={event} />
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <Panel title="CAPITAL">
            <Row k="budget left" v={formatSol(budgetLeft)} />
            <Row k="in play" v={formatSol(state.spentSol)} />
            <Row k="open" v={String(state.positions.length)} />
            <Row k="watching" v={String(state.watched.length)} />
            <Row
              k="counts"
              v={`S${state.stats.scanned} K${state.stats.skipped} P${state.stats.passed} B${state.stats.bought} X${state.stats.sold}`}
            />
          </Panel>

          <Panel title="POSITIONS">
            {state.positions.length === 0 ? (
              <p className="text-sm text-[#888888]">
                None open. Buys appear here after Desk fills.
              </p>
            ) : (
              <ul className="space-y-2">
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-2 border-b border-[#333333] pb-2 text-sm"
                  >
                    <div>
                      <div className="font-bold">${p.ticker}</div>
                      <div className="text-xs text-[#888888]">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={
                        p.pnlPct >= 0 ? "text-[#e0e0e0]" : "text-[#ff3300]"
                      }
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="MARKET">
            {state.tokens.length === 0 ? (
              <p className="text-sm text-[#888888]">Loading tape…</p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                {state.tokens.slice(0, 10).map((t) => {
                  const watching = state.watched.includes(t.id);
                  return (
                    <li
                      key={t.id}
                      className="flex justify-between gap-2 border-b border-[#222222] py-1"
                    >
                      <span>
                        ${t.ticker}
                        {watching ? (
                          <span className="text-[#ff3300]"> *</span>
                        ) : null}
                      </span>
                      <span className="text-[#888888]">
                        {t.liquiditySol} · top {t.topHolderPct}% ·{" "}
                        {t.velocity.toFixed(2)}×
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-2 text-[10px] text-[#888888]">
              * = on Watch · filters: age≤{strategy.filters.maxAgeMinutes}m
              liq≥{strategy.filters.minLiquiditySol} top≤
              {strategy.filters.maxTopHolderPct}% vel≥
              {strategy.filters.minVelocity.toFixed(1)}×
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Pipeline({ phase }: { phase: Phase }) {
  const stages: { id: Phase | "scout" | "watch" | "desk"; label: string }[] = [
    { id: "scouting", label: "1 SCOUT" },
    { id: "watching", label: "2 WATCH" },
    { id: "awaiting_approval", label: "3 APPROVE" },
    { id: "managing", label: "4 DESK" },
  ];
  const active =
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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stages.map((s) => {
        const on = active === s.id;
        return (
          <div
            key={s.label}
            className={cn(
              "border-[3px] px-2 py-2 text-center text-xs font-bold",
              on
                ? "border-[#ff3300] bg-[#ff3300] text-[#0a0a0a]"
                : "border-[#333333] text-[#888888]",
            )}
          >
            {s.label}
            {on ? " ◄" : ""}
          </div>
        );
      })}
    </div>
  );
}

function TapeLine({ event }: { event: DeskEvent }) {
  const accent =
    event.kind === "buy" ||
    event.kind === "pass" ||
    event.kind === "pending" ||
    event.kind === "error";
  return (
    <li className="border-b border-[#222222] px-3 py-2 text-xs leading-snug sm:text-sm">
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <span className="text-[#888888]">{formatTime(event.at)}</span>
        <span className="font-bold text-[#ff3300]">
          [{event.specialist.toUpperCase()}]
        </span>
        <span className={accent ? "text-[#ff3300]" : "text-[#e0e0e0]"}>
          {KIND_PREFIX[event.kind]}
        </span>
        <span className="font-bold">{event.title.replace(/^(SCAN|SKIP|PASS → WATCH|WATCH|ENTRY READY|ENTRY|BUY|STOP|TRAIL|TP|BLOCKED|SKIPPED BUY|DESK ONLINE)\s*/, "")}</span>
      </div>
      <div className="mt-0.5 text-[#888888]">{event.detail}</div>
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
    <section className="border-[3px] border-[#ff3300] bg-[#111111]">
      <div className="border-b-[3px] border-[#ff3300] px-3 py-2 text-xs text-[#ff3300]">
        {title}
      </div>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#222222] py-1 text-sm">
      <span className="text-[#888888]">{k}</span>
      <span>{v}</span>
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
    <label className="block space-y-1">
      <span className="text-xs text-[#ff3300]">{label}</span>
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
        className="w-full border-[3px] border-[#ff3300] bg-[#0a0a0a] px-3 py-3 text-base text-[#e0e0e0] outline-none focus:bg-[#111111]"
      />
    </label>
  );
}

function ActionButton({
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
      className="border-[3px] border-[#ff3300] bg-[#0a0a0a] px-3 py-1 text-xs text-[#e0e0e0] hover:bg-[#111111]"
    >
      {children}
    </button>
  );
}
