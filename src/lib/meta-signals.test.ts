import { describe, expect, it } from "vitest";
import {
  classifyXLink,
  extractMetadataSignals,
  hashWebsiteTemplate,
  websiteLinksToXHandle,
} from "./meta-signals";

describe("metadata social signals", () => {
  it("distinguishes X profiles, posts, and communities", () => {
    expect(classifyXLink("https://x.com/FrogOrigin")).toMatchObject({
      type: "profile",
      handle: "FrogOrigin",
    });
    expect(
      classifyXLink("https://twitter.com/FrogOrigin/status/12345"),
    ).toMatchObject({
      type: "post",
      handle: "FrogOrigin",
    });
    expect(
      classifyXLink("x.com/i/communities/1900000000000000000"),
    ).toMatchObject({
      type: "community",
      handle: null,
    });
    expect(classifyXLink("@FrogOrigin")).toMatchObject({
      type: "profile",
      handle: "FrogOrigin",
    });
  });

  it("extracts standard Pump metadata links without trusting other fields", () => {
    expect(
      extractMetadataSignals({
        name: "Frog",
        symbol: "FRG",
        website: "frog.example",
        twitter: "https://x.com/frog",
        telegram: "https://t.me/frog",
        ignored: { wallet: "not-a-link" },
      }),
    ).toMatchObject({
      name: "Frog",
      symbol: "FRG",
      websiteUrl: "https://frog.example/",
      x: { type: "profile", handle: "frog" },
      telegramPresent: true,
    });
  });

  it("normalizes reused site templates across token-specific values", async () => {
    const first = `
      <html><style>.coin { color: red }</style><body>
        <h1>FROG 2026</h1>
        <p>8Q1YJtQ9yV6wZJhX6gAe8A6kZ8yUFbE7Hh1C2d3E4f5G</p>
        <script>window.tracker = "one"</script>
      </body></html>
    `;
    const second = `
      <html><style>.coin { color: blue }</style><body>
        <h1>TOAD 2027</h1>
        <p>7P1YJtQ9yV6wZJhX6gAe8A6kZ8yUFbE7Hh1C2d3E4f6H</p>
        <script>window.tracker = "two"</script>
      </body></html>
    `;

    await expect(hashWebsiteTemplate(first, ["FROG"])).resolves.toBe(
      await hashWebsiteTemplate(second, ["TOAD"]),
    );
  });

  it("checks that the website links the metadata X profile", () => {
    const html =
      '<a href="https://x.com/FrogOrigin">Follow the original frog</a>';
    expect(websiteLinksToXHandle(html, "frogorigin")).toBe(true);
    expect(websiteLinksToXHandle(html, "anotherfrog")).toBe(false);
  });
});
