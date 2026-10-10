import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { configuredSolanaRpc } from "./solana-rpc";

describe("configuredSolanaRpc", () => {
  it("prefers the provider-neutral server RPC URL", () => {
    expect(
      configuredSolanaRpc({
        SOLANA_RPC_URL: "https://rpc.example/primary",
        HELIUS_RPC_URL: "https://rpc.example/helius",
        HELIUS_API_KEY: "not-returned",
      }),
    ).toEqual({
      endpoint: "https://rpc.example/primary",
      source: "private Solana RPC",
    });
  });

  it("derives a server-only Helius endpoint from the API key", () => {
    const rpc = configuredSolanaRpc({ HELIUS_API_KEY: "key with spaces" });
    expect(rpc.source).toBe("Helius mainnet RPC");
    expect(rpc.endpoint).toBe(
      "https://mainnet.helius-rpc.com/?api-key=key%20with%20spaces",
    );
  });

  it("labels a private Helius URL without returning its value as evidence", () => {
    expect(
      configuredSolanaRpc({
        SOLANA_RPC_URL:
          "https://mainnet.helius-rpc.com/?api-key=private-test-value",
      }).source,
    ).toBe("Helius mainnet RPC");
  });

  it("uses a clearly labeled public fallback without credentials", () => {
    expect(configuredSolanaRpc({})).toEqual({
      endpoint: "https://api.mainnet-beta.solana.com",
      source: "public Solana RPC fallback",
    });
  });
});
