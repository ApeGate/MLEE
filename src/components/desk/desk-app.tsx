"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  startTransition,
  type ReactNode,
} from "react";
import {
  Binoculars,
  Crosshair,
  Home,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
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
  idle: "Crew briefing",
  paused: "Crew paused",
  scouting: "Kong is scanning",
  watching: "Cheeta is stalking",
  awaiting_approval: "Caesar wants your call",
  managing: "Cornelius guards the bag",
  blocked: "Cornelius closed the gate",
};

const WHO_LABEL: Record<DeskEvent["specialist"], string> = {
  scout: "Kong · Scout",
  watch: "Cheeta · Watch",
  desk: "Caesar · Trade",
  system: "Cornelius · Risk",
};

const KIND_LABEL: Record<DeskEvent["kind"], string> = {
  scan: "Checks",
  skip: "Blocks",
  pass: "Passes",
  watching: "Stalks",
  entry: "Calls",
  pending: "Pitches",
  buy: "Sends",
  sell: "Exits",
  note: "Notes",
  error: "Guards",
};

const CREW = [
  { name: "Kong", role: "Scout", icon: Search, color: "#ff7250" },
  { name: "Cheeta", role: "Watch", icon: Binoculars, color: "#ffb13c" },
  { name: "Caesar", role: "Trade", icon: Crosshair, color: "#c7ff45" },
  { name: "Cornelius", role: "Risk", icon: ShieldCheck, color: "#9ab7ff" },
] as const;

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
            title: "APEGATE OPEN",
            detail: `Cornelius armed the limits. ${strategyLine(strategy)}`,
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
      <header className="sticky top-0 z-30 border-b border-[#302a20] bg-[#090806]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label="Apegate home"
              className="flex shrink-0 items-center gap-2"
            >
              <Image
                src="/apegate-logo.jpg"
                alt=""
                width={34}
                height={34}
                priority
                className="size-[34px] rounded-lg border border-[#ff4f1f]/30 object-cover"
              />
              <span className="hidden text-sm font-extrabold tracking-[-0.03em] sm:inline">
                APEGATE
              </span>
            </Link>
            <span className="rounded-full border border-[#ff4f1f]/30 bg-[#1b110c] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#ff7250]">
              Sim only
            </span>
          </div>
          <div className="flex items-center gap-2">
            {started && (
              <>
                <GhostBtn onClick={toggleRunning}>
                  {state.running ? "Pause" : "Resume"}
                </GhostBtn>
                <button
                  type="button"
                  onClick={resetDesk}
                  aria-label="Reset simulation"
                  className="rounded-lg border border-[#302a20] p-2 text-[#91897e] hover:border-[#ff4f1f]/50 hover:text-[#f4efe5]"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </>
            )}
            <Link
              href="/"
              aria-label="Back to homepage"
              className="rounded-lg border border-[#302a20] p-2 text-[#91897e] hover:border-[#ff4f1f]/50 hover:text-[#f4efe5]"
            >
              <Home className="size-3.5" />
            </Link>
          </div>
        </div>
        <div className="border-t border-[#302a20]">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs">
              <span className="text-[#6f685f]">Gate status · </span>
              <span className="font-semibold text-[#ff7250]">
                {PHASE_LABEL[phase]}
              </span>
            </p>
            <p className="text-xs text-[#91897e]">{step}</p>
          </div>
        </div>
        {started && <Pipeline phase={state.phase} stats={state.stats} />}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
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
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#ff7250]">
          Crew briefing · 01
        </p>
        <h1 className="mt-2 text-4xl font-extrabold leading-none tracking-[-0.055em] sm:text-5xl">
          Set the gate.
          <br />
          <span className="text-stroke">Let the apes work.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#91897e]">
          Give the crew a play style and hard limits. This desk uses{" "}
          <strong className="font-semibold text-[#f4efe5]">simulated</strong>{" "}
          Pump.fun-style data — no wallet, no real buys, no live fills.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CREW.map((ape) => {
            const Icon = ape.icon;
            return (
              <div
                key={ape.name}
                className="ape-card flex items-center gap-2.5 rounded-xl border border-[#302a20] px-3 py-2.5"
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-current/10"
                  style={{ color: ape.color }}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{ape.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-[#6f685f]">
                    {ape.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-9">
          <Label>Pick the crew’s play style</Label>
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
                    "rounded-xl border px-3.5 py-3.5 text-left transition-all",
                    active
                      ? "border-[#ff4f1f] bg-[#ff4f1f]/10 shadow-[inset_0_0_0_1px_rgb(255_79_31_/_12%)]"
                      : "border-[#302a20] bg-[#12100c]/60 hover:border-[#ff4f1f]/40",
                  )}
                >
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="mt-0.5 text-xs text-[#ff7250]">{meta.plain}</div>
                  <div className="mt-2 text-[11px] leading-snug text-[#91897e]">
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

        <label className="mt-6 flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-[#302a20] bg-[#12100c]/70 px-4 py-3.5">
          <span>
            <span className="block text-sm font-semibold">Keep me at the gate</span>
            <span className="mt-1 block text-xs text-[#91897e]">
              Recommended. Caesar presents each setup; you approve or skip it
              (Enter / Esc).
            </span>
          </span>
          <input
            type="checkbox"
            checked={strategy.askBeforeBuy}
            onChange={(e) => onAsk(e.target.checked)}
            className="mt-1 size-4 accent-[#ff4f1f]"
          />
        </label>

        <div className="mt-4">
          <button
            type="button"
            onClick={onToggleExits}
            className="text-xs font-semibold text-[#ff7250] hover:underline"
          >
            {showExits ? "Hide Cornelius’s exit plan" : "Inspect Cornelius’s exit plan"}
          </button>
          {showExits && (
            <dl className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-[#302a20] bg-[#12100c]/50 p-4 font-mono text-xs">
              <Meta k="Take profit" v={`+${strategy.exit.takeProfitPct}%`} />
              <Meta k="Sell then" v={`${strategy.exit.partialSellPct}%`} />
              <Meta k="Stop loss" v={`−${strategy.exit.stopLossPct}%`} />
              <Meta k="Trail" v={`${strategy.exit.trailingStopPct}%`} />
            </dl>
          )}
        </div>
      </div>

      <aside className="ape-card flex h-fit flex-col overflow-hidden rounded-2xl border border-[#3a3328] lg:sticky lg:top-32">
        <div className="flex items-center gap-3 border-b border-[#302a20] px-5 py-4">
          <Image
            src="/apegate-logo.jpg"
            alt=""
            width={42}
            height={42}
            className="size-10 rounded-lg border border-[#ff4f1f]/30 object-cover"
          />
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-[#ff7250]">
              Gate check · 02
            </p>
            <h2 className="mt-0.5 text-lg font-bold">Crew orders</h2>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <p className="text-sm leading-relaxed text-[#ded7cb]">
            {strategyLine(strategy)}
          </p>
          <div className="space-y-2 rounded-xl border border-[#302a20] bg-[#0d0b09] p-3 text-xs text-[#91897e]">
            <p><strong className="text-[#ff7250]">Kong</strong> checks the field.</p>
            <p><strong className="text-[#ffb13c]">Cheeta</strong> waits for your entry.</p>
            <p><strong className="text-[#c7ff45]">Caesar</strong> brings you the trade.</p>
            <p><strong className="text-[#9ab7ff]">Cornelius</strong> guards every limit and exit.</p>
          </div>
          <button
            type="button"
            data-testid="start-desk"
            onClick={onStart}
            className="mt-auto w-full rounded-lg bg-[#ff4f1f] px-4 py-3.5 text-sm font-extrabold text-[#0b0906] transition-transform hover:-translate-y-0.5 hover:bg-[#ff6438]"
          >
            Open the simulated gate →
          </button>
          <p className="text-center text-[10px] text-[#6f685f]">
            Practice only · no wallet · no real funds
          </p>
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
      <div className="flex items-center gap-2 rounded-lg border border-[#ff4f1f]/30 bg-[#1b110c] px-4 py-2.5 text-xs text-[#ff8a64]">
        <span className="size-1.5 animate-pulse rounded-full bg-[#ff4f1f]" />
        Simulation running — market data, buys, and exits do not move real funds.
      </div>

      {state.pending && (
        <div className="overflow-hidden rounded-2xl border border-[#c7ff45]/60 bg-[#12100c] shadow-[0_0_40px_rgb(199_255_69_/_7%)]">
          <div className="grid sm:grid-cols-[1fr_auto]">
            <div className="p-5">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#c7ff45]">
                Caesar wants in · your call
              </p>
              <p className="mt-1 text-2xl font-bold">
                ${state.pending.token.ticker}{" "}
                <span className="text-lg font-semibold text-[#91897e]">
                  · {formatSol(state.pending.sizeSol)}
                </span>
              </p>
              <p className="mt-2 text-sm text-[#91897e]">
                {state.pending.reason}. Liquidity{" "}
                {state.pending.token.liquiditySol} SOL · top holders{" "}
                {state.pending.token.topHolderPct}%.
              </p>
              <p className="mt-2 text-xs text-[#9ab7ff]">
                Cornelius: within budget, position cap, and risk plan.
              </p>
            </div>
            <div className="flex sm:flex-col">
              <button
                type="button"
                onClick={onApprove}
                className="flex-1 bg-[#c7ff45] px-6 py-4 text-sm font-extrabold text-[#0b0906] transition-colors hover:bg-[#d4ff6d] sm:min-w-[154px]"
              >
                Let Caesar send ↵
              </button>
              <button
                type="button"
                onClick={onReject}
                className="flex-1 border-t border-[#302a20] px-6 py-4 text-sm font-semibold text-[#f4efe5] hover:bg-[#1b1711] sm:border-l sm:border-t-0"
              >
                Close gate Esc
              </button>
            </div>
          </div>
        </div>
      )}

      {state.lastError && !state.pending && (
        <div className="rounded-xl border border-[#ff655f]/50 bg-[#ff655f]/10 px-4 py-3 text-sm text-[#ff817c]">
          <span className="font-semibold">Cornelius blocked the buy — </span>
          {state.lastError}. Raise budget / max positions, or wait for an exit.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="ape-card flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#302a20] lg:min-h-[560px]">
          <div className="flex items-center justify-between border-b border-[#302a20] px-4 py-3.5">
            <div>
              <h2 className="text-sm font-bold">Crew decision tape</h2>
              <p className="text-[11px] text-[#91897e]">
                Who checked, watched, called, or blocked — newest first
              </p>
            </div>
            <span className="rounded-md bg-[#1b1711] px-2 py-1 font-mono text-[10px] text-[#91897e]">
              {state.events.length} calls
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {state.events.length === 0 ? (
              <Empty
                title="Kong is climbing to the lookout…"
                body="His first simulated launch check lands in a moment."
              />
            ) : (
              state.events.map((event) => (
                <TapeLine key={event.id} event={event} />
              ))
            )}
          </ul>
        </section>

        <aside className="flex flex-col gap-4">
          <Panel title="Gate limits · Cornelius">
            <div className="grid grid-cols-2 gap-3 p-4">
              <Stat label="Budget left" value={formatSol(budgetLeft)} />
              <Stat label="In play" value={formatSol(state.spentSol)} />
              <Stat label="Open bags" value={String(state.positions.length)} />
              <Stat label="On watch" value={String(state.watched.length)} />
            </div>
          </Panel>

          <Panel title="Open bags · Caesar">
            {state.positions.length === 0 ? (
              <Empty
                compact
                title="No open bags yet"
                body="Approved simulated buys show up here with running P&amp;L."
              />
            ) : (
              <ul>
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-3 border-b border-[#302a20] px-4 py-3 last:border-0"
                  >
                    <div>
                      <div className="font-semibold">${p.ticker}</div>
                      <div className="font-mono text-[11px] text-[#91897e]">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm font-semibold tabular-nums",
                        p.pnlPct < 0 ? "text-[#ff655f]" : "text-[#c7ff45]",
                      )}
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="On the vine · Cheeta">
            {state.tokens.length === 0 ? (
              <Empty
                compact
                title="Waiting on Kong…"
                body="The first simulated scan usually lands within a second."
              />
            ) : (
              <>
                <ul className="max-h-48 overflow-y-auto">
                  {state.tokens.slice(0, 10).map((t) => (
                    <li
                      key={t.id}
                      className="flex justify-between gap-2 border-b border-[#302a20] px-4 py-2 text-xs last:border-0"
                    >
                      <span className="font-semibold">
                        ${t.ticker}
                        {state.watched.includes(t.id) ? (
                          <span className="text-[#ffb13c]"> · Cheeta watching</span>
                        ) : null}
                      </span>
                      <span className="font-mono text-[#91897e]">
                        {t.velocity.toFixed(2)}× · {t.liquiditySol} SOL
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-[#302a20] px-4 py-2.5 text-[11px] leading-snug text-[#91897e]">
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
  const stages: { id: Phase; name: string; role: string }[] = [
    { id: "scouting", name: "Kong", role: "Scout" },
    { id: "watching", name: "Cheeta", role: "Watch" },
    { id: "awaiting_approval", name: "Caesar", role: "Trade" },
    { id: "managing", name: "Cornelius", role: "Risk" },
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
    <div className="border-t border-[#302a20] bg-[#12100c]/50">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row">
        <div className="grid flex-1 grid-cols-4">
          {stages.map((s, i) => {
            const on = active === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "px-2 py-2 text-center",
                  i > 0 && "border-l border-[#302a20]",
                  on ? "bg-[#ff4f1f] text-[#0b0906]" : "text-[#6f685f]",
                )}
              >
                <span className="block text-[10px] font-bold sm:text-xs">{s.name}</span>
                <span className="block font-mono text-[8px] uppercase tracking-wider opacity-70">
                  {s.role}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 border-t border-[#302a20] px-4 py-2 font-mono text-[9px] uppercase tracking-wider text-[#6f685f] sm:border-l sm:border-t-0">
          <span>
            checked <span className="text-[#f4efe5]">{stats.scanned}</span>
          </span>
          <span>
            blocked <span className="text-[#f4efe5]">{stats.skipped}</span>
          </span>
          <span>
            passed <span className="text-[#f4efe5]">{stats.passed}</span>
          </span>
          <span>
            sent <span className="text-[#f4efe5]">{stats.bought}</span>
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
    <li className="border-b border-[#302a20] px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] text-[#6f685f]">
          {formatTime(event.at)}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
            event.specialist === "scout" && "bg-[#ff7250]/10 text-[#ff7250]",
            event.specialist === "watch" && "bg-[#ffb13c]/10 text-[#ffb13c]",
            event.specialist === "desk" && "bg-[#c7ff45]/10 text-[#c7ff45]",
            event.specialist === "system" && "bg-[#9ab7ff]/10 text-[#9ab7ff]",
          )}
        >
          {WHO_LABEL[event.specialist]}
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            hot ? "text-[#f4efe5]" : "text-[#b6aea1]",
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
      <p className="mt-1.5 text-xs leading-relaxed text-[#91897e]">{event.detail}</p>
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
    <section className="ape-card overflow-hidden rounded-2xl border border-[#302a20]">
      <div className="border-b border-[#302a20] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#ded7cb]">
        {title}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#1b1711] px-3 py-2.5">
      <div className="text-[10px] text-[#6f685f]">{label}</div>
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
      <p className="mt-1 max-w-[32ch] text-xs leading-relaxed text-[#91897e]">
        {body}
      </p>
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-sm font-semibold text-[#f4efe5]">{children}</div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[#302a20] pb-2 last:border-0">
      <dt className="text-[#91897e]">{k}</dt>
      <dd className="font-semibold tabular-nums text-[#f4efe5]">{v}</dd>
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
    <label className="block rounded-xl border border-[#302a20] bg-[#12100c]/50 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-[#ff7250]">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-[#91897e]">{hint}</p>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full accent-[#ff4f1f]"
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
      className="rounded-lg border border-[#302a20] px-3 py-1.5 text-xs text-[#ded7cb] hover:border-[#ff4f1f]/50 hover:text-[#ff7250]"
    >
      {children}
    </button>
  );
}
