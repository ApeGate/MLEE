export type ApeId =
  | "kong"
  | "cheeta"
  | "caesar"
  | "cornelius"
  | "rafiki"
  | "zira";

export type Source = "live" | "replay" | "paper" | "estimate" | "hypothetical";
export type Profile = "strict" | "standard" | "loose";
export type VerdictKind = "PASS" | "WARN" | "BLOCK" | "WAIT";
export type CheckOutcome = "pass" | "warn" | "fail" | "unknown";
export type CheckCategory =
  | "safety"
  | "supply"
  | "provenance"
  | "market"
  | "social";
export type XLinkType = "profile" | "community" | "post" | "none";
export type TimingKind =
  | "EARLY"
  | "CHASE_WINDOW"
  | "SETTLING"
  | "SECOND_LEG"
  | "RETEST"
  | "SURVIVOR";
export type LaunchIndexScope = "session" | "durable";

export interface Evidence {
  kind: "tx" | "account" | "url";
  ref: string;
  note?: string;
}

export interface LaunchFacts {
  mint: string;
  signature?: string | null;
  name: string;
  symbol: string;
  creator: string;
  bondingCurve?: string;
  uri: string;
  createdAt: number;
  observedAt: number;
  marketCapSol: number;
  initialBuySol: number;
  isMayhem: boolean;
  pool: string;
  tradeCount?: number;
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  devPct?: number | null;
  top10Pct?: number | null;
  rugScore?: number | null;
  creatorLaunches1h?: number | null;
  creatorLaunches24h?: number | null;
  creatorLaunches7d?: number | null;
  launchIndexScope?: LaunchIndexScope | null;
  launchIndexLabel?: string | null;
  creatorPriorOutcomes?: {
    launches: number;
    rugged: number;
    graduated: number;
    survived24h: number;
  } | null;
  cloneCount1h?: number | null;
  cloneRank1h?: number | null;
  cloneLeaderMint?: string | null;
  imageHash?: string | null;
  imageCloneCount24h?: number | null;
  websiteUrl?: string | null;
  websiteReachable?: boolean | null;
  websiteMentionsToken?: boolean | null;
  websiteMatchesX?: boolean | null;
  websiteHost?: string | null;
  websiteTemplateHash?: string | null;
  websiteTemplateReuse24h?: number | null;
  domainRegisteredAt?: string | null;
  domainAgeDays?: number | null;
  xLinkType?: XLinkType | null;
  xHandle?: string | null;
  xReuseCount24h?: number | null;
  telegramPresent?: boolean | null;
  funderClusterIds?: string[] | null;
  bundleInitialPct?: number | null;
  bundleRetainedPct?: number | null;
  clusterRetainedPct?: number | null;
  launchSecondBuyout?: boolean | null;
  layeredTransferWallets?: number | null;
  layeredTransferPct?: number | null;
  selfTradeSharePct?: number | null;
  launchJumpX?: number | null;
  smoothClimb30m?: boolean | null;
  recentCrash1mPct?: number | null;
  freshWalletSharePct?: number | null;
  quoteAsset?: string | null;
  customPairFeeBps?: number | null;
  holderRewards?: boolean | null;
  cto?: boolean | null;
  deployerPulledPool?: boolean | null;
  firstBuyerRugRatePct?: number | null;
  creatorFeeSweep?: boolean | null;
  manufacturedCap?: boolean | null;
  confirmedClone?: boolean | null;
  originatorConfirmed?: boolean | null;
  paidCallouts?: boolean | null;
  drawdownFromFirstPeakPct?: number | null;
  reclaimedFiveMinuteVwap?: boolean | null;
  newOutsideBuyers?: number | null;
  graduatedAt?: number | null;
  openingPriceHoldPct?: number | null;
  rugRisks?: Array<{
    name: string;
    description: string;
    level: "warn" | "danger";
    value?: string;
  }>;
}

export interface GateCheck {
  id: string;
  label: string;
  outcome: CheckOutcome;
  value: string;
  threshold?: string;
  reason: string;
  penalty: number;
  hard: boolean;
  category: CheckCategory;
  evidence: Evidence[];
}

export interface GateTiming {
  kind: TimingKind;
  label: string;
  reason: string;
  entryAllowed: boolean;
  insidersOut: boolean;
}

export interface GateVerdict {
  mint: string;
  kind: VerdictKind;
  score: number;
  profile: Profile;
  rulesetVersion: "gate-1.2.0";
  checks: GateCheck[];
  topReasons: string[];
  timing: GateTiming;
  factsHash: string;
  computedAt: number;
  freshUntil: number;
}

export interface Receipt {
  id: string;
  v: 1;
  kind:
    | "verdict"
    | "connect"
    | "block"
    | "paper_fill"
    | "manual_fill"
    | "plan_change"
    | "vault_preview";
  actor: ApeId | "user" | "system";
  subject: { mint?: string; wallet?: string };
  at: { ts: number; slot?: number };
  inputs: {
    factsHash?: string;
    rulesetVersion?: string;
    params?: Record<string, unknown>;
  };
  outputs: Record<string, unknown>;
  evidence: Evidence[];
  source: Source;
  prev: string | null;
  hash: string;
}

export interface RawLaunch {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: string;
  initialBuy: number;
  solAmount: number;
  bondingCurveKey: string;
  vTokensInBondingCurve: number;
  vSolInBondingCurve: number;
  marketCapSol: number;
  name: string;
  symbol: string;
  uri: string;
  is_mayhem_mode?: boolean;
  pool?: string;
}
