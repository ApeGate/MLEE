import type { Strategy } from "./strategies";

export type Specialist = "scout" | "watch" | "desk" | "relay";

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
    | "note";
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
    stats: { scanned: 0, skipped: 0, passed: 0, bought: 0, sold: 0 },
  };
}

function makeToken(): Token {
  const [ticker, name] = pick(TICKERS);
  const ageMinutes = Math.floor(rand(2, 200));
  const liquiditySol = rand(8, 160);
  const topHolderPct = rand(12, 55);
  const velocity = rand(0.4, 2.6);
  const price = rand(0.00001, 0.008);
  return {
    id: uid("tok"),
    ticker: `${ticker}${Math.floor(rand(1, 99))}`,
    name,
    ageMinutes,
    liquiditySol: Number(liquiditySol.toFixed(1)),
    topHolderPct: Number(topHolderPct.toFixed(1)),
    velocity: Number(velocity.toFixed(2)),
    price,
    change5m: Number(rand(-28, 65).toFixed(1)),
  };
}

function pushEvent(
  state: SimState,
  event: Omit<DeskEvent, "id" | "at">,
): SimState {
  const next: DeskEvent = {
    ...event,
    id: uid("evt"),
    at: Date.now(),
  };
  return {
    ...state,
    events: [next, ...state.events].slice(0, 80),
  };
}

function scoutCheck(token: Token, strategy: Strategy): { ok: boolean; reason: string } {
  const f = strategy.filters;
  if (token.ageMinutes > f.maxAgeMinutes) {
    return { ok: false, reason: `Age ${token.ageMinutes}m exceeds ${f.maxAgeMinutes}m cap` };
  }
  if (token.liquiditySol < f.minLiquiditySol) {
    return {
      ok: false,
      reason: `Liquidity ${token.liquiditySol} SOL below ${f.minLiquiditySol} SOL floor`,
    };
  }
  if (token.topHolderPct > f.maxTopHolderPct) {
    return {
      ok: false,
      reason: `Top holders own ${token.topHolderPct}% (max ${f.maxTopHolderPct}%)`,
    };
  }
  return {
    ok: true,
    reason: `Passed filters — liq ${token.liquiditySol} SOL, top ${token.topHolderPct}%, age ${token.ageMinutes}m`,
  };
}

function canOpen(state: SimState, strategy: Strategy, sizeSol: number) {
  if (state.positions.length >= strategy.maxPositions) return false;
  if (state.spentSol + sizeSol > strategy.budgetSol) return false;
  if (sizeSol > strategy.maxPerCoinSol) return false;
  return true;
}

function markToMarket(positions: Position[]): Position[] {
  return positions.map((p) => {
    const drift = rand(-0.04, 0.055);
    const price = Math.max(p.entryPrice * 0.2, p.entryPrice * (1 + p.pnlPct / 100) * (1 + drift));
    const pnlPct = ((price - p.entryPrice) / p.entryPrice) * 100;
    return {
      ...p,
      peakPrice: Math.max(p.peakPrice, price),
      pnlPct: Number(pnlPct.toFixed(1)),
    };
  });
}

function manageExits(
  state: SimState,
  strategy: Strategy,
): SimState {
  let next = { ...state, positions: [...state.positions] };
  const keep: Position[] = [];

  for (const pos of next.positions) {
    const dropFromPeak =
      ((pos.peakPrice - pos.entryPrice * (1 + pos.pnlPct / 100)) / pos.peakPrice) * 100;
    const hardStop = pos.pnlPct <= -strategy.exit.stopLossPct;
    const trailHit =
      pos.pnlPct > strategy.exit.takeProfitPct * 0.35 &&
      dropFromPeak >= strategy.exit.trailingStopPct;
    const tpHit = pos.pnlPct >= strategy.exit.takeProfitPct && pos.remainingPct > 40;

    if (hardStop || trailHit) {
      next = pushEvent(next, {
        specialist: "desk",
        kind: "sell",
        ticker: pos.ticker,
        title: hardStop ? `Stop hit on $${pos.ticker}` : `Trail exit on $${pos.ticker}`,
        detail: hardStop
          ? `Closed remaining ${pos.remainingPct}% at ${pos.pnlPct.toFixed(1)}% vs −${strategy.exit.stopLossPct}% stop.`
          : `Price fell ${dropFromPeak.toFixed(1)}% from peak — trailing ${strategy.exit.trailingStopPct}% rule fired.`,
      });
      next = {
        ...next,
        stats: { ...next.stats, sold: next.stats.sold + 1 },
        spentSol: Math.max(0, next.spentSol - pos.sizeSol * (pos.remainingPct / 100)),
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
        title: `Partial take-profit $${pos.ticker}`,
        detail: `Sold ${soldPct}% at +${pos.pnlPct.toFixed(1)}%. Leaving ${remaining}% to trail.`,
      });
      next = {
        ...next,
        stats: { ...next.stats, sold: next.stats.sold + 1 },
        spentSol: Math.max(
          0,
          next.spentSol - pos.sizeSol * (soldPct / 100),
        ),
      };
      if (remaining > 0) {
        keep.push({ ...pos, remainingPct: remaining });
      }
      continue;
    }

    keep.push(pos);
  }

  return { ...next, positions: keep };
}

export function approvePending(state: SimState): SimState {
  if (!state.pending) return state;
  const { token, sizeSol, reason } = state.pending;
  let next: SimState = {
    ...state,
    pending: null,
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
    title: `Bought $${token.ticker}`,
    detail: `${sizeSol.toFixed(2)} SOL filled. ${reason}`,
  });
  return next;
}

export function rejectPending(state: SimState): SimState {
  if (!state.pending) return state;
  let next: SimState = {
    ...state,
    pending: null,
    watched: state.watched.filter((id) => id !== state.pending!.token.id),
  };
  next = pushEvent(next, {
    specialist: "relay",
    kind: "note",
    ticker: state.pending.token.ticker,
    title: `You passed on $${state.pending.token.ticker}`,
    detail: "Desk stood down. Scout keeps scanning the next candidates.",
  });
  return next;
}

export function simTick(state: SimState, strategy: Strategy): SimState {
  if (!state.running) return state;
  if (state.pending) return state;

  let next: SimState = {
    ...state,
    tick: state.tick + 1,
    positions: markToMarket(state.positions),
  };
  next = manageExits(next, strategy);

  // Update live tape
  next = {
    ...next,
    tokens: next.tokens.map((t) => ({
      ...t,
      ageMinutes: t.ageMinutes + 0.2,
      velocity: Number(Math.max(0.2, t.velocity + rand(-0.15, 0.18)).toFixed(2)),
      change5m: Number((t.change5m + rand(-3, 4)).toFixed(1)),
      price: t.price * (1 + rand(-0.03, 0.04)),
    })),
  };

  // New coin every ~3 ticks
  if (next.tick % 3 === 1 || next.tokens.length < 6) {
    const token = makeToken();
    next = {
      ...next,
      tokens: [token, ...next.tokens].slice(0, 14),
      stats: { ...next.stats, scanned: next.stats.scanned + 1 },
    };
    next = pushEvent(next, {
      specialist: "scout",
      kind: "scan",
      ticker: token.ticker,
      title: `Scout checking $${token.ticker}`,
      detail: `${token.name} · ${token.ageMinutes}m · liq ${token.liquiditySol} SOL · top ${token.topHolderPct}%`,
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
        title: `Skipped $${token.ticker}`,
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
        title: `Passed to Watch · $${token.ticker}`,
        detail: check.reason,
      });
      next = pushEvent(next, {
        specialist: "watch",
        kind: "watching",
        ticker: token.ticker,
        title: `Watching entry on $${token.ticker}`,
        detail: `Waiting for velocity ≥ ${strategy.filters.minVelocity.toFixed(1)}× (now ${token.velocity.toFixed(2)}×).`,
      });
    }
  }

  // Watch → entry
  const candidates = next.tokens.filter((t) => next.watched.includes(t.id));
  for (const token of candidates) {
    if (token.velocity < strategy.filters.minVelocity) continue;
    const sizeSol = Math.min(
      strategy.maxPerCoinSol,
      strategy.budgetSol - next.spentSol,
    );
    if (sizeSol < 0.2 || !canOpen(next, strategy, sizeSol)) {
      next = pushEvent(next, {
        specialist: "relay",
        kind: "note",
        ticker: token.ticker,
        title: `Held $${token.ticker} — limits reached`,
        detail: "Budget or position cap blocked the handoff. Pause or raise limits to resume buys.",
      });
      next = {
        ...next,
        watched: next.watched.filter((id) => id !== token.id),
      };
      continue;
    }

    const reason = `Velocity ${token.velocity.toFixed(2)}× cleared ${strategy.filters.minVelocity.toFixed(1)}× entry.`;

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
        title: `Entry ready · $${token.ticker}`,
        detail: `${reason} Awaiting your approval for ${sizeSol.toFixed(2)} SOL.`,
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
      title: `Entry triggered · $${token.ticker}`,
      detail: reason,
    });
    next = pushEvent(next, {
      specialist: "desk",
      kind: "buy",
      ticker: token.ticker,
      title: `Bought $${token.ticker}`,
      detail: `${sizeSol.toFixed(2)} SOL filled inside your rules.`,
    });
    break;
  }

  return next;
}
