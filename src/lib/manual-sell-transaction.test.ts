import { describe, expect, it } from "vitest";
import {
  calculateManualSellFloor,
  selectIndependentPumpSwapPrice,
} from "./manual-sell-transaction";

const MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6fPwBGfhXvqEyQX";
const WRAPPED_SOL = "So11111111111111111111111111111111111111112";

describe("independent manual exit floor", () => {
  it("applies slippage and a conservative oracle buffer", () => {
    expect(
      calculateManualSellFloor({
        tokenAmount: 100,
        priceSol: 0.0001,
        slippagePct: 8,
      }),
    ).toEqual({
      expectedLamports: 10_000_000,
      minimumOutputLamports: 8_280_000,
    });
  });

  it("rejects zero, negative, and unbounded quote inputs", () => {
    expect(() =>
      calculateManualSellFloor({
        tokenAmount: 0,
        priceSol: 0.0001,
        slippagePct: 8,
      }),
    ).toThrow(/invalid/);
    expect(() =>
      calculateManualSellFloor({
        tokenAmount: 100,
        priceSol: 0.0001,
        slippagePct: 100,
      }),
    ).toThrow(/invalid/);
  });

  it("accepts only the target mint quoted in wrapped SOL", () => {
    expect(
      selectIndependentPumpSwapPrice(
        [
          {
            chainId: "solana",
            dexId: "pumpswap",
            pairAddress: "low-liquidity",
            priceNative: "0.5",
            baseToken: { address: MINT },
            quoteToken: { address: WRAPPED_SOL },
            liquidity: { usd: 499 },
          },
          {
            chainId: "solana",
            dexId: "pumpswap",
            pairAddress: "wrong-direction",
            priceNative: "9",
            baseToken: { address: WRAPPED_SOL },
            quoteToken: { address: MINT },
            liquidity: { usd: 1_000_000 },
          },
          {
            chainId: "solana",
            dexId: "pumpswap",
            pairAddress: "trusted-pair",
            priceNative: "0.0001",
            baseToken: { address: MINT },
            quoteToken: { address: WRAPPED_SOL },
            liquidity: { usd: 5_000 },
          },
        ],
        MINT,
      ),
    ).toEqual({
      priceSol: 0.0001,
      pairAddress: "trusted-pair",
      liquidityUsd: 5_000,
    });
  });

  it("fails closed without a sufficiently liquid direct PumpSwap pair", () => {
    expect(() =>
      selectIndependentPumpSwapPrice(
        [
          {
            chainId: "solana",
            dexId: "raydium",
            priceNative: "0.0001",
            baseToken: { address: MINT },
            quoteToken: { address: WRAPPED_SOL },
            liquidity: { usd: 5_000 },
          },
        ],
        MINT,
      ),
    ).toThrow(/unavailable/);
  });
});
