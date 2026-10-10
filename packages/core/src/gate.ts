import { hashCanonical } from "./canonical";
import {
  isOfficialApegateMint,
  resemblesApegateIdentity,
} from "./official-token";
import { evaluateTiming, evaluateTrenchChecks } from "./trench-checks";
import type {
  CheckCategory,
  Evidence,
  GateCheck,
  GateVerdict,
  LaunchFacts,
  Profile,
} from "./types";

export interface GateOptions {
  officialApegateMint?: string | null;
}

const THRESHOLDS = {
  strict: {
    devPct: [3, 10],
    top10Pct: [25, 40],
    pass: 80,
    warn: 55,
  },
  standard: {
    devPct: [5, 20],
    top10Pct: [30, 50],
    pass: 70,
    warn: 40,
  },
  loose: {
    devPct: [10, 30],
    top10Pct: [40, 60],
    pass: 60,
    warn: 30,
  },
} as const;

const CATEGORY_CAPS: Record<CheckCategory, number> = {
  safety: 100,
  supply: 40,
  provenance: 30,
  market: 20,
  social: 10,
};

const REQUIRED_EVIDENCE_CHECKS = new Set([
  "dev_pct",
  "top10_pct",
  "cluster_retained_pct",
]);

function txEvidence(facts: LaunchFacts): Evidence[] {
  return facts.signature
    ? [
        {
          kind: "tx",
          ref: facts.signature,
          note: "Pump program creation transaction",
        },
      ]
    : [
        {
          kind: "account",
          ref: facts.mint,
          note: "Mint account; creation signature unavailable",
        },
      ];
}

function numericCheck({
  id,
  label,
  value,
  thresholds,
  maxPenalty,
  category,
  evidence,
}: {
  id: string;
  label: string;
  value: number | null | undefined;
  thresholds: readonly [number, number];
  maxPenalty: number;
  category: CheckCategory;
  evidence: Evidence[];
}): GateCheck {
  if (value === null || value === undefined) {
    return {
      id,
      label,
      outcome: "unknown",
      value: "Collecting",
      threshold: `warn ${thresholds[0]}% · block ${thresholds[1]}%`,
      reason: `${label} is still being resolved`,
      penalty: 0,
      hard: false,
      category,
      evidence,
    };
  }

  if (value >= thresholds[1]) {
    return {
      id,
      label,
      outcome: "fail",
      value: `${value.toFixed(1)}%`,
      threshold: `block ${thresholds[1]}%`,
      reason: `${label} ${value.toFixed(1)}% is over the ${thresholds[1]}% block line`,
      penalty: maxPenalty,
      hard: false,
      category,
      evidence,
    };
  }

  if (value >= thresholds[0]) {
    const range = thresholds[1] - thresholds[0];
    return {
      id,
      label,
      outcome: "warn",
      value: `${value.toFixed(1)}%`,
      threshold: `warn ${thresholds[0]}%`,
      reason: `${label} ${value.toFixed(1)}% needs a closer look`,
      penalty: Math.max(
        1,
        Math.round(((value - thresholds[0]) / range) * maxPenalty),
      ),
      hard: false,
      category,
      evidence,
    };
  }

  return {
    id,
    label,
    outcome: "pass",
    value: `${value.toFixed(1)}%`,
    threshold: `< ${thresholds[0]}%`,
    reason: `${label} is under the warning line`,
    penalty: 0,
    hard: false,
    category,
    evidence,
  };
}

export async function evaluateGate(
  facts: LaunchFacts,
  profile: Profile = "standard",
  now = facts.observedAt,
  options: GateOptions = {},
): Promise<GateVerdict> {
  const tx = txEvidence(facts);
  const account: Evidence[] = [
    {
      kind: "account",
      ref: facts.mint,
      note: "Mint account read from Solana RPC",
    },
  ];
  const checks: GateCheck[] = [];
  const protectedIdentity =
    resemblesApegateIdentity(facts.name) ||
    resemblesApegateIdentity(facts.symbol);
  const officialMint = isOfficialApegateMint(
    facts.mint,
    options.officialApegateMint,
  );

  checks.push({
    id: "impersonation_apegate",
    label: "Apegate identity",
    outcome: protectedIdentity && !officialMint ? "fail" : "pass",
    value: officialMint
      ? "Official CA"
      : protectedIdentity
        ? "Protected match"
        : "Clear",
    threshold: "protected names require the exact CA on apegate.io",
    reason: officialMint
      ? "Mint exactly matches the official contract address configured by apegate.io"
      : protectedIdentity
        ? "Name or ticker resembles Apegate but the mint is not the published official address"
        : "No protected Apegate name or ticker match",
    penalty: protectedIdentity && !officialMint ? 100 : 0,
    hard: true,
    category: "safety",
    evidence: [
      {
        kind: "url",
        ref: "https://apegate.io/token",
        note: "Official Apegate token registry",
      },
      ...account,
    ],
  });

  for (const [id, label, authority] of [
    ["mint_authority", "Mint authority", facts.mintAuthority],
    ["freeze_authority", "Freeze authority", facts.freezeAuthority],
  ] as const) {
    checks.push({
      id,
      label,
      outcome:
        authority === undefined
          ? "unknown"
          : authority === null
            ? "pass"
            : "fail",
      value:
        authority === undefined
          ? "Collecting"
          : authority === null
            ? "Revoked"
            : "Active",
      threshold: "must be revoked",
      reason:
        authority === undefined
          ? `${label} has not been confirmed yet`
          : authority === null
            ? `${label} is revoked`
            : `${label} is still active`,
      penalty: authority ? 100 : 0,
      hard: true,
      category: "safety",
      evidence: account,
    });
  }

  checks.push(
    numericCheck({
      id: "dev_pct",
      label: "Creator holding",
      value: facts.devPct,
      thresholds: THRESHOLDS[profile].devPct,
      maxPenalty: 15,
      category: "supply",
      evidence: account,
    }),
    numericCheck({
      id: "top10_pct",
      label: "Top 10 holders",
      value: facts.top10Pct,
      thresholds: THRESHOLDS[profile].top10Pct,
      maxPenalty: 10,
      category: "supply",
      evidence: account,
    }),
  );

  const secondOpinionWarn = (facts.rugScore ?? 0) >= 50;
  checks.push({
    id: "second_opinion",
    label: "Independent risk scan",
    outcome:
      facts.rugScore === undefined || facts.rugScore === null
        ? "unknown"
        : secondOpinionWarn
          ? "warn"
          : "pass",
    value:
      facts.rugScore === undefined || facts.rugScore === null
        ? "Unavailable"
        : `${facts.rugScore}/100 risk`,
    threshold: "attention at 50",
    reason:
      facts.rugScore === undefined || facts.rugScore === null
        ? "Independent risk scan is unavailable; it never decides PASS or BLOCK"
        : secondOpinionWarn
          ? "An independent scan raised risk flags"
          : "Independent scan found no high-risk flags",
    penalty: 0,
    hard: false,
    category: "market",
    evidence: [
      {
        kind: "url",
        ref: `https://api.rugcheck.xyz/v1/tokens/${facts.mint}/report/summary`,
        note: "Optional second opinion",
      },
    ],
  });

  checks.push({
    id: "mayhem_mode",
    label: "Mayhem mode",
    outcome: facts.isMayhem && profile === "strict" ? "warn" : "pass",
    value: facts.isMayhem ? "On" : "Off",
    reason: facts.isMayhem
      ? "Mayhem mode is active; informational outside Strict"
      : "Standard Pump lifecycle",
    penalty: 0,
    hard: false,
    category: "market",
    evidence: tx,
  });

  checks.push(...evaluateTrenchChecks(facts, profile, tx));

  const ageSec = Math.max(0, (now - facts.createdAt) / 1_000);
  const notEnoughTape = ageSec < 10 || (facts.tradeCount ?? 1) < 5;
  const unresolvedRequiredChecks = checks.filter(
    (check) =>
      check.outcome === "unknown" &&
      (check.hard || REQUIRED_EVIDENCE_CHECKS.has(check.id)),
  );
  const requiredUnknown = unresolvedRequiredChecks.length > 0;
  const hardFail = checks.some(
    (check) => check.hard && check.outcome === "fail",
  );
  const softFail = checks.some(
    (check) => !check.hard && check.outcome === "fail",
  );
  const penaltyByCategory = checks.reduce(
    (totals, check) => {
      totals[check.category] += check.penalty;
      return totals;
    },
    {
      safety: 0,
      supply: 0,
      provenance: 0,
      market: 0,
      social: 0,
    } satisfies Record<CheckCategory, number>,
  );
  const penalty = Object.entries(penaltyByCategory).reduce(
    (sum, [category, value]) =>
      sum + Math.min(value, CATEGORY_CAPS[category as CheckCategory]),
    0,
  );
  const score = Math.max(0, 100 - penalty);
  const lines = THRESHOLDS[profile];

  let kind: GateVerdict["kind"];
  if (hardFail || softFail || score < lines.warn) {
    kind = "BLOCK";
  } else if (notEnoughTape || requiredUnknown) {
    kind = "WAIT";
  } else if (
    score < lines.pass ||
    secondOpinionWarn ||
    checks.some((check) => check.outcome === "warn")
  ) {
    kind = "WARN";
  } else {
    kind = "PASS";
  }

  const ranked = [...checks].sort((a, b) => {
    const order = { fail: 3, warn: 2, unknown: 1, pass: 0 };
    return order[b.outcome] - order[a.outcome] || b.penalty - a.penalty;
  });
  const topReasons =
    kind === "WAIT"
      ? [
          ageSec < 10
            ? `Only ${Math.floor(ageSec)}s old`
            : `${facts.tradeCount ?? 1} trades observed`,
          requiredUnknown
            ? `Waiting on ${unresolvedRequiredChecks
                .slice(0, 2)
                .map((check) => check.label.toLowerCase())
                .join(" and ")}`
            : "Kong is collecting tape",
        ]
      : ranked.slice(0, 3).map((check) => check.reason);

  const factsHash = await hashCanonical(facts);
  return {
    mint: facts.mint,
    kind,
    score,
    profile,
    rulesetVersion: "gate-1.2.0",
    checks,
    topReasons,
    timing: evaluateTiming(facts, now),
    factsHash,
    computedAt: now,
    freshUntil: now + 2_000,
  };
}
