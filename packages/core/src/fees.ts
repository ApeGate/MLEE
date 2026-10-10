export const APEGATE_FEE_BPS = 50;

export interface FeeBreakdown {
  quoteAmount: number;
  protocolFee: number;
  apegateFee: number;
  networkEstimate: number;
  total: number;
}

export function estimateFees(
  quoteAmount: number,
  protocolFeeBps: number,
  networkEstimate = 0.000_005,
): FeeBreakdown {
  if (quoteAmount < 0 || protocolFeeBps < 0 || networkEstimate < 0) {
    throw new RangeError("Fee inputs must be non-negative");
  }
  const protocolFee = (quoteAmount * protocolFeeBps) / 10_000;
  const apegateFee = (quoteAmount * APEGATE_FEE_BPS) / 10_000;
  const total = Number(
    (quoteAmount + protocolFee + apegateFee + networkEstimate).toFixed(12),
  );
  return {
    quoteAmount,
    protocolFee,
    apegateFee,
    networkEstimate,
    total,
  };
}
