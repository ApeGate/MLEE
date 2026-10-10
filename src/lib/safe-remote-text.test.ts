import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { requirePublicHttpsUrl } from "./safe-remote-text";

describe("metadata remote URL guard", () => {
  it("accepts public HTTPS metadata and website hosts", () => {
    expect(
      requirePublicHttpsUrl("https://ipfs.io/ipfs/example").hostname,
    ).toBe("ipfs.io");
  });

  it.each([
    "http://example.com/meta.json",
    "https://localhost/meta.json",
    "https://wallet.internal/meta.json",
    "https://127.0.0.1/meta.json",
    "https://[::1]/meta.json",
    "https://user:password@example.com/meta.json",
  ])("blocks unsafe remote URL %s", (value) => {
    expect(() => requirePublicHttpsUrl(value)).toThrow(
      /public HTTPS hostname/,
    );
  });
});
