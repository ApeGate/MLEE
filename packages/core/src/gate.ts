import { hashCanonical } from "./canonical";
import type {
  Evidence,
  GateCheck,
  GateVerdict,
  LaunchFacts,
  Profile,
} from "./types";

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

function txEvidence(facts: LaunchFacts): Evidence[] {
  return [
    {
      kind: "tx",
      ref: facts.signature,
      note: "Pump program creation transaction",
    },
  ];
}

function numericCheck({
  id,
  label,
  value,
  thresholds,
  maxPenalty,
  evidence,
}: {
  id: string;
  label: string;
  value: number | null | undefined;
  thresholds: readonly [number, number];
  maxPenalty: number;
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
    evidence,
  };
}

export async function evaluateGate(
  facts: LaunchFacts,
  profile: Profile = "standard",
  now = facts.observedAt,
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
      evidence: account,
    }),
    numericCheck({
      id: "top10_pct",
      label: "Top 10 holders",
      value: facts.top10Pct,
      thresholds: THRESHOLDS[profile].top10Pct,
      maxPenalty: 10,
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
    evidence: tx,
  });

  const ageSec = Math.max(0, (now - facts.createdAt) / 1_000);
  const notEnoughTape = ageSec < 10 || (facts.tradeCount ?? 1) < 5;
  const requiredUnknown = checks.some(
    (check) => check.hard && check.outcome === "unknown",
  );
  const hardFail = checks.some(
    (check) => check.hard && check.outcome === "fail",
  );
  const softFail = checks.some(
    (check) => !check.hard && check.outcome === "fail",
  );
  const penalty = checks.reduce((sum, check) => sum + check.penalty, 0);
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
          requiredUnknown ? "Safety reads still resolving" : "Kong is collecting tape",
        ]
      : ranked.slice(0, 3).map((check) => check.reason);

  const factsHash = await hashCanonical(facts);
  return {
    mint: facts.mint,
    kind,
    score,
    profile,
    rulesetVersion: "gate-1.0.0",
    checks,
    topReasons,
    factsHash,
    computedAt: now,
    freshUntil: now + 2_000,
  };
}
