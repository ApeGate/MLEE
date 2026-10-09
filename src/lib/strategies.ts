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
  { label: string; blurb: string; defaults: Omit<Strategy, "style" | "askBeforeBuy" | "budgetSol" | "maxPerCoinSol" | "maxPositions"> }
> = {
  clips: {
    label: "Clips",
    blurb: "Fresh coins, quick entries, fast partial exits when a move turns.",
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
    blurb: "Coins already moving with volume behind them — steadier handoffs.",
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
    blurb: "Broader net, bigger swings — higher variance, more market coverage.",
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
  overrides?: Partial<Pick<Strategy, "budgetSol" | "maxPerCoinSol" | "maxPositions" | "askBeforeBuy">>,
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

export function strategyPlainEnglish(s: Strategy): string {
  const style = STYLE_META[s.style].label;
  const approval = s.askBeforeBuy
    ? "Ask before each buy"
    : "Auto-buy within limits";
  return [
    `${style} style — Scout filters coins under ${s.filters.maxAgeMinutes}m old with ≥${s.filters.minLiquiditySol} SOL liquidity and top-holder concentration under ${s.filters.maxTopHolderPct}%.`,
    `Watch waits for velocity ≥${s.filters.minVelocity.toFixed(1)}× baseline, then Desk sizes up to ${s.maxPerCoinSol} SOL (budget ${s.budgetSol} SOL, max ${s.maxPositions} open).`,
    `Exits: sell ${s.exit.partialSellPct}% at +${s.exit.takeProfitPct}%, trail ${s.exit.trailingStopPct}% from high, hard stop at −${s.exit.stopLossPct}%. ${approval}.`,
  ].join(" ");
}
