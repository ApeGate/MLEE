import { describe, expect, it } from "vitest";
import {
  parseTokenLogoBatchRequest,
  tokenLogoBatchKey,
} from "./token-logo-batch";

const MINT = "BQAeeSowpwEx8Km8GcporcbuLKq4a7EQceH3F2qZpump";

describe("token logo batches", () => {
  it("normalizes and de-duplicates the same metadata request", () => {
    expect(
      parseTokenLogoBatchRequest({
        items: [
          { mint: ` ${MINT} `, uri: " https://example.com/meta.json " },
          { mint: MINT, uri: "https://example.com/meta.json" },
        ],
      }),
    ).toEqual([
      {
        mint: MINT,
        uri: "https://example.com/meta.json",
      },
    ]);
  });

  it("keeps distinct metadata sources for the same mint", () => {
    const items = parseTokenLogoBatchRequest({
      items: [
        { mint: MINT },
        { mint: MINT, uri: "https://example.com/meta.json" },
      ],
    });

    expect(items).toHaveLength(2);
    expect(tokenLogoBatchKey(items[0]!)).not.toBe(
      tokenLogoBatchKey(items[1]!),
    );
  });

  it("rejects malformed and oversized batches", () => {
    expect(() => parseTokenLogoBatchRequest({ items: [] })).toThrow("1–40");
    expect(() =>
      parseTokenLogoBatchRequest({
        items: Array.from({ length: 41 }, () => ({ mint: MINT })),
      }),
    ).toThrow("1–40");
    expect(() =>
      parseTokenLogoBatchRequest({ items: [{ mint: "not-a-mint" }] }),
    ).toThrow("item is invalid");
  });
});
