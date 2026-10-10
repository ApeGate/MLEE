import { describe, expect, it } from "vitest";
import {
  APEGATE_FEE_BPS,
  canonicalize,
  createReceipt,
  estimateFees,
  evaluateGate,
  hashCanonical,
  verifyReceipt,
  verifyReceiptChain,
  type LaunchFacts,
} from "../src";

const now = 1_800_000_000_000;

const safeFacts: LaunchFacts = {
  mint: "SafeMint111111111111111111111111111111111",
  signature: "SafeSignature111111111111111111111111111",
  name: "Banana Gate",
  symbol: "GATE",
  creator: "Creator11111111111111111111111111111111",
  uri: "https://example.com/metadata.json",
  createdAt: now - 60_000,
  observedAt: now,
  marketCapSol: 32,
  initialBuySol: 0.4,
  isMayhem: false,
  pool: "pump",
  tradeCount: 12,
  mintAuthority: null,
  freezeAuthority: null,
  devPct: 2,
  top10Pct: 18,
  rugScore: 4,
  rugRisks: [],
};

describe("canonical JSON and receipt hashing", () => {
  it("sorts keys recursively and matches a SHA-256 golden vector", async () => {
    const value = { b: 2, a: 1, nested: { z: true, c: "ape" } };
    expect(canonicalize(value)).toBe(
      '{"a":1,"b":2,"nested":{"c":"ape","z":true}}',
    );
    await expect(hashCanonical({ b: 2, a: 1 })).resolves.toBe(
      "43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777",
    );
  });

  it("creates tamper-evident, linked receipts", async () => {
    const first = await createReceipt({
      kind: "verdict",
      actor: "kong",
      subject: { mint: safeFacts.mint },
      at: { ts: now },
      inputs: { factsHash: "facts", rulesetVersion: "gate-1.0.0" },
      outputs: { verdict: "PASS", score: 100 },
      evidence: [{ kind: "tx", ref: safeFacts.signature }],
      source: "replay",
      prev: null,
    });
    const second = await createReceipt({
      kind: "connect",
      actor: "user",
      subject: { wallet: "Wallet111" },
      at: { ts: now + 1 },
      inputs: {},
      outputs: { mode: "manual" },
      evidence: [],
      source: "replay",
      prev: first.hash,
    });

    await expect(verifyReceipt(first)).resolves.toBe(true);
    await expect(verifyReceiptChain([first, second])).resolves.toBe(true);
    await expect(
      verifyReceipt({ ...first, outputs: { verdict: "BLOCK" } }),
    ).resolves.toBe(false);
  });
});

describe("Kong gate-1.0.0", () => {
  it("passes complete, safe facts", async () => {
    const verdict = await evaluateGate(safeFacts, "standard", now);
    expect(verdict.kind).toBe("PASS");
    expect(verdict.score).toBe(100);
    expect(verdict.checks.every((check) => check.evidence.length > 0)).toBe(true);
  });

  it("waits when there is too little tape", async () => {
    const verdict = await evaluateGate(
      { ...safeFacts, createdAt: now - 5_000, tradeCount: 2 },
      "standard",
      now,
    );
    expect(verdict.kind).toBe("WAIT");
    expect(verdict.topReasons.join(" ")).toContain("old");
  });

  it("warns at a soft threshold", async () => {
    const verdict = await evaluateGate(
      { ...safeFacts, devPct: 8 },
      "standard",
      now,
    );
    expect(verdict.kind).toBe("WARN");
    expect(verdict.checks.find((check) => check.id === "dev_pct")?.outcome).toBe(
      "warn",
    );
  });

  it("blocks active authorities and soft block thresholds", async () => {
    const authority = await evaluateGate(
      { ...safeFacts, mintAuthority: "ActiveAuthority" },
      "standard",
      now,
    );
    const concentration = await evaluateGate(
      { ...safeFacts, top10Pct: 54 },
      "standard",
      now,
    );
    expect(authority.kind).toBe("BLOCK");
    expect(concentration.kind).toBe("BLOCK");
  });
});

describe("fees", () => {
  it("locks the Apegate fee at 0.5%", () => {
    expect(APEGATE_FEE_BPS).toBe(50);
    expect(estimateFees(1, 125, 0.001)).toEqual({
      quoteAmount: 1,
      protocolFee: 0.0125,
      apegateFee: 0.005,
      networkEstimate: 0.001,
      total: 1.0185,
    });
  });
});
