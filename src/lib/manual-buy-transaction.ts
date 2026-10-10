import type { VersionedTransaction } from "@solana/web3.js";
import {
  assertManualBuyTransactionSafe,
  type ManualBuyTransactionSummary,
} from "../../packages/core/src";

const LAMPORTS_PER_SOL = 1_000_000_000;

export type ManualBuyIntent = {
  expectedSigner: string;
  expectedMint: string;
  amountSol: number;
  slippagePct: number;
  priorityFeeSol: number;
  maxTipLamports: number;
};

export function inspectManualBuyTransaction(
  transaction: VersionedTransaction,
  intent: ManualBuyIntent,
) {
  const message = transaction.message;
  if (message.addressTableLookups.length !== 0) {
    throw new Error("Manual buys cannot use address lookup tables");
  }
  const accountKeys = message.getAccountKeys({
    addressLookupTableAccounts: [],
  });
  const summary: ManualBuyTransactionSummary = {
    feePayer: message.staticAccountKeys[0]?.toBase58() ?? "",
    requiredSigners: message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .map((key) => key.toBase58()),
    addressLookupTableCount: message.addressTableLookups.length,
    expectedMint: intent.expectedMint,
    maxTradeSpendLamports: Math.ceil(
      intent.amountSol *
        LAMPORTS_PER_SOL *
        (1 + intent.slippagePct / 100),
    ),
    maxPriorityFeeLamports: Math.ceil(
      intent.priorityFeeSol * LAMPORTS_PER_SOL,
    ),
    maxTipLamports: intent.maxTipLamports,
    instructions: message.compiledInstructions.map((instruction) => {
      const program = accountKeys.get(instruction.programIdIndex);
      if (!program) {
        throw new Error("Transaction contains an unresolved program");
      }
      return {
        programId: program.toBase58(),
        accountKeys: Array.from(instruction.accountKeyIndexes).map((index) => {
          const account = accountKeys.get(index);
          if (!account) {
            throw new Error("Transaction contains an unresolved account");
          }
          return account.toBase58();
        }),
        dataHex: Array.from(instruction.data, (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join(""),
      };
    }),
  };

  if (summary.feePayer !== intent.expectedSigner) {
    throw new Error("Prepared transaction has the wrong fee payer");
  }

  return assertManualBuyTransactionSafe(summary);
}
