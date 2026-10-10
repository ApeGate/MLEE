import type {
  TimingKind,
  VerdictKind,
} from "../../packages/core/src";

export type OutcomeCheckpointKind =
  | "FIRST_SEEN"
  | "THIRTY_MINUTES"
  | "TWENTY_FOUR_HOURS";

export type OutcomeTapeSample = {
  mint: string;
  name: string;
  symbol: string;
  source: "live";
  createdAt: number;
  observedAt: number;
  marketCapSol: number;
  tradeCount: number;
  pool: string;
  verdict: VerdictKind;
  timing: TimingKind;
  factsHash: string;
  rulesetVersion: string;
};

export type OutcomeCheckpoint = {
  kind: OutcomeCheckpointKind;
  recordedAt: number;
  ageMinutes: number;
  marketCapSol: number;
  marketCapRetentionPct: number;
  tradeCount: number;
  verdict: VerdictKind;
  timing: TimingKind;
  factsHash: string;
  graduated: boolean | null;
  rugged: null;
  survived: null;
  runner100k: null;
};

export type OutcomeTapeEntry = {
  v: 1;
  mint: string;
  name: string;
  symbol: string;
  source: "live";
  createdAt: number;
  firstSeenAt: number;
  lastSeenAt: number;
  baselineMarketCapSol: number;
  rulesetVersion: string;
  checkpoints: OutcomeCheckpoint[];
};

function graduated(pool: string): boolean | null {
  if (pool === "pump") return false;
  if (pool === "pump-amm" || pool === "pumpswap") return true;
  return null;
}

function checkpoint(
  kind: OutcomeCheckpointKind,
  entry: OutcomeTapeEntry,
  sample: OutcomeTapeSample,
  recordedAt: number,
): OutcomeCheckpoint {
  return {
    kind,
    recordedAt,
    ageMinutes: Math.max(
      0,
      Math.floor((recordedAt - sample.createdAt) / 60_000),
    ),
    marketCapSol: sample.marketCapSol,
    marketCapRetentionPct:
      entry.baselineMarketCapSol > 0
        ? (sample.marketCapSol / entry.baselineMarketCapSol) * 100
        : 0,
    tradeCount: sample.tradeCount,
    verdict: sample.verdict,
    timing: sample.timing,
    factsHash: sample.factsHash,
    graduated: graduated(sample.pool),
    rugged: null,
    survived: null,
    runner100k: null,
  };
}

export function mergeOutcomeTape(
  current: readonly OutcomeTapeEntry[],
  samples: readonly OutcomeTapeSample[],
  now: number,
): OutcomeTapeEntry[] {
  const byMint = new Map(current.map((entry) => [entry.mint, entry]));

  for (const sample of samples) {
    const existing = byMint.get(sample.mint);
    const entry: OutcomeTapeEntry =
      existing ?? {
        v: 1,
        mint: sample.mint,
        name: sample.name,
        symbol: sample.symbol,
        source: "live",
        createdAt: sample.createdAt,
        firstSeenAt: sample.observedAt,
        lastSeenAt: sample.observedAt,
        baselineMarketCapSol: sample.marketCapSol,
        rulesetVersion: sample.rulesetVersion,
        checkpoints: [],
      };
    const checkpoints = [...entry.checkpoints];
    if (!checkpoints.some((item) => item.kind === "FIRST_SEEN")) {
      checkpoints.push(checkpoint("FIRST_SEEN", entry, sample, sample.observedAt));
    }
    const ageMs = now - sample.createdAt;
    if (
      ageMs >= 30 * 60_000 &&
      !checkpoints.some((item) => item.kind === "THIRTY_MINUTES")
    ) {
      checkpoints.push(checkpoint("THIRTY_MINUTES", entry, sample, now));
    }
    if (
      ageMs >= 24 * 60 * 60_000 &&
      !checkpoints.some((item) => item.kind === "TWENTY_FOUR_HOURS")
    ) {
      checkpoints.push(checkpoint("TWENTY_FOUR_HOURS", entry, sample, now));
    }
    byMint.set(sample.mint, {
      ...entry,
      name: sample.name,
      symbol: sample.symbol,
      lastSeenAt: Math.max(entry.lastSeenAt, sample.observedAt),
      rulesetVersion: sample.rulesetVersion,
      checkpoints,
    });
  }

  return [...byMint.values()]
    .sort(
      (left, right) =>
        right.firstSeenAt - left.firstSeenAt ||
        left.mint.localeCompare(right.mint),
    )
    .slice(0, 500);
}
