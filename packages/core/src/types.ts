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

export interface Evidence {
  kind: "tx" | "account" | "url";
  ref: string;
  note?: string;
}

export interface LaunchFacts {
  mint: string;
  signature: string;
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
  evidence: Evidence[];
}

export interface GateVerdict {
  mint: string;
  kind: VerdictKind;
  score: number;
  profile: Profile;
  rulesetVersion: "gate-1.1.0";
  checks: GateCheck[];
  topReasons: string[];
  factsHash: string;
  computedAt: number;
  freshUntil: number;
}

export interface Receipt {
  id: string;
  v: 1;
  kind: "verdict" | "connect" | "block" | "vault_preview";
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
