import { hashCanonical } from "./canonical";
import type { GateVerdict, LaunchFacts } from "./types";

export interface LabReport {
  source: "replay";
  methodology: "gate-recompute-v1";
  sampleSize: number;
  verdicts: Record<GateVerdict["kind"], number>;
  rulesetVersions: string[];
  replayHash: string;
  outcomesAvailable: false;
  precision: null;
  recall: null;
  winRate: null;
  expectancy: null;
  maxDrawdown: null;
  missingInputs: string[];
}

export async function buildLabReport(
  samples: Array<{ facts: LaunchFacts; verdict: GateVerdict }>,
): Promise<LabReport> {
  const verdicts: LabReport["verdicts"] = {
    PASS: 0,
    WARN: 0,
    BLOCK: 0,
    WAIT: 0,
  };
  for (const sample of samples) verdicts[sample.verdict.kind] += 1;
  const rulesetVersions = [
    ...new Set(samples.map((sample) => sample.verdict.rulesetVersion)),
  ].sort();
  const replayHash = await hashCanonical(
    samples.map((sample) => ({
      mint: sample.facts.mint,
      factsHash: sample.verdict.factsHash,
      verdict: sample.verdict.kind,
      score: sample.verdict.score,
      rulesetVersion: sample.verdict.rulesetVersion,
    })),
  );
  return {
    source: "replay",
    methodology: "gate-recompute-v1",
    sampleSize: samples.length,
    verdicts,
    rulesetVersions,
    replayHash,
    outcomesAvailable: false,
    precision: null,
    recall: null,
    winRate: null,
    expectancy: null,
    maxDrawdown: null,
    missingInputs: [
      "seven consecutive days of production tape",
      "graduation, death, and rug outcome labels",
      "canary-calibrated reserve and landing data",
    ],
  };
}
