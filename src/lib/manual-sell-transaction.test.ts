import { describe, expect, it } from "vitest";
import { calculateManualSellFloor } from "./manual-sell-transaction";

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
});
