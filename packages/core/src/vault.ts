import { hashCanonical } from "./canonical";

export type VaultProgram = "pump" | "pumpswap" | "jupiter";

export interface VaultPolicyDraft {
  ownerWallet: string;
  perTradeCapSol: number;
  dailySpendCapSol: number;
  maxOpenPositions: number;
  profitSweepPct: number;
  allowedPrograms: VaultProgram[];
}

export interface VaultPolicyPreview extends VaultPolicyDraft {
  version: 1;
  provider: "privy";
  withdrawalsTo: string;
  executionEnabled: false;
  externalReviewComplete: false;
  createdAt: number;
  policyHash: string;
}

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ALLOWED_PROGRAMS = new Set<VaultProgram>([
  "pump",
  "pumpswap",
  "jupiter",
]);

export async function createVaultPolicyPreview(
  draft: VaultPolicyDraft,
  createdAt: number,
): Promise<VaultPolicyPreview> {
  const ownerWallet = draft.ownerWallet.trim();
  if (!SOLANA_ADDRESS.test(ownerWallet)) {
    throw new RangeError("Owner wallet must be a valid Solana address");
  }
  if (
    !Number.isFinite(draft.perTradeCapSol) ||
    draft.perTradeCapSol <= 0
  ) {
    throw new RangeError("Per-trade cap must be positive");
  }
  if (
    !Number.isFinite(draft.dailySpendCapSol) ||
    draft.dailySpendCapSol < draft.perTradeCapSol
  ) {
    throw new RangeError("Daily cap cannot be below the per-trade cap");
  }
  if (
    !Number.isInteger(draft.maxOpenPositions) ||
    draft.maxOpenPositions < 1 ||
    draft.maxOpenPositions > 50
  ) {
    throw new RangeError("Open-position cap must be 1–50");
  }
  if (
    !Number.isFinite(draft.profitSweepPct) ||
    draft.profitSweepPct < 0 ||
    draft.profitSweepPct > 100
  ) {
    throw new RangeError("Profit sweep must be 0–100%");
  }
  const allowedPrograms = [...new Set(draft.allowedPrograms)].sort();
  if (
    allowedPrograms.length === 0 ||
    allowedPrograms.some(
      (program) => !ALLOWED_PROGRAMS.has(program as VaultProgram),
    )
  ) {
    throw new RangeError("At least one supported program must be allowlisted");
  }
  const policy = {
    version: 1 as const,
    provider: "privy" as const,
    ownerWallet,
    withdrawalsTo: ownerWallet,
    perTradeCapSol: draft.perTradeCapSol,
    dailySpendCapSol: draft.dailySpendCapSol,
    maxOpenPositions: draft.maxOpenPositions,
    profitSweepPct: draft.profitSweepPct,
    allowedPrograms: allowedPrograms as VaultProgram[],
    executionEnabled: false as const,
    externalReviewComplete: false as const,
    createdAt,
  };
  return {
    ...policy,
    policyHash: await hashCanonical(policy),
  };
}
