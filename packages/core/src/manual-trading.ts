import type { GateVerdict } from "./types";

export const CANARY_BUY_MIN_SOL = 0.01;
export const CANARY_BUY_MAX_SOL = 0.05;
export const CANARY_WALLET_RESERVE_SOL = 0.005;

export const PUMP_PROGRAM_ID =
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMPSWAP_PROGRAM_ID =
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const ASSOCIATED_TOKEN_PROGRAM_ID =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const COMPUTE_BUDGET_PROGRAM_ID =
  "ComputeBudget111111111111111111111111111111";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID =
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";

export const MANUAL_BUY_PROGRAM_ALLOWLIST = [
  SYSTEM_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
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
  expectedMint: string;
  maxTradeSpendLamports: number;
  maxPriorityFeeLamports: number;
  maxTipLamports: number;
  instructions: ManualBuyInstructionSummary[];
}

export interface ManualBuyInstructionSummary {
  programId: string;
  accountKeys: string[];
  dataHex: string;
}

export function deriveOpeningPriceHoldPct(input: {
  pairCreatedAt: number | null | undefined;
  priceChange24hPct: number | null | undefined;
  observedAt: number;
}): number | null {
  if (
    !input.pairCreatedAt ||
    !Number.isFinite(input.pairCreatedAt) ||
    !Number.isFinite(input.priceChange24hPct)
  ) {
    return null;
  }
  const ageMs = input.observedAt - input.pairCreatedAt;
  if (ageMs < 0 || ageMs > 24 * 60 * 60 * 1_000) return null;
  return Math.max(0, 100 + (input.priceChange24hPct ?? 0));
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
  const unexpected = [
    ...new Set(summary.instructions.map((instruction) => instruction.programId)),
  ].filter((programId) => !allowed.has(programId));
  if (unexpected.length > 0) {
    throw new Error(
      `Canary transaction contains unapproved programs: ${unexpected.join(", ")}`,
    );
  }

  for (const [label, value] of [
    ["trade spend", summary.maxTradeSpendLamports],
    ["priority fee", summary.maxPriorityFeeLamports],
    ["tip", summary.maxTipLamports],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Canary ${label} cap must be safe non-negative lamports`);
    }
  }

  const createdUserTokenAccounts = new Set<string>();
  for (const instruction of summary.instructions) {
    if (instruction.programId !== ASSOCIATED_TOKEN_PROGRAM_ID) continue;
    if (
      !["00", "01"].includes(instruction.dataHex) ||
      instruction.accountKeys.length < 6
    ) {
      throw new Error("Canary contains an unknown associated-token instruction");
    }
    const [payer, tokenAccount, owner, mint] = instruction.accountKeys;
    if (
      payer !== summary.feePayer ||
      owner !== summary.feePayer ||
      (mint !== summary.expectedMint && mint !== WRAPPED_SOL_MINT)
    ) {
      throw new Error("Canary associated-token instruction escapes the intent");
    }
    createdUserTokenAccounts.add(tokenAccount!);
  }

  let swapCount = 0;
  let fundedLamports = BigInt(0);
  let tippedLamports = BigInt(0);
  let computeUnitLimit = BigInt(0);
  let computeUnitPrice = BigInt(0);

  for (const instruction of summary.instructions) {
    const bytes = parseHex(instruction.dataHex);
    switch (instruction.programId) {
      case ASSOCIATED_TOKEN_PROGRAM_ID:
        break;
      case SYSTEM_PROGRAM_ID: {
        if (
          bytes.length !== 12 ||
          readUnsignedLE(bytes, 0, 4) !== BigInt(2)
        ) {
          throw new Error("Canary contains an unknown system instruction");
        }
        const [from, to] = instruction.accountKeys;
        if (from !== summary.feePayer || !to) {
          throw new Error("Canary system transfer has an unexpected source");
        }
        const lamports = readUnsignedLE(bytes, 4, 8);
        if (createdUserTokenAccounts.has(to)) {
          fundedLamports += lamports;
        } else {
          tippedLamports += lamports;
        }
        break;
      }
      case TOKEN_PROGRAM_ID:
      case TOKEN_2022_PROGRAM_ID: {
        if (
          instruction.dataHex === "11" &&
          instruction.accountKeys.length === 1 &&
          createdUserTokenAccounts.has(instruction.accountKeys[0]!)
        ) {
          break;
        }
        if (
          instruction.dataHex === "09" &&
          instruction.accountKeys.length === 3 &&
          createdUserTokenAccounts.has(instruction.accountKeys[0]!) &&
          instruction.accountKeys[1] === summary.feePayer &&
          instruction.accountKeys[2] === summary.feePayer
        ) {
          break;
        }
        throw new Error("Canary contains an unknown or unsafe token instruction");
      }
      case COMPUTE_BUDGET_PROGRAM_ID: {
        if (bytes.length === 5 && bytes[0] === 2) {
          computeUnitLimit = readUnsignedLE(bytes, 1, 4);
          break;
        }
        if (bytes.length === 9 && bytes[0] === 3) {
          computeUnitPrice = readUnsignedLE(bytes, 1, 8);
          break;
        }
        throw new Error("Canary contains an unknown compute-budget instruction");
      }
      case PUMPSWAP_PROGRAM_ID: {
        if (
          instruction.accountKeys.length < 5 ||
          instruction.accountKeys[1] !== summary.feePayer ||
          instruction.accountKeys[3] !== summary.expectedMint ||
          instruction.accountKeys[4] !== WRAPPED_SOL_MINT
        ) {
          throw new Error("PumpSwap buy accounts do not match the intent");
        }
        const discriminator = instruction.dataHex.slice(0, 16);
        const maxQuoteOffset =
          discriminator === "66063d1201daebea"
            ? 16
            : discriminator === "c62e1552b4d9e870"
              ? 8
              : -1;
        if (maxQuoteOffset < 0 || bytes.length < maxQuoteOffset + 8) {
          throw new Error("Canary contains an unsupported PumpSwap instruction");
        }
        const maxQuoteLamports = readUnsignedLE(bytes, maxQuoteOffset, 8);
        if (maxQuoteLamports > BigInt(summary.maxTradeSpendLamports)) {
          throw new Error("PumpSwap max quote exceeds the canary spend cap");
        }
        swapCount += 1;
        break;
      }
      case PUMP_PROGRAM_ID:
        throw new Error(
          "Curve buys stay locked until the Pump v3 instruction decoder is enabled",
        );
      default:
        throw new Error("Canary contains an unsupported instruction");
    }
  }

  if (swapCount !== 1) {
    throw new Error("Canary transaction must contain exactly one decoded swap");
  }
  if (fundedLamports > BigInt(summary.maxTradeSpendLamports)) {
    throw new Error("Canary trade funding exceeds the spend cap");
  }
  if (tippedLamports > BigInt(summary.maxTipLamports)) {
    throw new Error("Canary transfers exceed the tip cap");
  }
  const priorityFeeLamports =
    (computeUnitLimit * computeUnitPrice + BigInt(999_999)) /
    BigInt(1_000_000);
  if (priorityFeeLamports > BigInt(summary.maxPriorityFeeLamports)) {
    throw new Error("Canary compute-unit fee exceeds the priority cap");
  }

  return Object.freeze({
    ...summary,
    decodedSwap: "pumpswap-buy" as const,
    fundedLamports: Number(fundedLamports),
    tippedLamports: Number(tippedLamports),
    priorityFeeLamports: Number(priorityFeeLamports),
  });
}

function parseHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})*$/i.test(value)) {
    throw new Error("Canary instruction data is not valid hex");
  }
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function readUnsignedLE(
  bytes: Uint8Array,
  offset: number,
  length: number,
): bigint {
  if (offset < 0 || offset + length > bytes.length) {
    throw new Error("Canary instruction data is truncated");
  }
  let result = BigInt(0);
  for (let index = length - 1; index >= 0; index -= 1) {
    result = (result << BigInt(8)) | BigInt(bytes[offset + index]!);
  }
  return result;
}
