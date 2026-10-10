export type StrategyStyle = "clips" | "balanced" | "wide";

export type ExitPlan = {
  takeProfitPct: number;
  partialSellPct: number;
  stopLossPct: number;
  trailingStopPct: number;
};

export type Strategy = {
  style: StrategyStyle;
  budgetSol: number;
  maxPerCoinSol: number;
  maxPositions: number;
  askBeforeBuy: boolean;
  exit: ExitPlan;
  filters: {
    maxTopHolderPct: number;
    minLiquiditySol: number;
    maxAgeMinutes: number;
    minVelocity: number;
  };
};

export const STYLE_META: Record<
  StrategyStyle,
  {
    label: string;
    plain: string;
    summary: string;
    defaults: Omit<
      Strategy,
      "style" | "askBeforeBuy" | "budgetSol" | "maxPerCoinSol" | "maxPositions"
    >;
  }
> = {
  clips: {
    label: "Clips",
    plain: "Brand-new coins, quick in and out",
    summary:
      "Checks coins under ~25 minutes old. Buys when they start moving. Takes profit early.",
    defaults: {
      exit: {
        takeProfitPct: 35,
        partialSellPct: 60,
        stopLossPct: 18,
        trailingStopPct: 12,
      },
      filters: {
        maxTopHolderPct: 28,
        minLiquiditySol: 18,
        maxAgeMinutes: 25,
        minVelocity: 1.4,
      },
    },
  },
  balanced: {
    label: "Balanced",
    plain: "Coins already moving with real liquidity",
    summary:
      "Allows older coins if liquidity is stronger. Slower entries, wider take-profit.",
    defaults: {
      exit: {
        takeProfitPct: 55,
        partialSellPct: 45,
        stopLossPct: 22,
        trailingStopPct: 15,
      },
      filters: {
        maxTopHolderPct: 35,
        minLiquiditySol: 40,
        maxAgeMinutes: 90,
        minVelocity: 1.1,
      },
    },
  },
  wide: {
    label: "Wide",
    plain: "Broader net, more risk",
    summary:
      "Looser holder and age filters so more coins reach the watch list. Bigger swings both ways.",
    defaults: {
      exit: {
        takeProfitPct: 90,
        partialSellPct: 40,
        stopLossPct: 30,
        trailingStopPct: 20,
      },
      filters: {
        maxTopHolderPct: 42,
        minLiquiditySol: 12,
        maxAgeMinutes: 180,
        minVelocity: 0.8,
      },
    },
  },
};

export function createStrategy(
  style: StrategyStyle,
  overrides?: Partial<
    Pick<
      Strategy,
      "budgetSol" | "maxPerCoinSol" | "maxPositions" | "askBeforeBuy"
    >
  >,
): Strategy {
  const meta = STYLE_META[style];
  return {
    style,
    budgetSol: overrides?.budgetSol ?? 8,
    maxPerCoinSol: overrides?.maxPerCoinSol ?? 1.5,
    maxPositions: overrides?.maxPositions ?? 3,
    askBeforeBuy: overrides?.askBeforeBuy ?? true,
    exit: { ...meta.defaults.exit },
    filters: { ...meta.defaults.filters },
  };
}

export function strategyLine(s: Strategy): string {
  const a = s.askBeforeBuy
    ? "You approve every buy"
    : "Buys fire automatically inside your limits";
  return `${STYLE_META[s.style].label}: only coins ≤${s.filters.maxAgeMinutes}m old, ≥${s.filters.minLiquiditySol} SOL liquidity, top holders ≤${s.filters.maxTopHolderPct}%. Wait for ${s.filters.minVelocity.toFixed(1)}× velocity, then size up to ${s.maxPerCoinSol} SOL (budget ${s.budgetSol} SOL, max ${s.maxPositions} open). Sell ${s.exit.partialSellPct}% at +${s.exit.takeProfitPct}%, trail ${s.exit.trailingStopPct}%, stop at −${s.exit.stopLossPct}%. ${a}.`;
}

/** Sample tape rows for homepage proof — static, labeled simulated. */
export const SAMPLE_TAPE = [
  {
    who: "Check",
    action: "Skip",
    coin: "$MOOR12",
    why: "Top holders own 41% (your max is 28%)",
  },
  {
    who: "Check",
    action: "Pass",
    coin: "$SKIFF4",
    why: "Age 9m · liquidity 52 SOL · top holders 19%",
  },
  {
    who: "Watch",
    action: "Waiting",
    coin: "$SKIFF4",
    why: "Needs 1.4× velocity — currently 1.1×",
  },
  {
    who: "Watch",
    action: "Ready",
    coin: "$SKIFF4",
    why: "Velocity hit 1.6× · size 1.5 SOL · needs your OK",
  },
  {
    who: "Trade",
    action: "Bought",
    coin: "$SKIFF4",
    why: "You approved · 1.5 SOL filled · exits armed",
  },
] as const;
