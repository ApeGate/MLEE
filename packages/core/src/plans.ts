import { hashCanonical } from "./canonical";
import type { GateVerdict, LaunchFacts, Profile } from "./types";

export type PlanTemplate =
  | "first-minutes"
  | "curve-climber"
  | "graduation-watch"
  | "survivor-dip"
  | "dev-watch";
export type ExitTemplate = "quick-flip" | "let-it-run" | "bail-fast";

export interface PlanDraft {
  name: string;
  template: PlanTemplate;
  profile: Profile;
  sizeSol: number;
  perTradeCapSol: number;
  dailySpendCapSol: number;
  slippageBps: number;
  exitTemplate: ExitTemplate;
  approvalRequired: boolean;
  coolOffAfterLosses: number;
  coolOffMinutes: number;
}

export interface PlanSpec extends PlanDraft {
  version: 1;
  createdAt: number;
  immutable: true;
  executionEnabled: false;
}

export interface PlanValidation {
  valid: boolean;
  errors: string[];
}

export interface PlanRehearsal {
  planHash: string;
  source: "replay";
  status: "eligibility-only";
  sampleSize: number;
  gateEligible: number;
  blocked: number;
  waiting: number;
  missingInputs: string[];
  tapeFactsHash: string;
}

export function validatePlanDraft(draft: PlanDraft): PlanValidation {
  const errors: string[] = [];
  if (draft.name.trim().length < 3 || draft.name.trim().length > 48) {
    errors.push("Plan name must be 3–48 characters");
  }
  if (!Number.isFinite(draft.sizeSol) || draft.sizeSol <= 0) {
    errors.push("Order size must be positive");
  }
  if (
    !Number.isFinite(draft.perTradeCapSol) ||
    draft.perTradeCapSol <= 0 ||
    draft.sizeSol > draft.perTradeCapSol
  ) {
    errors.push("Order size cannot exceed the per-trade cap");
  }
  if (
    !Number.isFinite(draft.dailySpendCapSol) ||
    draft.dailySpendCapSol < draft.perTradeCapSol
  ) {
    errors.push("Daily spend cap cannot be below the per-trade cap");
  }
  if (
    !Number.isFinite(draft.slippageBps) ||
    draft.slippageBps < 100 ||
    draft.slippageBps > 2_500
  ) {
    errors.push("Slippage must stay between 1% and 25%");
  }
  if (
    !Number.isInteger(draft.coolOffAfterLosses) ||
    draft.coolOffAfterLosses < 1 ||
    draft.coolOffAfterLosses > 10
  ) {
    errors.push("Cool-off loss count must be 1–10");
  }
  if (
    !Number.isInteger(draft.coolOffMinutes) ||
    draft.coolOffMinutes < 1 ||
    draft.coolOffMinutes > 1_440
  ) {
    errors.push("Cool-off duration must be 1–1,440 minutes");
  }
  return { valid: errors.length === 0, errors };
}

export function createPlanSpec(draft: PlanDraft, createdAt: number): PlanSpec {
  const validation = validatePlanDraft(draft);
  if (!validation.valid) {
    throw new RangeError(validation.errors.join("; "));
  }
  return deepFreeze({
    ...draft,
    name: draft.name.trim(),
    version: 1 as const,
    createdAt,
    immutable: true as const,
    executionEnabled: false as const,
  });
}

export async function hashPlanSpec(spec: PlanSpec): Promise<string> {
  return hashCanonical(spec);
}

export async function rehearsePlan(
  spec: PlanSpec,
  samples: Array<{ facts: LaunchFacts; verdict: GateVerdict }>,
): Promise<PlanRehearsal> {
  const planHash = await hashPlanSpec(spec);
  const gateEligible = samples.filter(
    (sample) =>
      sample.verdict.kind === "PASS" || sample.verdict.kind === "WARN",
  ).length;
  const blocked = samples.filter(
    (sample) => sample.verdict.kind === "BLOCK",
  ).length;
  const waiting = samples.filter(
    (sample) => sample.verdict.kind === "WAIT",
  ).length;
  const tapeFactsHash = await hashCanonical(
    samples.map((sample) => ({
      mint: sample.facts.mint,
      factsHash: sample.verdict.factsHash,
    })),
  );
  return {
    planHash,
    source: "replay",
    status: "eligibility-only",
    sampleSize: samples.length,
    gateEligible,
    blocked,
    waiting,
    missingInputs: [
      "reserve snapshots for curve progression",
      "outcome labels for replay P&L",
      "slot-latency and failed-landing calibration",
    ],
    tapeFactsHash,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}
