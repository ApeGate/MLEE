import { describe, expect, it } from "vitest";
import {
  APEGATE_FEE_BPS,
  canonicalize,
  createReceipt,
  estimateFees,
  evaluateGate,
  hashCanonical,
  isOfficialApegateMint,
  officialTokenManifestHash,
  preflightLaunch,
  resemblesApegateIdentity,
  verifyReceipt,
  verifyReceiptChain,
  type LaunchDraft,
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

describe("Kong gate-1.1.0", () => {
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

  it("blocks Apegate impersonators unless the exact official CA matches", async () => {
    const fake = await evaluateGate(
      { ...safeFacts, name: "Ape Gate", symbol: "APEG8" },
      "standard",
      now,
    );
    expect(fake.kind).toBe("BLOCK");
    expect(
      fake.checks.find((check) => check.id === "impersonation_apegate")
        ?.outcome,
    ).toBe("fail");

    const officialMint = "So11111111111111111111111111111111111111112";
    const official = await evaluateGate(
      {
        ...safeFacts,
        mint: officialMint,
        name: "Apegate",
        symbol: "APEGATE",
      },
      "standard",
      now,
      { officialApegateMint: officialMint },
    );
    expect(official.kind).toBe("PASS");
    expect(
      official.checks.find((check) => check.id === "impersonation_apegate")
        ?.value,
    ).toBe("Official CA");
  });
});

describe("official Apegate token identity", () => {
  it("catches spacing, leetspeak, and close protected variants", () => {
    expect(resemblesApegateIdentity("Ape Gate")).toBe(true);
    expect(resemblesApegateIdentity("APEG8")).toBe(true);
    expect(resemblesApegateIdentity("Apegaet")).toBe(true);
    expect(resemblesApegateIdentity("Banana Hours")).toBe(false);
  });

  it("accepts only a valid exact configured mint", async () => {
    const mint = "So11111111111111111111111111111111111111112";
    expect(isOfficialApegateMint(mint, mint)).toBe(true);
    expect(isOfficialApegateMint(`${mint}x`, mint)).toBe(false);
    expect(isOfficialApegateMint("not-a-mint", "not-a-mint")).toBe(false);
    await expect(officialTokenManifestHash()).resolves.toMatch(/^[a-f0-9]{64}$/);
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

const safeLaunch: LaunchDraft = {
  name: "Banana Hours",
  symbol: "BNNA",
  description:
    "A transparent community coin with a complete launch description.",
  imageUrl: "https://example.com/banana.png",
  website: "https://example.com",
  socialUrl: "",
  quoteAsset: "SOL",
  holderRewards: false,
  mayhemMode: false,
  devBuyPct: 4,
  guardrailsAccepted: true,
};

describe("Launch Bay preparation", () => {
  it("prepares a complete low-allocation draft without enabling a build", async () => {
    const preflight = await preflightLaunch(safeLaunch);
    expect(preflight.kind).toBe("PREPARED");
    expect(preflight.readyForBuild).toBe(false);
    expect(preflight.metadataHash).toMatch(/^[a-f0-9]{64}$/);
    expect(preflight.pendingServerChecks.length).toBeGreaterThan(0);
  });

  it("warns when the creator buy crosses Kong's warning line", async () => {
    const preflight = await preflightLaunch({
      ...safeLaunch,
      devBuyPct: 8,
    });
    expect(preflight.kind).toBe("WARN");
    expect(
      preflight.checks.find((check) => check.id === "dev_buy")?.outcome,
    ).toBe("warn");
  });

  it("blocks protected identities, large creator buys, and rejected guardrails", async () => {
    const preflight = await preflightLaunch({
      ...safeLaunch,
      name: "Ape Gate Official",
      symbol: "APEGATE",
      devBuyPct: 22,
      guardrailsAccepted: false,
    });
    expect(preflight.kind).toBe("BLOCK");
    expect(
      preflight.checks.filter((check) => check.outcome === "fail").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("blocks APEG8 as a protected ticker variant", async () => {
    const preflight = await preflightLaunch({
      ...safeLaunch,
      symbol: "APEG8",
    });
    expect(preflight.kind).toBe("BLOCK");
    expect(
      preflight.checks.find((check) => check.id === "identity")?.outcome,
    ).toBe("fail");
  });
});
