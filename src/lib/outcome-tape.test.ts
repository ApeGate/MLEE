import { describe, expect, it } from "vitest";
import {
  mergeOutcomeTape,
  type OutcomeTapeSample,
} from "./outcome-tape";

const createdAt = 1_800_000_000_000;

function sample(overrides: Partial<OutcomeTapeSample> = {}): OutcomeTapeSample {
  return {
    mint: "Mint1111111111111111111111111111111111111",
    name: "Tape coin",
    symbol: "TAPE",
    source: "live",
    createdAt,
    observedAt: createdAt + 5_000,
    marketCapSol: 30,
    tradeCount: 5,
    pool: "pump",
    verdict: "WAIT",
    timing: "EARLY",
    factsHash: "first-facts",
    rulesetVersion: "gate-1.2.0",
    ...overrides,
  };
}

describe("local outcome tape", () => {
  it("records first sight without inventing performance labels", () => {
    const [entry] = mergeOutcomeTape([], [sample()], createdAt + 5_000);
    expect(entry?.checkpoints).toEqual([
      expect.objectContaining({
        kind: "FIRST_SEEN",
        marketCapSol: 30,
        graduated: false,
        rugged: null,
        survived: null,
        runner100k: null,
      }),
    ]);
  });

  it("adds deterministic 30-minute and 24-hour checkpoints once", () => {
    const first = mergeOutcomeTape([], [sample()], createdAt + 5_000);
    const thirty = mergeOutcomeTape(
      first,
      [
        sample({
          observedAt: createdAt + 31 * 60_000,
          marketCapSol: 15,
          tradeCount: 40,
          verdict: "WARN",
          timing: "SETTLING",
          factsHash: "thirty-facts",
        }),
      ],
      createdAt + 31 * 60_000,
    );
    const day = mergeOutcomeTape(
      thirty,
      [
        sample({
          observedAt: createdAt + 25 * 60 * 60_000,
          marketCapSol: 45,
          pool: "pumpswap",
          verdict: "PASS",
          timing: "SURVIVOR",
          factsHash: "day-facts",
        }),
      ],
      createdAt + 25 * 60 * 60_000,
    );
    const repeated = mergeOutcomeTape(
      day,
      [sample({ observedAt: createdAt + 26 * 60 * 60_000 })],
      createdAt + 26 * 60 * 60_000,
    );

    expect(day[0]?.checkpoints.map((item) => item.kind)).toEqual([
      "FIRST_SEEN",
      "THIRTY_MINUTES",
      "TWENTY_FOUR_HOURS",
    ]);
    expect(day[0]?.checkpoints[1]?.marketCapRetentionPct).toBe(50);
    expect(day[0]?.checkpoints[2]?.graduated).toBe(true);
    expect(repeated[0]?.checkpoints).toHaveLength(3);
  });

  it("returns identical output for the same tape, samples, and clock", () => {
    const first = mergeOutcomeTape([], [sample()], createdAt + 5_000);
    const second = mergeOutcomeTape([], [sample()], createdAt + 5_000);
    expect(second).toEqual(first);
  });
});
