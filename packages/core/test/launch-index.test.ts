import { describe, expect, it } from "vitest";
import {
  indexSessionLaunches,
  normalizeLaunchIdentity,
  type LaunchFacts,
} from "../src";

const asOf = 1_800_000_000_000;

function launch(
  mint: string,
  overrides: Partial<LaunchFacts> = {},
): LaunchFacts {
  return {
    mint,
    name: `Coin ${mint}`,
    symbol: mint,
    creator: `creator-${mint}`,
    uri: "https://example.com/meta.json",
    createdAt: asOf,
    observedAt: asOf,
    marketCapSol: 30,
    initialBuySol: 0,
    isMayhem: false,
    pool: "pump",
    ...overrides,
  };
}

describe("rolling session launch index", () => {
  it("normalizes ticker and name punctuation deterministically", () => {
    expect(normalizeLaunchIdentity("  $F.R-Ö_G! ")).toBe("frog");
    expect(normalizeLaunchIdentity("Evening Star AI")).toBe(
      normalizeLaunchIdentity("EveningStarAI"),
    );
  });

  it("counts creator launches inside rolling 1h, 24h, and 7d windows", () => {
    const creator = "serial-creator";
    const indexed = indexSessionLaunches(
      [
        launch("hour", {
          creator,
          createdAt: asOf - 30 * 60_000,
        }),
        launch("day", {
          creator,
          createdAt: asOf - 2 * 60 * 60_000,
        }),
        launch("week", {
          creator,
          createdAt: asOf - 2 * 24 * 60 * 60_000,
        }),
        launch("old", {
          creator,
          createdAt: asOf - 8 * 24 * 60 * 60_000,
        }),
      ],
      asOf,
    );

    expect(indexed[0]).toMatchObject({
      creatorLaunches1h: 1,
      creatorLaunches24h: 2,
      creatorLaunches7d: 3,
      launchIndexScope: "session",
      launchIndexLabel: "This session",
    });
  });

  it("groups ticker or name clones, ranks by launch time, and names a leader", () => {
    const indexed = indexSessionLaunches(
      [
        launch("mint-a", {
          name: "Alpha Coin",
          symbol: "ALPHA",
          createdAt: asOf - 3_000,
          marketCapSol: 30,
        }),
        launch("mint-b", {
          name: "Beta Coin",
          symbol: "$A.L-PHA",
          createdAt: asOf - 2_000,
          marketCapSol: 80,
        }),
        launch("mint-c", {
          name: "BetaCoin",
          symbol: "BETA",
          createdAt: asOf - 1_000,
          marketCapSol: 50,
        }),
        launch("mint-d", {
          name: "Different",
          symbol: "DIFF",
          marketCapSol: 100,
        }),
      ],
      asOf,
    );

    expect(
      indexed.slice(0, 3).map((item) => ({
        count: item.cloneCount1h,
        rank: item.cloneRank1h,
        leader: item.cloneLeaderMint,
      })),
    ).toEqual([
      { count: 3, rank: 1, leader: "mint-b" },
      { count: 3, rank: 2, leader: "mint-b" },
      { count: 3, rank: 3, leader: "mint-b" },
    ]);
    expect(indexed[3]).toMatchObject({
      cloneCount1h: 1,
      cloneRank1h: 1,
      cloneLeaderMint: "mint-d",
    });
  });

  it("counts reused website, X, and image evidence inside 24 hours", () => {
    const indexed = indexSessionLaunches(
      [
        launch("mint-a", {
          websiteTemplateHash: "template",
          xHandle: "FrogOrigin",
          imageHash: "image",
        }),
        launch("mint-b", {
          websiteTemplateHash: "template",
          xHandle: "frogorigin",
          imageHash: "image",
        }),
        launch("mint-old", {
          createdAt: asOf - 25 * 60 * 60_000,
          websiteTemplateHash: "template",
          xHandle: "FrogOrigin",
          imageHash: "image",
        }),
      ],
      asOf,
    );

    expect(indexed[0]).toMatchObject({
      websiteTemplateReuse24h: 2,
      xReuseCount24h: 2,
      imageCloneCount24h: 2,
    });
  });

  it("keeps output stable and leaves source facts untouched", () => {
    const source = [
      launch("mint-a", { name: "Clone", symbol: "ONE" }),
      launch("mint-b", { name: "Clone", symbol: "TWO" }),
    ];
    const first = indexSessionLaunches(source, asOf);
    const second = indexSessionLaunches(source, asOf);

    expect(second).toEqual(first);
    expect(source[0]?.creatorLaunches1h).toBeUndefined();
  });
});
