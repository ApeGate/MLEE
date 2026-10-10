import { hashCanonical } from "./canonical";
import { resemblesApegateIdentity } from "./official-token";

export type LaunchQuoteAsset = "SOL" | "USDC";
export type LaunchCheckOutcome = "pass" | "warn" | "fail" | "pending";
export type LaunchPreflightKind = "PREPARED" | "WARN" | "BLOCK";

export interface LaunchDraft {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  website: string;
  socialUrl: string;
  quoteAsset: LaunchQuoteAsset;
  holderRewards: boolean;
  mayhemMode: boolean;
  devBuyPct: number;
  guardrailsAccepted: boolean;
}

export interface LaunchPreflightCheck {
  id: string;
  label: string;
  outcome: LaunchCheckOutcome;
  detail: string;
  hard: boolean;
}

export interface LaunchPreflight {
  kind: LaunchPreflightKind;
  checks: LaunchPreflightCheck[];
  metadataHash: string;
  pendingServerChecks: string[];
  readyForBuild: false;
}

function isHttpsUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export async function preflightLaunch(
  draft: LaunchDraft,
): Promise<LaunchPreflight> {
  const name = draft.name.trim();
  const symbol = draft.symbol.trim().toUpperCase();
  const description = draft.description.trim();
  const protectedIdentity =
    resemblesApegateIdentity(name) || resemblesApegateIdentity(symbol);
  const checks: LaunchPreflightCheck[] = [
    {
      id: "identity",
      label: "Protected identity",
      outcome: protectedIdentity ? "fail" : "pass",
      detail: protectedIdentity
        ? "Apegate names and ticker variants are blocked"
        : "No protected Apegate identity match",
      hard: true,
    },
    {
      id: "name",
      label: "Token name",
      outcome: name.length >= 2 && name.length <= 32 ? "pass" : "fail",
      detail: "Use 2–32 visible characters",
      hard: true,
    },
    {
      id: "symbol",
      label: "Ticker format",
      outcome: /^[A-Z0-9]{2,10}$/.test(symbol) ? "pass" : "fail",
      detail: "Use 2–10 letters or numbers",
      hard: true,
    },
    {
      id: "description",
      label: "Description",
      outcome:
        description.length >= 20 && description.length <= 500
          ? "pass"
          : "warn",
      detail: "A complete description is 20–500 characters",
      hard: false,
    },
    {
      id: "image",
      label: "Image source",
      outcome: isHttpsUrl(draft.imageUrl) ? "pass" : "fail",
      detail: "Use an HTTPS image URL for this preparation scaffold",
      hard: true,
    },
    {
      id: "socials",
      label: "Social links",
      outcome:
        isHttpsUrl(draft.website) || isHttpsUrl(draft.socialUrl)
          ? "pass"
          : "warn",
      detail: "Add at least one valid HTTPS website or social link",
      hard: false,
    },
    {
      id: "dev_buy",
      label: "Creator buy",
      outcome:
        draft.devBuyPct >= 20
          ? "fail"
          : draft.devBuyPct >= 5
            ? "warn"
            : "pass",
      detail:
        draft.devBuyPct >= 20
          ? `${draft.devBuyPct.toFixed(1)}% hits Kong's Standard block line`
          : draft.devBuyPct >= 5
            ? `${draft.devBuyPct.toFixed(1)}% crosses Kong's Standard warning line`
            : `${draft.devBuyPct.toFixed(1)}% stays below Kong's Standard warning line`,
      hard: draft.devBuyPct >= 20,
    },
    {
      id: "mayhem",
      label: "Mayhem mode",
      outcome: draft.mayhemMode ? "warn" : "pass",
      detail: draft.mayhemMode
        ? "Mayhem mode will be stated plainly on the receipt"
        : "Mayhem mode stays off by default",
      hard: false,
    },
    {
      id: "guardrails",
      label: "Clean-launch guardrails",
      outcome: draft.guardrailsAccepted ? "pass" : "fail",
      detail:
        "One creator wallet; no bundles, volume bots, or promotion services",
      hard: true,
    },
    {
      id: "server_checks",
      label: "Build-time checks",
      outcome: "pending",
      detail:
        "Ticker clash, image clone, social reachability, and wallet launch limit run before create_v2",
      hard: false,
    },
  ];

  const hasHardFail = checks.some(
    (check) => check.hard && check.outcome === "fail",
  );
  const hasWarning = checks.some((check) => check.outcome === "warn");
  const metadataHash = await hashCanonical({
    name,
    symbol,
    description,
    imageUrl: draft.imageUrl.trim(),
    website: draft.website.trim(),
    socialUrl: draft.socialUrl.trim(),
    quoteAsset: draft.quoteAsset,
    holderRewards: draft.holderRewards,
    mayhemMode: draft.mayhemMode,
    devBuyPct: draft.devBuyPct,
  });

  return {
    kind: hasHardFail ? "BLOCK" : hasWarning ? "WARN" : "PREPARED",
    checks,
    metadataHash,
    pendingServerChecks: [
      "ticker clash",
      "image clone",
      "social reachability",
      "three-launch wallet limit",
      "single-signer creation",
    ],
    readyForBuild: false,
  };
}
