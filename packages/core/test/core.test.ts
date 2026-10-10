import { describe, expect, it } from "vitest";
import {
  APEGATE_FEE_BPS,
  applyPaperBuy,
  applyPaperSell,
  assertManualBuyTransactionSafe,
  authorizeMainnetCanaryBuy,
  buildLabReport,
  canonicalize,
  createPlanSpec,
  createPaperPortfolio,
  createReceipt,
  createVaultPolicyPreview,
  estimateFees,
  evaluateGate,
  explainReceiptDeterministically,
  hashCanonical,
  isOfficialApegateMint,
  isSafeRafikiNarrative,
  officialTokenManifestHash,
  paperPositionValue,
  preflightLaunch,
  quotePaperBuy,
  quotePaperSell,
  rehearsePlan,
  resemblesApegateIdentity,
  verifyReceipt,
  verifyReceiptChain,
  type LaunchDraft,
  type LaunchFacts,
  type PlanDraft,
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
  launchSecondBuyout: false,
  clusterRetainedPct: 0,
  deployerPulledPool: false,
  manufacturedCap: false,
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
      evidence: [{ kind: "tx", ref: safeFacts.signature ?? safeFacts.mint }],
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

describe("Kong gate-1.2.0", () => {
  it("passes complete, safe facts", async () => {
    const verdict = await evaluateGate(safeFacts, "standard", now);
    expect(verdict.kind).toBe("PASS");
    expect(verdict.score).toBe(100);
    expect(verdict.rulesetVersion).toBe("gate-1.2.0");
    expect(verdict.timing.kind).toBe("CHASE_WINDOW");
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

  it("waits on unresolved hard trench facts", async () => {
    const verdict = await evaluateGate(
      { ...safeFacts, launchSecondBuyout: null },
      "standard",
      now,
    );
    expect(verdict.kind).toBe("WAIT");
    expect(
      verdict.checks.find((check) => check.id === "launch_second_buyout")
        ?.outcome,
    ).toBe("unknown");
  });

  it("hard-blocks a retained launch-second buyout", async () => {
    const verdict = await evaluateGate(
      {
        ...safeFacts,
        launchSecondBuyout: true,
        clusterRetainedPct: 61,
      },
      "standard",
      now,
    );
    expect(verdict.kind).toBe("BLOCK");
    expect(verdict.topReasons.join(" ")).toContain("Insiders still hold");
  });

  it("blocks serial creators and keeps social positives from rescuing them", async () => {
    const risky = {
      ...safeFacts,
      creatorLaunches1h: 3,
      creatorLaunches24h: 7,
    };
    const bare = await evaluateGate(risky, "standard", now);
    const polished = await evaluateGate(
      {
        ...risky,
        websiteUrl: "https://example.com",
        websiteReachable: true,
        websiteMentionsToken: true,
        websiteMatchesX: true,
        xLinkType: "profile" as const,
        telegramPresent: true,
        originatorConfirmed: true,
      },
      "standard",
      now,
    );
    expect(bare.kind).toBe("BLOCK");
    expect(polished.kind).toBe("BLOCK");
  });

  it("separates second-leg timing from the Gate verdict", async () => {
    const verdict = await evaluateGate(
      {
        ...safeFacts,
        createdAt: now - 20 * 60_000,
        drawdownFromFirstPeakPct: 45,
        reclaimedFiveMinuteVwap: true,
        newOutsideBuyers: 38,
      },
      "standard",
      now,
    );
    expect(verdict.kind).toBe("PASS");
    expect(verdict.timing).toMatchObject({
      kind: "SECOND_LEG",
      entryAllowed: true,
    });
  });

  it("is deterministic for the same facts and clock", async () => {
    const first = await evaluateGate(safeFacts, "standard", now);
    const second = await evaluateGate(safeFacts, "standard", now);
    expect(second).toEqual(first);
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

describe("manual mainnet canary boundaries", () => {
  it("authorizes only a fresh PASS inside the funded test range", async () => {
    const verdict = await evaluateGate(safeFacts, "standard", now);
    expect(
      authorizeMainnetCanaryBuy({
        amountSol: 0.01,
        balanceSol: 0.1,
        expectedSigner: "wallet",
        actualSigner: "wallet",
        verdict,
        now,
      }),
    ).toMatchObject({
      mint: safeFacts.mint,
      amountSol: 0.01,
      factsHash: verdict.factsHash,
    });

    expect(() =>
      authorizeMainnetCanaryBuy({
        amountSol: 0.051,
        balanceSol: 0.1,
        expectedSigner: "wallet",
        actualSigner: "wallet",
        verdict,
        now,
      }),
    ).toThrow(/between 0.01 and 0.05 SOL/);
    expect(() =>
      authorizeMainnetCanaryBuy({
        amountSol: 0.01,
        balanceSol: 0.1,
        expectedSigner: "wallet",
        actualSigner: "wallet",
        verdict,
        now: verdict.freshUntil + 1,
      }),
    ).toThrow(/expired/);
  });

  it("rejects extra signers, lookup tables, and unapproved programs", () => {
    const base = {
      feePayer: "wallet",
      requiredSigners: ["wallet"],
      addressLookupTableCount: 0,
      programIds: [
        "11111111111111111111111111111111",
        "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
      ],
    };
    expect(assertManualBuyTransactionSafe(base).programIds).toHaveLength(2);
    expect(() =>
      assertManualBuyTransactionSafe({
        ...base,
        programIds: [...base.programIds, "UnknownProgram"],
      }),
    ).toThrow(/unapproved programs/);
    expect(() =>
      assertManualBuyTransactionSafe({
        ...base,
        addressLookupTableCount: 1,
      }),
    ).toThrow(/lookup tables/);
  });
});

describe("paper trading engine", () => {
  it("quotes the locked fee and applies a deterministic paper buy", () => {
    const quote = quotePaperBuy(safeFacts, 0.25, 800);
    const first = applyPaperBuy(createPaperPortfolio(10), quote, now);

    expect(quote.model).toBe("market-cap-estimate-v1");
    expect(quote.fees.apegateFee).toBe(0.00125);
    expect(quote.minimumTokens).toBeLessThan(quote.tokenAmount);
    expect(first.portfolio.cashSol).toBeCloseTo(10 - quote.totalSol, 12);
    expect(first.portfolio.positions[0]?.tokens).toBeCloseTo(
      quote.tokenAmount,
      8,
    );
    expect(first.fill.source).toBe("paper");
  });

  it("marks and sells a paper position without exceeding its size", () => {
    const buy = quotePaperBuy(safeFacts, 0.5);
    const opened = applyPaperBuy(createPaperPortfolio(2), buy, now).portfolio;
    const position = opened.positions[0]!;
    expect(paperPositionValue(position, safeFacts.marketCapSol)).toBeGreaterThan(
      0,
    );

    const sell = quotePaperSell(
      { ...safeFacts, marketCapSol: safeFacts.marketCapSol * 1.5 },
      position.tokens / 2,
    );
    const closed = applyPaperSell(opened, sell, now + 1_000);
    expect(closed.portfolio.positions[0]?.tokens).toBeCloseTo(
      position.tokens / 2,
      8,
    );
    expect(closed.fill.realizedPnlSol).toBeGreaterThan(0);
    expect(() =>
      applyPaperSell(
        closed.portfolio,
        { ...sell, tokenAmount: position.tokens },
        now + 2_000,
      ),
    ).toThrow(/below the quoted token amount/);
  });

  it("rejects an over-cap paper buy", () => {
    const quote = quotePaperBuy(safeFacts, 1);
    expect(() =>
      applyPaperBuy(createPaperPortfolio(0.25), quote, now),
    ).toThrow(/below the quoted total/);
  });
});

const safePlan: PlanDraft = {
  name: "First ten minutes",
  template: "first-minutes",
  profile: "strict",
  sizeSol: 0.1,
  perTradeCapSol: 0.25,
  dailySpendCapSol: 1,
  slippageBps: 800,
  exitTemplate: "quick-flip",
  approvalRequired: true,
  coolOffAfterLosses: 3,
  coolOffMinutes: 15,
};

describe("plans and Vault previews", () => {
  it("locks a validated plan and rehearses eligibility on deterministic tape", async () => {
    const spec = createPlanSpec(safePlan, now);
    const verdict = await evaluateGate(safeFacts, "strict", now);
    const rehearsal = await rehearsePlan(spec, [{ facts: safeFacts, verdict }]);

    expect(Object.isFrozen(spec)).toBe(true);
    expect(spec.executionEnabled).toBe(false);
    expect(rehearsal.status).toBe("eligibility-only");
    expect(rehearsal.gateEligible).toBe(1);
    expect(rehearsal.planHash).toMatch(/^[a-f0-9]{64}$/);
    expect(() =>
      createPlanSpec(
        { ...safePlan, sizeSol: 0.5, perTradeCapSol: 0.25 },
        now,
      ),
    ).toThrow(/per-trade cap/);
  });

  it("hashes a disabled Privy policy with withdrawals fixed to the owner", async () => {
    const ownerWallet = "So11111111111111111111111111111111111111112";
    const preview = await createVaultPolicyPreview(
      {
        ownerWallet,
        perTradeCapSol: 0.25,
        dailySpendCapSol: 1,
        maxOpenPositions: 5,
        profitSweepPct: 75,
        allowedPrograms: ["pump", "pumpswap"],
      },
      now,
    );
    expect(preview.provider).toBe("privy");
    expect(preview.withdrawalsTo).toBe(ownerWallet);
    expect(preview.executionEnabled).toBe(false);
    expect(preview.externalReviewComplete).toBe(false);
    expect(preview.policyHash).toMatch(/^[a-f0-9]{64}$/);
    await expect(
      createVaultPolicyPreview(
        {
          ownerWallet,
          perTradeCapSol: 1,
          dailySpendCapSol: 0.5,
          maxOpenPositions: 5,
          profitSweepPct: 75,
          allowedPrograms: ["pump"],
        },
        now,
      ),
    ).rejects.toThrow(/Daily cap/);
  });
});

describe("Lab replay and Rafiki boundaries", () => {
  it("produces the same limited Lab report for the same tape", async () => {
    const verdict = await evaluateGate(safeFacts, "standard", now);
    const samples = [{ facts: safeFacts, verdict }];
    const first = await buildLabReport(samples);
    const second = await buildLabReport(samples);

    expect(first.replayHash).toBe(second.replayHash);
    expect(first.sampleSize).toBe(1);
    expect(first.outcomesAvailable).toBe(false);
    expect(first.precision).toBeNull();
    expect(first.missingInputs.length).toBeGreaterThan(0);
  });

  it("explains only receipt facts and rejects unsafe AI narrative", async () => {
    const receipt = await createReceipt({
      kind: "paper_fill",
      actor: "caesar",
      subject: { mint: safeFacts.mint },
      at: { ts: now },
      inputs: { params: { model: "market-cap-estimate-v1" } },
      outputs: {
        side: "BUY",
        symbol: safeFacts.symbol,
        quoteAmountSol: 0.1,
        feeSol: 0.00175,
      },
      evidence: [],
      source: "paper",
      prev: null,
    });
    const explanation = explainReceiptDeterministically(receipt);
    expect(explanation.headline).toContain("fill explained");
    expect(explanation.explanation).toContain("simulated");
    expect(isSafeRafikiNarrative("The receipt records a warning.")).toBe(true);
    expect(isSafeRafikiNarrative("Buy now at 0.1 SOL.")).toBe(false);
    expect(isSafeRafikiNarrative("Increase the position size.")).toBe(false);
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
