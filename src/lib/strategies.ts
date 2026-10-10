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
    label: "Quick Pounce",
    plain: "Fresh launches, fast exits",
    summary:
      "Kong checks coins under ~25 minutes old. Cheeta wants early momentum. Cornelius takes profit sooner.",
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
    label: "High Ground",
    plain: "More liquidity, calmer entries",
    summary:
      "The crew allows older coins when liquidity is stronger, with slower entries and wider targets.",
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
    label: "Jungle Mode",
    plain: "Broader net, bigger swings",
    summary:
      "Looser holder and age rules put more coins in Cheeta’s sights. More setups, more risk.",
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
    ? "Caesar asks you before every buy"
    : "Caesar can send automatically inside your limits";
  return `${STYLE_META[s.style].label}: Kong passes coins ≤${s.filters.maxAgeMinutes}m old, ≥${s.filters.minLiquiditySol} SOL liquidity, with top holders ≤${s.filters.maxTopHolderPct}%. Cheeta waits for ${s.filters.minVelocity.toFixed(1)}× velocity. Caesar sizes up to ${s.maxPerCoinSol} SOL (${s.budgetSol} SOL budget, max ${s.maxPositions} open). Cornelius sells ${s.exit.partialSellPct}% at +${s.exit.takeProfitPct}%, trails ${s.exit.trailingStopPct}%, and stops at −${s.exit.stopLossPct}%. ${a}.`;
}

/** Sample tape rows for homepage proof — static, labeled simulated. */
export const SAMPLE_TAPE = [
  {
    who: "Kong",
    action: "Blocks",
    coin: "$MOOR12",
    why: "Top holders own 41% (your max is 28%)",
  },
  {
    who: "Kong",
    action: "Passes",
    coin: "$SKIFF4",
    why: "Age 9m · liquidity 52 SOL · top holders 19%",
  },
  {
    who: "Cheeta",
    action: "Stalks",
    coin: "$SKIFF4",
    why: "Needs 1.4× velocity — currently 1.1×",
  },
  {
    who: "Caesar",
    action: "Pitches",
    coin: "$SKIFF4",
    why: "Velocity hit 1.6× · size 1.5 SOL · needs your OK",
  },
  {
    who: "Cornelius",
    action: "Arms exits",
    coin: "$SKIFF4",
    why: "Take-profit +35% · stop −18% · trail 12%",
  },
] as const;
