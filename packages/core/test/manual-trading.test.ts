import { describe, expect, it } from "vitest";
import {
  PUMP_PROGRAM_ID,
  PUMPSWAP_PROGRAM_ID,
  assertManualBuyTransactionSafe,
  type ManualBuyTransactionSummary,
} from "../src";

const signer = "6hwUCrUfQwVNNUScKshSvksJK7rNC2JphioJztjdEEcr";
const mint = "BQAeeSowpwEx8Km8GcporcbuLKq4a7EQceH3F2qZpump";
const wrappedSol = "So11111111111111111111111111111111111111112";
const tokenProgram = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const systemProgram = "11111111111111111111111111111111";
const associatedTokenProgram =
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const computeBudgetProgram =
  "ComputeBudget111111111111111111111111111111";

function transaction(): ManualBuyTransactionSummary {
  return {
    feePayer: signer,
    requiredSigners: [signer],
    addressLookupTableCount: 0,
    expectedMint: mint,
    maxTradeSpendLamports: 10_500_000,
    maxPriorityFeeLamports: 1_000_000,
    maxTipLamports: 100_000,
    instructions: [
      {
        programId: associatedTokenProgram,
        dataHex: "01",
        accountKeys: [
          signer,
          "wrapped-sol-account",
          signer,
          wrappedSol,
          systemProgram,
          tokenProgram,
        ],
      },
      {
        programId: systemProgram,
        dataHex: "02000000a037a00000000000",
        accountKeys: [signer, "wrapped-sol-account"],
      },
      {
        programId: tokenProgram,
        dataHex: "11",
        accountKeys: ["wrapped-sol-account"],
      },
      {
        programId: PUMPSWAP_PROGRAM_ID,
        dataHex: "66063d1201daebea0000000000000000a037a0000000000001",
        accountKeys: ["pool", signer, "global", mint, wrappedSol],
      },
      {
        programId: tokenProgram,
        dataHex: "09",
        accountKeys: ["wrapped-sol-account", signer, signer],
      },
      {
        programId: systemProgram,
        dataHex: "0200000050c3000000000000",
        accountKeys: [signer, "bounded-tip-account"],
      },
      {
        programId: computeBudgetProgram,
        dataHex: "0290d00300",
        accountKeys: [],
      },
      {
        programId: computeBudgetProgram,
        dataHex: "0300093d0000000000",
        accountKeys: [],
      },
    ],
  };
}

describe("decoded manual transaction firewall", () => {
  it("accepts a bounded PumpSwap buy fixture", () => {
    expect(assertManualBuyTransactionSafe(transaction())).toMatchObject({
      decodedSwap: "pumpswap-buy",
      fundedLamports: 10_500_000,
      tippedLamports: 50_000,
      priorityFeeLamports: 1_000_000,
    });
  });

  it("rejects instruction, mint, spend, tip, and compute mutations", () => {
    const base = transaction();
    const cases: ManualBuyTransactionSummary[] = [
      {
        ...base,
        instructions: [
          ...base.instructions,
          { programId: tokenProgram, dataHex: "04", accountKeys: [] },
        ],
      },
      { ...base, expectedMint: "wrong-mint" },
      { ...base, maxTradeSpendLamports: 10_499_999 },
      { ...base, maxTipLamports: 49_999 },
      { ...base, maxPriorityFeeLamports: 999_999 },
      {
        ...base,
        instructions: [
          ...base.instructions,
          {
            programId: PUMPSWAP_PROGRAM_ID,
            dataHex: "66063d1201daebea0000000000000000a037a00000000000",
            accountKeys: ["pool", signer, "global", mint, wrappedSol],
          },
        ],
      },
    ];

    for (const mutated of cases) {
      expect(() => assertManualBuyTransactionSafe(mutated)).toThrow();
    }
  });

  it("keeps bonding-curve sends locked until v3 bytes are decoded", () => {
    const base = transaction();
    expect(() =>
      assertManualBuyTransactionSafe({
        ...base,
        instructions: [
          {
            programId: PUMP_PROGRAM_ID,
            dataHex: "00",
            accountKeys: [],
          },
        ],
      }),
    ).toThrow(/Curve buys stay locked/);
  });
});
