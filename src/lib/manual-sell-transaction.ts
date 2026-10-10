import type { VersionedTransaction } from "@solana/web3.js";
import {
  assertManualSellTransactionSafe,
  type ManualSellTransactionSummary,
} from "../../packages/core/src";

const LAMPORTS_PER_SOL = 1_000_000_000;

export type ManualSellIntent = {
  expectedSigner: string;
  expectedMint: string;
  maxSellTokenBaseUnits: string;
  minimumOutputLamports: string;
  maxAccountFundingLamports: number;
  priorityFeeSol: number;
  maxTipLamports: number;
};

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
