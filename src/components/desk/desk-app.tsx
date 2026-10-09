"use client";

import Link from "next/link";
import { useEffect, useRef, useState, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  STYLE_META,
  createStrategy,
  strategyPlainEnglish,
  type Strategy,
  type StrategyStyle,
} from "@/lib/strategies";
import {
  approvePending,
  createInitialState,
  rejectPending,
  simTick,
  type DeskEvent,
  type SimState,
} from "@/lib/simulation";
import { cn, formatPct, formatSol } from "@/lib/utils";

const SPECIALIST_LABEL: Record<DeskEvent["specialist"], string> = {
  scout: "Scout",
  watch: "Watch",
  desk: "Desk",
  relay: "Relay",
};

const KIND_TONE: Record<DeskEvent["kind"], string> = {
  scan: "text-mist",
  skip: "text-warn",
  pass: "text-signal",
  watching: "text-mist",
  entry: "text-signal",
  pending: "text-warn",
  buy: "text-signal",
  sell: "text-foreground",
  note: "text-mist",
};

export function DeskApp() {
  const [strategy, setStrategy] = useState<Strategy>(() => createStrategy("clips"));
  const [state, setState] = useState<SimState>(() => createInitialState());
  const [started, setStarted] = useState(false);
  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => {
      setState((prev) => simTick(prev, strategyRef.current));
    }, 1100);
    return () => window.clearInterval(id);
  }, [state.running]);

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
        events: [
          {
            id: "boot",
            at: Date.now(),
            specialist: "relay",
            kind: "note",
            title: "Desk online",
            detail: strategyPlainEnglish(strategy),
          },
        ],
      });
    });
  }

  function toggleRunning() {
    setState((prev) => ({ ...prev, running: !prev.running }));
  }

  function resetDesk() {
    setStarted(false);
    setState(createInitialState());
  }

  const preview = strategyPlainEnglish(strategy);
  const budgetLeft = Math.max(0, strategy.budgetSol - state.spentSol);

  return (
    <div className="relative min-h-[100svh] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="atmosphere-grid pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-display text-lg font-bold tracking-tight text-signal"
            >
              RELAY
            </Link>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-mist">
              Strategy desk
            </span>
          </div>
          <div className="flex items-center gap-2">
            {started && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleRunning}
                  className="border-signal/25"
                >
                  {state.running ? "Pause" : "Resume"}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetDesk}>
                  Reset
                </Button>
              </>
            )}
          </div>
        </header>

        {!started ? (
          <SetupPanel
            strategy={strategy}
            preview={preview}
            onStyle={updateStyle}
            onBudget={(v) => setStrategy((s) => ({ ...s, budgetSol: v }))}
            onMaxPer={(v) => setStrategy((s) => ({ ...s, maxPerCoinSol: v }))}
            onMaxPos={(v) => setStrategy((s) => ({ ...s, maxPositions: v }))}
            onAsk={(v) => setStrategy((s) => ({ ...s, askBeforeBuy: v }))}
            onStart={startDesk}
          />
        ) : (
          <LiveDesk
            strategy={strategy}
            state={state}
            budgetLeft={budgetLeft}
            onApprove={() => setState((s) => approvePending(s))}
            onReject={() => setState((s) => rejectPending(s))}
          />
        )}
      </div>
    </div>
  );
}

function SetupPanel({
  strategy,
  preview,
  onStyle,
  onBudget,
  onMaxPer,
  onMaxPos,
  onAsk,
  onStart,
}: {
  strategy: Strategy;
  preview: string;
  onStyle: (s: StrategyStyle) => void;
  onBudget: (n: number) => void;
  onMaxPer: (n: number) => void;
  onMaxPos: (n: number) => void;
  onAsk: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-balance">
          Configure the desk
        </h1>
        <p className="mt-3 max-w-md text-mist">
          Choose a style, set capital rules, then start. The simulated market
          runs locally — no wallet needed.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(Object.keys(STYLE_META) as StrategyStyle[]).map((style) => {
            const active = strategy.style === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => onStyle(style)}
                className={cn(
                  "rounded-md border px-4 py-2 text-left transition-colors",
                  active
                    ? "border-signal bg-signal/15 text-signal"
                    : "border-white/10 text-mist hover:border-signal/30 hover:text-foreground",
                )}
              >
                <div className="font-display text-sm font-semibold">
                  {STYLE_META[style].label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-mist">{STYLE_META[strategy.style].blurb}</p>

        <div className="mt-8 space-y-6">
          <SliderField
            label="Budget"
            valueLabel={formatSol(strategy.budgetSol)}
            value={strategy.budgetSol}
            min={2}
            max={25}
            step={0.5}
            onChange={onBudget}
          />
          <SliderField
            label="Max per coin"
            valueLabel={formatSol(strategy.maxPerCoinSol)}
            value={strategy.maxPerCoinSol}
            min={0.3}
            max={5}
            step={0.1}
            onChange={onMaxPer}
          />
          <SliderField
            label="Max open positions"
            valueLabel={String(strategy.maxPositions)}
            value={strategy.maxPositions}
            min={1}
            max={6}
            step={1}
            onChange={(n) => onMaxPos(Math.round(n))}
          />
          <label className="flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div>
              <div className="text-sm font-medium">Ask before each buy</div>
              <div className="text-xs text-mist">
                Recommended. Desk pauses for your approval when Watch finds an entry.
              </div>
            </div>
            <Switch
              checked={strategy.askBeforeBuy}
              onCheckedChange={onAsk}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-8 border-t border-signal/15 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
            Plan preview
          </p>
          <p className="mt-4 font-display text-xl font-medium leading-snug text-foreground sm:text-2xl text-balance">
            {preview}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <Stat label="Take profit" value={`+${strategy.exit.takeProfitPct}%`} />
            <Stat label="Partial sell" value={`${strategy.exit.partialSellPct}%`} />
            <Stat label="Stop loss" value={`−${strategy.exit.stopLossPct}%`} />
            <Stat label="Trail" value={`${strategy.exit.trailingStopPct}%`} />
          </dl>
        </div>
        <Button
          size="lg"
          onClick={onStart}
          className="w-full bg-signal text-signal-foreground hover:bg-signal/90 sm:w-auto"
        >
          Start the desk
        </Button>
      </div>
    </div>
  );
}

function LiveDesk({
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
    <div className="mt-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Live desk
          </h1>
          <p className="mt-1 text-sm text-mist">
            {STYLE_META[strategy.style].label} · {state.running ? "Running" : "Paused"}
            {state.pending ? " · Waiting on you" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-[0.14em] text-mist">
          <span>Scanned {state.stats.scanned}</span>
          <span>Skipped {state.stats.skipped}</span>
          <span>Passed {state.stats.passed}</span>
          <span>Bought {state.stats.bought}</span>
          <span>Sold {state.stats.sold}</span>
        </div>
      </div>

      {state.pending && (
        <div className="animate-tape-in border border-warn/40 bg-warn/10 px-4 py-4 sm:px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-warn">
            Approval needed
          </p>
          <p className="mt-2 font-display text-xl font-semibold">
            Buy ${state.pending.token.ticker} for {formatSol(state.pending.sizeSol)}?
          </p>
          <p className="mt-1 text-sm text-mist">{state.pending.reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={onApprove}
              className="bg-signal text-signal-foreground hover:bg-signal/90"
            >
              Approve buy
            </Button>
            <Button variant="outline" onClick={onReject} className="border-white/15">
              Skip
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
            Decision tape
          </h2>
          <ul className="mt-3 max-h-[520px] space-y-0 overflow-y-auto border-t border-white/10">
            {state.events.length === 0 && (
              <li className="py-8 text-sm text-mist">Waiting for Scout…</li>
            )}
            {state.events.map((event) => (
              <li
                key={event.id}
                className="animate-tape-in border-b border-white/8 py-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal/80">
                    {SPECIALIST_LABEL[event.specialist]}
                  </span>
                  <span className={cn("text-sm font-medium", KIND_TONE[event.kind])}>
                    {event.title}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mist">{event.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
              Capital
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Budget left" value={formatSol(budgetLeft)} />
              <Stat label="In play" value={formatSol(state.spentSol)} />
              <Stat label="Open" value={String(state.positions.length)} />
              <Stat label="Watching" value={String(state.watched.length)} />
            </dl>
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
              Positions
            </h2>
            {state.positions.length === 0 ? (
              <p className="mt-3 text-sm text-mist">No open bags yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {state.positions.map((p) => (
                  <li
                    key={p.tokenId}
                    className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-3"
                  >
                    <div>
                      <div className="font-display font-semibold">${p.ticker}</div>
                      <div className="text-xs text-mist">
                        {formatSol(p.sizeSol)} · {p.remainingPct}% left
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-mono text-sm",
                        p.pnlPct >= 0 ? "text-signal" : "text-destructive",
                      )}
                    >
                      {formatPct(p.pnlPct)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
              Market tape
            </h2>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {state.tokens.slice(0, 8).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium">${t.ticker}</span>
                  <span className="font-mono text-xs text-mist">
                    {t.liquiditySol} SOL · top {t.topHolderPct}% · {t.velocity.toFixed(2)}×
                  </span>
                </li>
              ))}
              {state.tokens.length === 0 && (
                <li className="text-sm text-mist">Scanning…</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SliderField({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-xs text-signal">{valueLabel}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v;
          if (typeof next === "number") onChange(next);
        }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-mist">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}
