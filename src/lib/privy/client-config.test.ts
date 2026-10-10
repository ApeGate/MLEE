import { describe, expect, it } from "vitest";
import { PRIVY_CLIENT_CONFIG } from "./client-config";

describe("Privy client configuration", () => {
  it("permits only Solana wallet login", () => {
    expect(PRIVY_CLIENT_CONFIG.loginMethods).toEqual(["wallet"]);
    expect(PRIVY_CLIENT_CONFIG.appearance.walletChainType).toBe("solana-only");
    expect(PRIVY_CLIENT_CONFIG.appearance.walletList).toEqual(
      expect.arrayContaining(["phantom", "solflare", "backpack"]),
    );
  });

  it("never creates a smart or embedded wallet during login", () => {
    expect(PRIVY_CLIENT_CONFIG.embeddedWallets).toMatchObject({
      ethereum: { createOnLogin: "off" },
      solana: { createOnLogin: "off" },
      showWalletUIs: false,
    });
  });
});
