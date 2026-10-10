import { describe, expect, it } from "vitest";
import { isBrandSafeLaunchLabel } from "./brand-safety";

describe("isBrandSafeLaunchLabel", () => {
  it("allows ordinary launch names and symbols", () => {
    expect(isBrandSafeLaunchLabel("Banana Gate", "BNNA")).toBe(true);
  });

  it("blocks abusive terms across names and symbols", () => {
    expect(isBrandSafeLaunchLabel("unsafe launch", "NIGGACOIN")).toBe(false);
  });

  it("blocks common leetspeak evasions", () => {
    expect(isBrandSafeLaunchLabel("n1gg3r coin", "NOPE")).toBe(false);
  });
});
