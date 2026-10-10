import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { safePublicUrl } from "./token-metadata";

describe("token metadata URL safety", () => {
  it("rewrites decentralized asset URLs to public gateways", () => {
    expect(safePublicUrl("ipfs://bafy/logo.png")).toBe(
      "https://ipfs.io/ipfs/bafy/logo.png",
    );
    expect(safePublicUrl("ar://transaction-id")).toBe(
      "https://arweave.net/transaction-id",
    );
  });

  it("resolves relative image paths against metadata", () => {
    expect(
      safePublicUrl("./logo.webp", "https://metadata.example/token/1.json"),
    ).toBe("https://metadata.example/token/logo.webp");
  });

  it("rejects local, credentialed, and executable URLs", () => {
    expect(safePublicUrl("http://127.0.0.1/secret")).toBeNull();
    expect(safePublicUrl("http://192.168.1.10/logo.png")).toBeNull();
    expect(safePublicUrl("https://user:pass@example.com/logo.png")).toBeNull();
    expect(safePublicUrl("javascript:alert(1)")).toBeNull();
  });
});
