import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ManualTradeReviewDialog,
  type ManualTradeReviewIntent,
} from "./manual-trade-review";

const INTENT: ManualTradeReviewIntent = {
  side: "SELL",
  symbol: "CATE",
  mint: "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump",
  wallet: "6hwUCrUfQwVNNUScKshSvksJK7rNC2JphioJztjdEEcr",
  summary: "Exit 50% of $CATE",
  facts: [
    {
      label: "Independent floor",
      value: "0.004336578 SOL",
    },
  ],
};

describe("manual trade review", () => {
  it("shows decoded intent and requires a deliberate hold", () => {
    const html = renderToStaticMarkup(
      <ManualTradeReviewDialog intent={INTENT} onDecision={() => undefined} />,
    );

    expect(html).toContain("Decoded transaction review");
    expect(html).toContain("Exit 50% of $CATE");
    expect(html).toContain(INTENT.mint);
    expect(html).toContain("0.004336578 SOL");
    expect(html).toContain("Hold to open wallet");
    expect(html).toContain("Cancel · send nothing");
  });

  it("renders nothing without a reviewed transaction", () => {
    expect(
      renderToStaticMarkup(
        <ManualTradeReviewDialog
          intent={null}
          onDecision={() => undefined}
        />,
      ),
    ).toBe("");
  });
});
