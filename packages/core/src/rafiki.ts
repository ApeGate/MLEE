import type { Receipt } from "./types";

export interface RafikiExplanation {
  headline: string;
  explanation: string;
  facts: string[];
  boundary: string;
}

export function explainReceiptDeterministically(
  receipt: Receipt,
): RafikiExplanation {
  const facts = [
    `Source label: ${receipt.source.toUpperCase()}`,
    `Actor: ${receipt.actor}`,
    `Receipt hash: ${receipt.hash}`,
    `Previous hash: ${receipt.prev ?? "GENESIS"}`,
  ];

  if (receipt.kind === "verdict") {
    const verdict = String(receipt.outputs.verdict ?? "UNKNOWN");
    const score = String(receipt.outputs.score ?? "unavailable");
    const reasons = Array.isArray(receipt.outputs.reasons)
      ? receipt.outputs.reasons.map(String).slice(0, 3)
      : [];
    return {
      headline: `Kong recorded ${verdict}`,
      explanation:
        reasons.length > 0
          ? `The recorded reasons were: ${reasons.join("; ")}.`
          : "The receipt does not contain a plain-language reason list.",
      facts: [
        `Verdict: ${verdict}`,
        `Score: ${score}`,
        ...facts,
      ],
      boundary:
        "Rafiki explains the receipt only. This does not change Kong's verdict or prepare a trade.",
    };
  }

  if (receipt.kind === "paper_fill") {
    return {
      headline: `${String(receipt.outputs.side ?? "PAPER")} fill explained`,
      explanation:
        "Caesar wrote a simulated fill from the local paper model. It did not build, sign, or send a transaction.",
      facts: [
        `Symbol: ${String(receipt.outputs.symbol ?? "unknown")}`,
        `Quote amount: ${String(receipt.outputs.quoteAmountSol ?? "unavailable")} SOL`,
        `Modeled fee: ${String(receipt.outputs.feeSol ?? "unavailable")} SOL`,
        ...facts,
      ],
      boundary:
        "A paper fill is hypothetical and cannot predict a mainnet fill.",
    };
  }

  if (receipt.kind === "plan_change") {
    return {
      headline: "Inactive plan version saved",
      explanation:
        "Caesar hashed and stored an immutable local plan version after its limited rehearsal.",
      facts: [
        `Plan: ${String(receipt.outputs.name ?? "unnamed")}`,
        `Execution enabled: ${String(receipt.outputs.executionEnabled ?? false)}`,
        ...facts,
      ],
      boundary:
        "Rafiki cannot activate the plan, approve an action, or loosen its exits.",
    };
  }

  if (receipt.kind === "vault_preview") {
    return {
      headline: "Vault policy preview recorded",
      explanation:
        "Cornelius recorded a hypothetical Privy policy hash. No wallet or signer was created.",
      facts: [
        `Execution enabled: ${String(receipt.outputs.executionEnabled ?? false)}`,
        `External review complete: ${String(receipt.outputs.externalReviewComplete ?? false)}`,
        ...facts,
      ],
      boundary:
        "Rafiki cannot create a Vault, authorize a signer, or move funds.",
    };
  }

  return {
    headline: "Receipt explained",
    explanation:
      "This receipt records a bounded Apegate action. Its hash links the recorded inputs and outputs to the prior local receipt.",
    facts,
    boundary:
      "Rafiki can explain recorded facts only. It cannot trade or change wallet policy.",
  };
}

export function isSafeRafikiNarrative(value: string): boolean {
  if (!value.trim() || value.length > 1_200) return false;
  if (/\d/.test(value)) return false;
  return !/\b(buy|sell|ape in|entry|exit|position size|allocation)\b/i.test(
    value,
  );
}
