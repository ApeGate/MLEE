import { describe, expect, it } from "vitest";
import {
  CANARY_WALLET,
  PUBLIC_CANARY_FILLS,
  verifyCanaryTransaction,
} from "./public-canary-fills";

function transactionFor(index: number) {
  const fill = PUBLIC_CANARY_FILLS[index]!;
  const preWallet = 500_000_000;
  const tokenDelta = BigInt(fill.expectedTokenDeltaBaseUnits);
  const startingTokens = tokenDelta < BigInt(0) ? -tokenDelta : BigInt(0);
  return {
    slot: fill.expectedSlot,
    blockTime: 1_760_000_000,
    meta: {
      err: null,
      fee: 5_000,
      preBalances: [preWallet],
      postBalances: [preWallet + fill.expectedSolDeltaLamports],
      preTokenBalances: [
        {
          owner: CANARY_WALLET,
          mint: fill.mint,
          uiTokenAmount: {
            amount: startingTokens.toString(),
            decimals: fill.tokenDecimals,
          },
        },
      ],
      postTokenBalances: [
        {
          owner: CANARY_WALLET,
          mint: fill.mint,
          uiTokenAmount: {
            amount: (startingTokens + tokenDelta).toString(),
            decimals: fill.tokenDecimals,
          },
        },
      ],
    },
    transaction: {
      signatures: [fill.signature],
      message: {
        accountKeys: [{ pubkey: CANARY_WALLET, signer: true }],
      },
    },
  };
}

describe("public canary fill verification", () => {
  it("derives deltas only after matching the wallet, mint, signature, and slot", () => {
    const fill = PUBLIC_CANARY_FILLS[0]!;
    const verified = verifyCanaryTransaction(fill, transactionFor(0));

    expect(verified.confirmed).toBe(true);
    expect(verified.wallet).toBe(CANARY_WALLET);
    expect(verified.solDelta).toBe(-0.009954108);
    expect(verified.tokenDelta).toBe(122.964775);
    expect(verified.solscan).toContain(fill.signature);
  });

  it("rejects a transaction whose published balance delta changed", () => {
    const fill = PUBLIC_CANARY_FILLS[1]!;
    const transaction = transactionFor(1);
    transaction.meta.postBalances[0] += 1;

    expect(() => verifyCanaryTransaction(fill, transaction)).toThrow(
      "SOL delta does not match",
    );
  });

  it("rejects token evidence for a different owner", () => {
    const fill = PUBLIC_CANARY_FILLS[2]!;
    const transaction = transactionFor(2);
    transaction.meta.postTokenBalances[0]!.owner =
      "So11111111111111111111111111111111111111112";

    expect(() => verifyCanaryTransaction(fill, transaction)).toThrow(
      "token delta does not match",
    );
  });

  it("verifies the partial CATE exit receipt", () => {
    const fill = PUBLIC_CANARY_FILLS[3]!;
    const verified = verifyCanaryTransaction(fill, transactionFor(3));

    expect(verified.side).toBe("SELL");
    expect(verified.solDelta).toBe(0.004016847);
    expect(verified.tokenDelta).toBe(-10.205276);
    expect(verified.receiptHash).toBe(
      "3bd91732c125823535d6b97df52422a8f73a7ab1a8437c35696746d1bcf81dc5",
    );
  });
});
