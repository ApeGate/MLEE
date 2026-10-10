import type { VersionedTransaction } from "@solana/web3.js";
import {
  assertManualSellTransactionSafe,
  type ManualSellTransactionSummary,
} from "../../packages/core/src";

const LAMPORTS_PER_SOL = 1_000_000_000;
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
const MIN_INDEPENDENT_LIQUIDITY_USD = 500;

export type IndependentPricePair = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceNative?: string;
  baseToken?: { address?: string };
  quoteToken?: { address?: string };
  liquidity?: { usd?: number };
};

export type ManualSellIntent = {
  expectedSigner: string;
  expectedMint: string;
  maxSellTokenBaseUnits: string;
  minimumOutputLamports: string;
  maxAccountFundingLamports: number;
  priorityFeeSol: number;
  maxTipLamports: number;
};

export function calculateManualSellFloor(input: {
  tokenAmount: number;
  priceSol: number;
  slippagePct: number;
  oracleBuffer?: number;
}) {
  const oracleBuffer = input.oracleBuffer ?? 0.9;
  if (
    !(input.tokenAmount > 0) ||
    !(input.priceSol > 0) ||
    input.slippagePct < 0 ||
    input.slippagePct >= 100 ||
    oracleBuffer <= 0 ||
    oracleBuffer > 1
  ) {
    throw new Error("Independent exit quote inputs are invalid");
  }
  const expectedLamports = Math.floor(
    input.tokenAmount * input.priceSol * LAMPORTS_PER_SOL,
  );
  return {
    expectedLamports,
    minimumOutputLamports: Math.max(
      1,
      Math.floor(
        expectedLamports *
          (1 - input.slippagePct / 100) *
          oracleBuffer,
      ),
    ),
  };
}

export function selectIndependentPumpSwapPrice(
  pairs: readonly IndependentPricePair[],
  mint: string,
) {
  const pair = pairs
    .filter(
      (item) =>
        item.chainId === "solana" &&
        item.dexId === "pumpswap" &&
        item.baseToken?.address === mint &&
        item.quoteToken?.address === WRAPPED_SOL_MINT &&
        Number.isFinite(Number(item.priceNative)) &&
        Number(item.priceNative) > 0 &&
        Number.isFinite(item.liquidity?.usd) &&
        (item.liquidity?.usd ?? 0) >= MIN_INDEPENDENT_LIQUIDITY_USD,
    )
    .sort(
      (left, right) =>
        (right.liquidity?.usd ?? 0) - (left.liquidity?.usd ?? 0),
    )[0];
  if (!pair) {
    throw new Error("Independent PumpSwap exit price is unavailable");
  }
  return {
    priceSol: Number(pair.priceNative),
    pairAddress: pair.pairAddress ?? null,
    liquidityUsd: pair.liquidity?.usd ?? 0,
  };
}

export function inspectManualSellTransaction(
  transaction: VersionedTransaction,
  intent: ManualSellIntent,
) {
  const message = transaction.message;
  if (message.addressTableLookups.length !== 0) {
    throw new Error("Manual exits cannot use address lookup tables");
  }
  const accountKeys = message.getAccountKeys({
    addressLookupTableAccounts: [],
  });
  const summary: ManualSellTransactionSummary = {
    feePayer: message.staticAccountKeys[0]?.toBase58() ?? "",
    requiredSigners: message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .map((key) => key.toBase58()),
    addressLookupTableCount: message.addressTableLookups.length,
    expectedMint: intent.expectedMint,
    maxSellTokenBaseUnits: intent.maxSellTokenBaseUnits,
    minimumOutputLamports: intent.minimumOutputLamports,
    maxAccountFundingLamports: intent.maxAccountFundingLamports,
    maxPriorityFeeLamports: Math.ceil(
      intent.priorityFeeSol * LAMPORTS_PER_SOL,
    ),
    maxTipLamports: intent.maxTipLamports,
    instructions: message.compiledInstructions.map((instruction) => {
      const program = accountKeys.get(instruction.programIdIndex);
      if (!program) throw new Error("Exit contains an unresolved program");
      return {
        programId: program.toBase58(),
        accountKeys: Array.from(instruction.accountKeyIndexes).map((index) => {
          const account = accountKeys.get(index);
          if (!account) throw new Error("Exit contains an unresolved account");
          return account.toBase58();
        }),
        dataHex: Array.from(instruction.data, (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join(""),
      };
    }),
  };
  if (summary.feePayer !== intent.expectedSigner) {
    throw new Error("Prepared exit has the wrong fee payer");
  }
  return assertManualSellTransactionSafe(summary);
}
