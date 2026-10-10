import type { GateVerdict } from "./types";

export const CANARY_BUY_MIN_SOL = 0.01;
export const CANARY_BUY_MAX_SOL = 0.05;
export const CANARY_WALLET_RESERVE_SOL = 0.005;

export const MANUAL_BUY_PROGRAM_ALLOWLIST = [
  "11111111111111111111111111111111",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "6EF8rrecthR5DkZJbQJ7JzTt2AUVTwbLsJCR6VwACF6P",
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
] as const;

export interface MainnetCanaryAuthorizationInput {
  amountSol: number;
  balanceSol: number;
  expectedSigner: string;
  actualSigner: string;
  verdict: GateVerdict;
  now: number;
}

export interface ManualBuyTransactionSummary {
  feePayer: string;
  requiredSigners: string[];
  addressLookupTableCount: number;
  programIds: string[];
}

export function authorizeMainnetCanaryBuy(
  input: MainnetCanaryAuthorizationInput,
) {
  if (!Number.isFinite(input.amountSol)) {
    throw new Error("Canary amount must be finite");
  }
  if (
    input.amountSol < CANARY_BUY_MIN_SOL ||
    input.amountSol > CANARY_BUY_MAX_SOL
  ) {
    throw new Error(
      `Canary amount must stay between ${CANARY_BUY_MIN_SOL} and ${CANARY_BUY_MAX_SOL} SOL`,
    );
  }
  if (input.expectedSigner !== input.actualSigner) {
    throw new Error("Loaded signer does not match the expected canary wallet");
  }
  if (
    input.balanceSol <
    input.amountSol + CANARY_WALLET_RESERVE_SOL
  ) {
    throw new Error("Canary wallet balance is below the trade plus reserve");
  }
  if (input.verdict.kind !== "PASS") {
    throw new Error(`Kong must PASS the mint; got ${input.verdict.kind}`);
  }
  if (!input.verdict.timing.entryAllowed) {
    throw new Error(
      `Cheeta must allow the entry; got ${input.verdict.timing.label}`,
    );
  }
  if (input.now > input.verdict.freshUntil) {
    throw new Error("Kong verdict expired before transaction authorization");
  }

  return Object.freeze({
    amountSol: input.amountSol,
    mint: input.verdict.mint,
    signer: input.actualSigner,
    factsHash: input.verdict.factsHash,
    rulesetVersion: input.verdict.rulesetVersion,
    authorizedAt: input.now,
    expiresAt: input.verdict.freshUntil,
  });
}

export function assertManualBuyTransactionSafe(
  summary: ManualBuyTransactionSummary,
) {
  if (summary.addressLookupTableCount !== 0) {
    throw new Error("Canary transaction cannot use address lookup tables");
  }
  if (
    summary.requiredSigners.length !== 1 ||
    summary.requiredSigners[0] !== summary.feePayer
  ) {
    throw new Error("Canary transaction must have one signer and fee payer");
  }

  const allowed = new Set<string>(MANUAL_BUY_PROGRAM_ALLOWLIST);
  const unexpected = [...new Set(summary.programIds)].filter(
    (programId) => !allowed.has(programId),
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Canary transaction contains unapproved programs: ${unexpected.join(", ")}`,
    );
  }

  return Object.freeze({
    ...summary,
    programIds: Object.freeze([...new Set(summary.programIds)]),
  });
}
