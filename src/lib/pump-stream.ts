import type { RawLaunch } from "../../packages/core/src";

const BASE58_KEY = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;
const MAX_MARKET_CAP_SOL = 1_000_000_000;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return cleaned || null;
}

function nonNegativeNumber(value: unknown, max = Number.MAX_SAFE_INTEGER) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max
    ? value
    : null;
}

function metadataUri(value: unknown) {
  const uri = cleanText(value, 2_048);
  if (!uri) return null;
  try {
    const parsed = new URL(uri);
    return ["https:", "ipfs:", "ar:"].includes(parsed.protocol) ? uri : null;
  } catch {
    return null;
  }
}

export function parsePumpLaunch(value: unknown): RawLaunch | null {
  if (!value || typeof value !== "object") return null;
  const launch = value as Record<string, unknown>;
  const signature = cleanText(launch.signature, 88);
  const mint = cleanText(launch.mint, 44);
  const traderPublicKey = cleanText(launch.traderPublicKey, 44);
  const bondingCurveKey = cleanText(launch.bondingCurveKey, 44);
  const name = cleanText(launch.name, 96);
  const symbol = cleanText(launch.symbol, 24);
  const uri = metadataUri(launch.uri);
  const initialBuy = nonNegativeNumber(launch.initialBuy);
  const solAmount = nonNegativeNumber(launch.solAmount, 10_000_000);
  const vTokensInBondingCurve = nonNegativeNumber(
    launch.vTokensInBondingCurve,
  );
  const vSolInBondingCurve = nonNegativeNumber(launch.vSolInBondingCurve);
  const marketCapSol = nonNegativeNumber(
    launch.marketCapSol,
    MAX_MARKET_CAP_SOL,
  );
  if (
    !signature ||
    !BASE58_SIGNATURE.test(signature) ||
    !mint ||
    !BASE58_KEY.test(mint) ||
    !traderPublicKey ||
    !BASE58_KEY.test(traderPublicKey) ||
    !bondingCurveKey ||
    !BASE58_KEY.test(bondingCurveKey) ||
    !name ||
    !symbol ||
    !uri ||
    initialBuy === null ||
    solAmount === null ||
    vTokensInBondingCurve === null ||
    vSolInBondingCurve === null ||
    marketCapSol === null ||
    launch.txType !== "create"
  ) {
    return null;
  }

  const pool = cleanText(launch.pool, 24);
  return {
    signature,
    mint,
    traderPublicKey,
    txType: "create",
    initialBuy,
    solAmount,
    bondingCurveKey,
    vTokensInBondingCurve,
    vSolInBondingCurve,
    marketCapSol,
    name,
    symbol,
    uri,
    is_mayhem_mode: launch.is_mayhem_mode === true,
    ...(pool ? { pool } : {}),
  };
}

export function parsePumpTrade(value: unknown): {
  mint: string;
  txType: "buy" | "sell";
  marketCapSol?: number;
} | null {
  if (!value || typeof value !== "object") return null;
  const trade = value as Record<string, unknown>;
  const mint = cleanText(trade.mint, 44);
  if (
    !mint ||
    !BASE58_KEY.test(mint) ||
    (trade.txType !== "buy" && trade.txType !== "sell")
  ) {
    return null;
  }
  const marketCapSol =
    trade.marketCapSol === undefined
      ? undefined
      : nonNegativeNumber(trade.marketCapSol, MAX_MARKET_CAP_SOL);
  if (marketCapSol === null) return null;
  return {
    mint,
    txType: trade.txType,
    ...(marketCapSol === undefined ? {} : { marketCapSol }),
  };
}
