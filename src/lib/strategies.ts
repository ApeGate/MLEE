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
    summary: string;
    defaults: Omit<
      Strategy,
      "style" | "askBeforeBuy" | "budgetSol" | "maxPerCoinSol" | "maxPositions"
    >;
  }
> = {
  clips: {
    label: "Clips",
    summary: "Fresh Pump.fun coins, quick entries, fast partial exits.",
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
    summary: "Coins already moving with liquidity and volume behind them.",
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
    summary: "Broader net on newer coins — higher coverage, higher variance.",
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
  const a = s.askBeforeBuy ? "approve each buy" : "auto-buy within limits";
  return `${STYLE_META[s.style].label}: Scout age≤${s.filters.maxAgeMinutes}m · liq≥${s.filters.minLiquiditySol} SOL · top≤${s.filters.maxTopHolderPct}% → Watch vel≥${s.filters.minVelocity.toFixed(1)}× → Desk ≤${s.maxPerCoinSol} SOL ×${s.maxPositions} (${s.budgetSol} SOL, ${a}). Exit +${s.exit.takeProfitPct}% / trail ${s.exit.trailingStopPct}% / stop −${s.exit.stopLossPct}%.`;
}
