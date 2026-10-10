import { APEGATE_FEE_BPS, estimateFees, type FeeBreakdown } from "./fees";
import type { LaunchFacts } from "./types";

const PUMP_PROTOCOL_FEE_BPS = 125;
const MODELED_SUPPLY = 1_000_000_000;

export interface PaperQuote {
  side: "BUY" | "SELL";
  mint: string;
  symbol: string;
  quoteAmountSol: number;
  tokenAmount: number;
  referencePriceSol: number;
  executionPriceSol: number;
  priceImpactPct: number;
  slippageBps: number;
  minimumTokens: number | null;
  minimumProceedsSol: number | null;
  fees: FeeBreakdown;
  totalSol: number;
  model: "market-cap-estimate-v1";
}

export interface PaperPosition {
  mint: string;
  symbol: string;
  tokens: number;
  costBasisSol: number;
  realizedPnlSol: number;
  lastPriceSol: number;
  openedAt: number;
  updatedAt: number;
}

export interface PaperFill {
  id: string;
  side: "BUY" | "SELL";
  mint: string;
  symbol: string;
  tokens: number;
  quoteAmountSol: number;
  feeSol: number;
  executionPriceSol: number;
  realizedPnlSol: number | null;
  at: number;
  source: "paper";
  model: PaperQuote["model"];
}

export interface PaperPortfolio {
  startingCashSol: number;
  cashSol: number;
  positions: PaperPosition[];
  fills: PaperFill[];
}

export function createPaperPortfolio(startingCashSol = 10): PaperPortfolio {
  if (!Number.isFinite(startingCashSol) || startingCashSol <= 0) {
    throw new RangeError("Paper starting balance must be positive");
  }
  return {
    startingCashSol,
    cashSol: startingCashSol,
    positions: [],
    fills: [],
  };
}

export function paperReferencePrice(marketCapSol: number): number {
  if (!Number.isFinite(marketCapSol) || marketCapSol <= 0) {
    throw new RangeError("Market cap must be positive for a paper quote");
  }
  return marketCapSol / MODELED_SUPPLY;
}

function validateSlippage(slippageBps: number) {
  if (
    !Number.isFinite(slippageBps) ||
    slippageBps < 0 ||
    slippageBps > 2_500
  ) {
    throw new RangeError("Paper slippage must be between 0% and 25%");
  }
}

function modeledImpact(quoteAmountSol: number, marketCapSol: number): number {
  return Number(
    Math.min(
      25,
      Math.max(0.1, (quoteAmountSol / Math.max(marketCapSol, 0.000_001)) * 50),
    ).toFixed(4),
  );
}

export function quotePaperBuy(
  facts: Pick<LaunchFacts, "mint" | "symbol" | "marketCapSol">,
  spendSol: number,
  slippageBps = 800,
): PaperQuote {
  if (!Number.isFinite(spendSol) || spendSol <= 0) {
    throw new RangeError("Paper buy size must be positive");
  }
  validateSlippage(slippageBps);
  const referencePriceSol = paperReferencePrice(facts.marketCapSol);
  const priceImpactPct = modeledImpact(spendSol, facts.marketCapSol);
  const executionPriceSol =
    referencePriceSol * (1 + priceImpactPct / 100);
  const tokenAmount = spendSol / executionPriceSol;
  const fees = estimateFees(spendSol, PUMP_PROTOCOL_FEE_BPS, 0);
  return {
    side: "BUY",
    mint: facts.mint,
    symbol: facts.symbol,
    quoteAmountSol: spendSol,
    tokenAmount,
    referencePriceSol,
    executionPriceSol,
    priceImpactPct,
    slippageBps,
    minimumTokens: tokenAmount * (1 - slippageBps / 10_000),
    minimumProceedsSol: null,
    fees,
    totalSol: fees.total,
    model: "market-cap-estimate-v1",
  };
}

export function quotePaperSell(
  facts: Pick<LaunchFacts, "mint" | "symbol" | "marketCapSol">,
  tokenAmount: number,
  slippageBps = 800,
): PaperQuote {
  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
    throw new RangeError("Paper sell amount must be positive");
  }
  validateSlippage(slippageBps);
  const referencePriceSol = paperReferencePrice(facts.marketCapSol);
  const referenceGrossSol = tokenAmount * referencePriceSol;
  const priceImpactPct = modeledImpact(
    referenceGrossSol,
    facts.marketCapSol,
  );
  const executionPriceSol =
    referencePriceSol * (1 - priceImpactPct / 100);
  const quoteAmountSol = tokenAmount * executionPriceSol;
  const protocolFee =
    (quoteAmountSol * PUMP_PROTOCOL_FEE_BPS) / 10_000;
  const apegateFee = (quoteAmountSol * APEGATE_FEE_BPS) / 10_000;
  const netProceeds = quoteAmountSol - protocolFee - apegateFee;
  const fees: FeeBreakdown = {
    quoteAmount: quoteAmountSol,
    protocolFee,
    apegateFee,
    networkEstimate: 0,
    total: netProceeds,
  };
  return {
    side: "SELL",
    mint: facts.mint,
    symbol: facts.symbol,
    quoteAmountSol,
    tokenAmount,
    referencePriceSol,
    executionPriceSol,
    priceImpactPct,
    slippageBps,
    minimumTokens: null,
    minimumProceedsSol: netProceeds * (1 - slippageBps / 10_000),
    fees,
    totalSol: netProceeds,
    model: "market-cap-estimate-v1",
  };
}

export function applyPaperBuy(
  portfolio: PaperPortfolio,
  quote: PaperQuote,
  at: number,
): { portfolio: PaperPortfolio; fill: PaperFill } {
  if (quote.side !== "BUY") {
    throw new TypeError("A buy fill requires a BUY quote");
  }
  if (portfolio.cashSol + 1e-12 < quote.totalSol) {
    throw new RangeError("Paper balance is below the quoted total");
  }
  const current = portfolio.positions.find(
    (position) => position.mint === quote.mint,
  );
  const position: PaperPosition = current
    ? {
        ...current,
        tokens: current.tokens + quote.tokenAmount,
        costBasisSol: current.costBasisSol + quote.totalSol,
        lastPriceSol: quote.executionPriceSol,
        updatedAt: at,
      }
    : {
        mint: quote.mint,
        symbol: quote.symbol,
        tokens: quote.tokenAmount,
        costBasisSol: quote.totalSol,
        realizedPnlSol: 0,
        lastPriceSol: quote.executionPriceSol,
        openedAt: at,
        updatedAt: at,
      };
  const fill: PaperFill = {
    id: `${quote.mint}:BUY:${at}`,
    side: "BUY",
    mint: quote.mint,
    symbol: quote.symbol,
    tokens: quote.tokenAmount,
    quoteAmountSol: quote.quoteAmountSol,
    feeSol: quote.fees.protocolFee + quote.fees.apegateFee,
    executionPriceSol: quote.executionPriceSol,
    realizedPnlSol: null,
    at,
    source: "paper",
    model: quote.model,
  };
  return {
    portfolio: {
      ...portfolio,
      cashSol: portfolio.cashSol - quote.totalSol,
      positions: current
        ? portfolio.positions.map((item) =>
            item.mint === quote.mint ? position : item,
          )
        : [...portfolio.positions, position],
      fills: [...portfolio.fills, fill].slice(-200),
    },
    fill,
  };
}

export function applyPaperSell(
  portfolio: PaperPortfolio,
  quote: PaperQuote,
  at: number,
): { portfolio: PaperPortfolio; fill: PaperFill } {
  if (quote.side !== "SELL") {
    throw new TypeError("A sell fill requires a SELL quote");
  }
  const current = portfolio.positions.find(
    (position) => position.mint === quote.mint,
  );
  if (!current || current.tokens + 1e-9 < quote.tokenAmount) {
    throw new RangeError("Paper position is below the quoted token amount");
  }
  const averageCost = current.costBasisSol / current.tokens;
  const soldCostBasis = averageCost * quote.tokenAmount;
  const realizedPnlSol = quote.totalSol - soldCostBasis;
  const remainingTokens = Math.max(0, current.tokens - quote.tokenAmount);
  const remainingCost = Math.max(0, current.costBasisSol - soldCostBasis);
  const nextPosition: PaperPosition = {
    ...current,
    tokens: remainingTokens,
    costBasisSol: remainingCost,
    realizedPnlSol: current.realizedPnlSol + realizedPnlSol,
    lastPriceSol: quote.executionPriceSol,
    updatedAt: at,
  };
  const fill: PaperFill = {
    id: `${quote.mint}:SELL:${at}`,
    side: "SELL",
    mint: quote.mint,
    symbol: quote.symbol,
    tokens: quote.tokenAmount,
    quoteAmountSol: quote.quoteAmountSol,
    feeSol: quote.fees.protocolFee + quote.fees.apegateFee,
    executionPriceSol: quote.executionPriceSol,
    realizedPnlSol,
    at,
    source: "paper",
    model: quote.model,
  };
  return {
    portfolio: {
      ...portfolio,
      cashSol: portfolio.cashSol + quote.totalSol,
      positions:
        remainingTokens <= 1e-6
          ? portfolio.positions.filter((item) => item.mint !== quote.mint)
          : portfolio.positions.map((item) =>
              item.mint === quote.mint ? nextPosition : item,
            ),
      fills: [...portfolio.fills, fill].slice(-200),
    },
    fill,
  };
}

export function paperPositionValue(
  position: PaperPosition,
  marketCapSol: number,
): number {
  return position.tokens * paperReferencePrice(marketCapSol);
}
