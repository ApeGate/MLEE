import { describe, expect, it } from "vitest";
import { selectHolderEvidence } from "./holder-evidence";

describe("selectHolderEvidence", () => {
  it("uses populated external evidence and removes program-owned balances", () => {
    const result = selectHolderEvidence({
      reportHolders: [
        { owner: "curve", pct: 80 },
        { owner: "creator", pct: 7 },
        { owner: "holder", pct: 5 },
      ],
      rpcHolders: [{ owner: "rpc-holder", pct: 4 }],
      knownAccounts: { curve: { type: "PROGRAM" } },
      bondingCurve: "curve",
      creator: "creator",
      rpcSource: "Helius mainnet RPC",
    });

    expect(result.holders.map((holder) => holder.owner)).toEqual([
      "creator",
      "holder",
    ]);
    expect(result.devPct).toBe(7);
    expect(result.top10Pct).toBe(12);
    expect(result.source).toBe("external risk scan");
  });

  it("falls back to Helius when an external report has no user holders", () => {
    const result = selectHolderEvidence({
      reportHolders: [{ owner: "curve", pct: 100 }],
      rpcHolders: [{ owner: "live-holder", pct: 3.25 }],
      knownAccounts: {},
      bondingCurve: "curve",
      creator: "creator",
      rpcSource: "Helius mainnet RPC",
    });

    expect(result.holders).toEqual([{ owner: "live-holder", pct: 3.25 }]);
    expect(result.devPct).toBeNull();
    expect(result.top10Pct).toBe(3.25);
    expect(result.source).toBe("Helius mainnet RPC");
  });

  it("leaves concentration and creator share unknown without holders", () => {
    expect(
      selectHolderEvidence({
        reportHolders: [],
        rpcHolders: [],
        knownAccounts: {},
        bondingCurve: null,
        creator: "creator",
        rpcSource: "Helius mainnet RPC",
      }),
    ).toMatchObject({
      holders: [],
      devPct: null,
      top10Pct: null,
      source: null,
    });
  });
});
