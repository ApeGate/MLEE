import type { Strategy } from "./strategies";

export type Specialist = "scout" | "watch" | "desk" | "system";

export type Phase =
  | "idle"
  | "scouting"
  | "watching"
  | "awaiting_approval"
  | "managing"
  | "blocked"
  | "paused";

export type Token = {
  id: string;
  ticker: string;
  name: string;
  ageMinutes: number;
  liquiditySol: number;
  topHolderPct: number;
  velocity: number;
  price: number;
  change5m: number;
};

export type Position = {
  tokenId: string;
  ticker: string;
  entryPrice: number;
  sizeSol: number;
  peakPrice: number;
  remainingPct: number;
  pnlPct: number;
};

export type DeskEvent = {
  id: string;
  at: number;
  specialist: Specialist;
  kind:
    | "scan"
    | "skip"
    | "pass"
    | "watching"
    | "entry"
    | "pending"
    | "buy"
    | "sell"
    | "note"
    | "error";
  ticker?: string;
  title: string;
  detail: string;
};

export type PendingBuy = {
  token: Token;
  sizeSol: number;
  reason: string;
};

export type SimState = {
  running: boolean;
  tick: number;
  spentSol: number;
  tokens: Token[];
  watched: string[];
  positions: Position[];
  events: DeskEvent[];
  pending: PendingBuy | null;
  phase: Phase;
  lastError: string | null;
  stats: {
    scanned: number;
    skipped: number;
    passed: number;
    bought: number;
    sold: number;
  };
};

const TICKERS = [
  ["WISP", "Willow Whisper"],
  ["GLINT", "Glass Glint"],
  ["MOOR", "Night Moor"],
  ["FATHOM", "Fathom Deep"],
  ["SKIFF", "Skiff Line"],
  ["EMBER", "Ember Drift"],
  ["QUILL", "Quill Mark"],
  ["RIME", "Rime Coast"],
  ["LUMEN", "Lumen Pack"],
  ["TOR", "Tor Ridge"],
  ["VAULT", "Soft Vault"],
  ["NEX", "Nex Current"],
  ["BRINE", "Brine Cap"],
  ["HALO", "Halo Wire"],
  ["KITE", "Kite Signal"],
  ["ORBIT", "Orbit Dust"],
  ["PULSE", "Pulse Fen"],
  ["REED", "Reed Channel"],
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createInitialState(): SimState {
  return {
    running: false,
    tick: 0,
    spentSol: 0,
    tokens: [],
    watched: [],
    positions: [],
    events: [],
    pending: null,
    phase: "idle",
    lastError: null,
    stats: { scanned: 0, skipped: 0, passed: 0, bought: 0, sold: 0 },
  };
}

/** Bias tokens so ~35% pass Scout filters for the active style — faster useful loop. */
function makeToken(strategy: Strategy): Token {
  const [ticker, name] = pick(TICKERS);
  const passBias = Math.random() < 0.38;
  const f = strategy.filters;
  const ageMinutes = passBias
    ? Math.floor(rand(2, Math.max(3, f.maxAgeMinutes * 0.85)))
    : Math.floor(rand(2, 220));
  const liquiditySol = passBias
    ? rand(f.minLiquiditySol, f.minLiquiditySol + 80)
    : rand(6, 140);
  const topHolderPct = passBias
    ? rand(12, Math.max(13, f.maxTopHolderPct - 1))
    : rand(12, 58);
  const velocity = passBias
    ? rand(f.minVelocity * 0.7, f.minVelocity + 1.1)
    : rand(0.3, 2.4);
  return {
    id: uid("tok"),
    ticker: `${ticker}${Math.floor(rand(1, 99))}`,
    name,
    ageMinutes,
    liquiditySol: Number(liquiditySol.toFixed(1)),
    topHolderPct: Number(topHolderPct.toFixed(1)),
    velocity: Number(velocity.toFixed(2)),
    price: rand(0.00001, 0.008),
    change5m: Number(rand(-28, 65).toFixed(1)),
  };
}

function pushEvent(
  state: SimState,
  event: Omit<DeskEvent, "id" | "at">,
): SimState {
  const next: DeskEvent = { ...event, id: uid("evt"), at: Date.now() };
  return { ...state, events: [next, ...state.events].slice(0, 100) };
}

function scoutCheck(
  token: Token,
  strategy: Strategy,
): { ok: boolean; reason: string } {
  const f = strategy.filters;
  if (token.ageMinutes > f.maxAgeMinutes) {
    return {
      ok: false,
      reason: `age ${token.ageMinutes}m > ${f.maxAgeMinutes}m`,
    };
  }
  if (token.liquiditySol < f.minLiquiditySol) {
    return {
      ok: false,
      reason: `liq ${token.liquiditySol} < ${f.minLiquiditySol} SOL`,
    };
  }
  if (token.topHolderPct > f.maxTopHolderPct) {
    return {
      ok: false,
      reason: `top ${token.topHolderPct}% > ${f.maxTopHolderPct}%`,
    };
  }
  return {
    ok: true,
    reason: `age ${token.ageMinutes}m · liq ${token.liquiditySol} SOL · top ${token.topHolderPct}%`,
  };
}

function canOpen(state: SimState, strategy: Strategy, sizeSol: number) {
  if (state.positions.length >= strategy.maxPositions) {
    return "max positions reached";
  }
  if (state.spentSol + sizeSol > strategy.budgetSol + 1e-9) {
    return "budget exhausted";
  }
  if (sizeSol > strategy.maxPerCoinSol) {
    return "size over max per coin";
  }
  return null;
}

function markToMarket(positions: Position[]): Position[] {
  return positions.map((p) => {
    const drift = rand(-0.035, 0.05);
    const price = Math.max(
      p.entryPrice * 0.2,
      p.entryPrice * (1 + p.pnlPct / 100) * (1 + drift),
    );
    const pnlPct = ((price - p.entryPrice) / p.entryPrice) * 100;
    return {
      ...p,
      peakPrice: Math.max(p.peakPrice, price),
      pnlPct: Number(pnlPct.toFixed(1)),
    };
  });
}

function manageExits(state: SimState, strategy: Strategy): SimState {
  let next = { ...state, positions: [...state.positions] };
  const keep: Position[] = [];

  for (const pos of next.positions) {
    const current = pos.entryPrice * (1 + pos.pnlPct / 100);
    const dropFromPeak = ((pos.peakPrice - current) / pos.peakPrice) * 100;
    const hardStop = pos.pnlPct <= -strategy.exit.stopLossPct;
    const trailHit =
      pos.pnlPct > strategy.exit.takeProfitPct * 0.35 &&
      dropFromPeak >= strategy.exit.trailingStopPct;
    const tpHit =
      pos.pnlPct >= strategy.exit.takeProfitPct && pos.remainingPct > 40;

    if (hardStop || trailHit) {
      next = pushEvent(next, {
        specialist: "desk",
        kind: "sell",
        ticker: pos.ticker,
        title: hardStop
          ? `STOP $${pos.ticker} ${pos.pnlPct.toFixed(1)}%`
          : `TRAIL $${pos.ticker} −${dropFromPeak.toFixed(1)}% from peak`,
        detail: hardStop
          ? `closed ${pos.remainingPct}% at stop −${strategy.exit.stopLossPct}%`
          : `closed ${pos.remainingPct}% on ${strategy.exit.trailingStopPct}% trail`,
      });
      next = {
        ...next,
        stats: { ...next.stats, sold: next.stats.sold + 1 },
        spentSol: Math.max(
          0,
          next.spentSol - pos.sizeSol * (pos.remainingPct / 100),
        ),
      };
      continue;
    }

    if (tpHit) {
      const soldPct = strategy.exit.partialSellPct;
      const remaining = Math.max(0, pos.remainingPct - soldPct);
      next = pushEvent(next, {
        specialist: "desk",
        kind: "sell",
        ticker: pos.ticker,
        title: `TP $${pos.ticker} +${pos.pnlPct.toFixed(1)}%`,
        detail: `sold ${soldPct}% · left ${remaining}%`,
      });
      next = {
        ...next,
        stats: { ...next.stats, sold: next.stats.sold + 1 },
        spentSol: Math.max(0, next.spentSol - pos.sizeSol * (soldPct / 100)),
      };
      if (remaining > 0) keep.push({ ...pos, remainingPct: remaining });
      continue;
    }

    keep.push(pos);
  }

  return { ...next, positions: keep };
}

function resolvePhase(state: SimState): Phase {
  if (!state.running) return state.tick === 0 ? "idle" : "paused";
  if (state.pending) return "awaiting_approval";
  if (state.lastError) return "blocked";
  if (state.watched.length > 0) return "watching";
  if (state.positions.length > 0) return "managing";
  return "scouting";
}

export function nextStepLabel(state: SimState): string {
  switch (state.phase) {
    case "idle":
      return "NEXT: set rules → RUN";
    case "paused":
      return "NEXT: RESUME or RESET";
    case "scouting":
      return "NEXT: Scout is filtering the tape";
    case "watching":
      return "NEXT: Watch waiting on velocity entry";
    case "awaiting_approval":
      return "NEXT: APPROVE or SKIP the buy";
    case "managing":
      return "NEXT: Desk managing exits · Scout still scanning";
    case "blocked":
      return `NEXT: fix block — ${state.lastError ?? "limits"}`;
    default:
      return "NEXT: —";
  }
}

export function approvePending(state: SimState): SimState {
  if (!state.pending) return state;
  const { token, sizeSol, reason } = state.pending;
  let next: SimState = {
    ...state,
    pending: null,
    lastError: null,
    spentSol: state.spentSol + sizeSol,
    positions: [
      {
        tokenId: token.id,
        ticker: token.ticker,
        entryPrice: token.price,
        sizeSol,
        peakPrice: token.price,
        remainingPct: 100,
        pnlPct: 0,
      },
      ...state.positions,
    ],
    watched: state.watched.filter((id) => id !== token.id),
    stats: { ...state.stats, bought: state.stats.bought + 1 },
  };
  next = pushEvent(next, {
    specialist: "desk",
    kind: "buy",
    ticker: token.ticker,
    title: `BUY $${token.ticker} ${sizeSol.toFixed(2)} SOL`,
    detail: reason,
  });
  next = { ...next, phase: resolvePhase(next) };
  return next;
}

export function rejectPending(state: SimState): SimState {
  if (!state.pending) return state;
  const ticker = state.pending.token.ticker;
  let next: SimState = {
    ...state,
    pending: null,
    watched: state.watched.filter((id) => id !== state.pending!.token.id),
  };
  next = pushEvent(next, {
    specialist: "system",
    kind: "note",
    ticker,
    title: `SKIPPED BUY $${ticker}`,
    detail: "you passed · Scout continues",
  });
  next = { ...next, phase: resolvePhase(next) };
  return next;
}

export function simTick(state: SimState, strategy: Strategy): SimState {
  if (!state.running) return state;
  if (state.pending) {
    return { ...state, phase: "awaiting_approval" };
  }

  let next: SimState = {
    ...state,
    tick: state.tick + 1,
    lastError: null,
    positions: markToMarket(state.positions),
  };
  next = manageExits(next, strategy);

  next = {
    ...next,
    tokens: next.tokens.map((t) => ({
      ...t,
      ageMinutes: t.ageMinutes + 0.15,
      velocity: Number(
        Math.max(0.2, t.velocity + rand(-0.12, 0.22)).toFixed(2),
      ),
      change5m: Number((t.change5m + rand(-3, 4)).toFixed(1)),
      price: t.price * (1 + rand(-0.03, 0.04)),
    })),
  };

  // New coin every 2 ticks — denser tape
  if (next.tick % 2 === 1 || next.tokens.length < 5) {
    const token = makeToken(strategy);
    next = {
      ...next,
      tokens: [token, ...next.tokens].slice(0, 16),
      stats: { ...next.stats, scanned: next.stats.scanned + 1 },
    };
    next = pushEvent(next, {
      specialist: "scout",
      kind: "scan",
      ticker: token.ticker,
      title: `SCAN $${token.ticker}`,
      detail: `${token.ageMinutes}m · liq ${token.liquiditySol} · top ${token.topHolderPct}% · vel ${token.velocity.toFixed(2)}×`,
    });

    const check = scoutCheck(token, strategy);
    if (!check.ok) {
      next = {
        ...next,
        stats: { ...next.stats, skipped: next.stats.skipped + 1 },
      };
      next = pushEvent(next, {
        specialist: "scout",
        kind: "skip",
        ticker: token.ticker,
        title: `SKIP $${token.ticker}`,
        detail: check.reason,
      });
    } else {
      next = {
        ...next,
        watched: [token.id, ...next.watched].slice(0, 8),
        stats: { ...next.stats, passed: next.stats.passed + 1 },
      };
      next = pushEvent(next, {
        specialist: "scout",
        kind: "pass",
        ticker: token.ticker,
        title: `PASS → WATCH $${token.ticker}`,
        detail: check.reason,
      });
      next = pushEvent(next, {
        specialist: "watch",
        kind: "watching",
        ticker: token.ticker,
        title: `WATCH $${token.ticker}`,
        detail: `need vel ≥ ${strategy.filters.minVelocity.toFixed(1)}× · now ${token.velocity.toFixed(2)}×`,
      });
    }
  }

  const candidates = next.tokens.filter((t) => next.watched.includes(t.id));
  for (const token of candidates) {
    if (token.velocity < strategy.filters.minVelocity) continue;
    const sizeSol = Math.min(
      strategy.maxPerCoinSol,
      strategy.budgetSol - next.spentSol,
    );
    const block = sizeSol < 0.2 ? "budget exhausted" : canOpen(next, strategy, sizeSol);
    if (block) {
      next = {
        ...next,
        lastError: block,
        watched: next.watched.filter((id) => id !== token.id),
      };
      next = pushEvent(next, {
        specialist: "system",
        kind: "error",
        ticker: token.ticker,
        title: `BLOCKED $${token.ticker}`,
        detail: block,
      });
      continue;
    }

    const reason = `vel ${token.velocity.toFixed(2)}× ≥ ${strategy.filters.minVelocity.toFixed(1)}×`;

    if (strategy.askBeforeBuy) {
      next = {
        ...next,
        pending: { token, sizeSol: Number(sizeSol.toFixed(2)), reason },
        watched: next.watched.filter((id) => id !== token.id),
      };
      next = pushEvent(next, {
        specialist: "watch",
        kind: "pending",
        ticker: token.ticker,
        title: `ENTRY READY $${token.ticker}`,
        detail: `${reason} · ${sizeSol.toFixed(2)} SOL · awaiting APPROVE`,
      });
      break;
    }

    next = {
      ...next,
      spentSol: next.spentSol + sizeSol,
      positions: [
        {
          tokenId: token.id,
          ticker: token.ticker,
          entryPrice: token.price,
          sizeSol,
          peakPrice: token.price,
          remainingPct: 100,
          pnlPct: 0,
        },
        ...next.positions,
      ],
      watched: next.watched.filter((id) => id !== token.id),
      stats: { ...next.stats, bought: next.stats.bought + 1 },
    };
    next = pushEvent(next, {
      specialist: "watch",
      kind: "entry",
      ticker: token.ticker,
      title: `ENTRY $${token.ticker}`,
      detail: reason,
    });
    next = pushEvent(next, {
      specialist: "desk",
      kind: "buy",
      ticker: token.ticker,
      title: `BUY $${token.ticker} ${sizeSol.toFixed(2)} SOL`,
      detail: "auto within rules",
    });
    break;
  }

  next = { ...next, phase: resolvePhase(next) };
  return next;
}
