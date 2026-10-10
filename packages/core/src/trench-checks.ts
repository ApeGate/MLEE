import type {
  Evidence,
  GateCheck,
  GateTiming,
  LaunchFacts,
  Profile,
} from "./types";

type NumericRiskInput = {
  id: string;
  label: string;
  value: number | null | undefined;
  warnAt: number;
  blockAt: number;
  maxPenalty: number;
  category: GateCheck["category"];
  evidence: Evidence[];
  unit?: "%" | "×" | "";
};

function numericRisk(input: NumericRiskInput): GateCheck {
  const unit = input.unit ?? "%";
  if (input.value === null || input.value === undefined) {
    return {
      id: input.id,
      label: input.label,
      outcome: "unknown",
      value: "Collecting",
      threshold: `warn ${input.warnAt}${unit} · block ${input.blockAt}${unit}`,
      reason: `${input.label} is still being resolved`,
      penalty: 0,
      hard: false,
      category: input.category,
      evidence: input.evidence,
    };
  }

  if (input.value >= input.blockAt) {
    return {
      id: input.id,
      label: input.label,
      outcome: "fail",
      value: `${input.value.toFixed(1)}${unit}`,
      threshold: `block ${input.blockAt}${unit}`,
      reason: `${input.label} ${input.value.toFixed(1)}${unit} is over the block line`,
      penalty: input.maxPenalty,
      hard: false,
      category: input.category,
      evidence: input.evidence,
    };
  }

  if (input.value >= input.warnAt) {
    return {
      id: input.id,
      label: input.label,
      outcome: "warn",
      value: `${input.value.toFixed(1)}${unit}`,
      threshold: `warn ${input.warnAt}${unit}`,
      reason: `${input.label} ${input.value.toFixed(1)}${unit} needs a closer look`,
      penalty: Math.max(
        1,
        Math.round(
          ((input.value - input.warnAt) /
            (input.blockAt - input.warnAt)) *
            input.maxPenalty,
        ),
      ),
      hard: false,
      category: input.category,
      evidence: input.evidence,
    };
  }

  return {
    id: input.id,
    label: input.label,
    outcome: "pass",
    value: `${input.value.toFixed(1)}${unit}`,
    threshold: `< ${input.warnAt}${unit}`,
    reason: `${input.label} is under the warning line`,
    penalty: 0,
    hard: false,
    category: input.category,
    evidence: input.evidence,
  };
}

function hardBoolean(
  id: string,
  label: string,
  value: boolean | null | undefined,
  reason: string,
  evidence: Evidence[],
): GateCheck {
  return {
    id,
    label,
    outcome:
      value === null || value === undefined
        ? "unknown"
        : value
          ? "fail"
          : "pass",
    value:
      value === null || value === undefined
        ? "Collecting"
        : value
          ? "Detected"
          : "Clear",
    threshold: "must be clear",
    reason:
      value === null || value === undefined
        ? `${label} has not been resolved yet`
        : value
          ? reason
          : `${label} is clear`,
    penalty: value ? 100 : 0,
    hard: true,
    category: "safety",
    evidence,
  };
}

function launchSecondCheck(
  facts: LaunchFacts,
  evidence: Evidence[],
): GateCheck {
  if (
    facts.launchSecondBuyout === null ||
    facts.launchSecondBuyout === undefined
  ) {
    return {
      id: "launch_second_buyout",
      label: "Launch-second buyout",
      outcome: "unknown",
      value: "Collecting",
      threshold: "block while linked launch wallets retain ≥ 30%",
      reason: "Creation-slot buyers and their funders are still being traced",
      penalty: 0,
      hard: true,
      category: "safety",
      evidence,
    };
  }

  const retained = facts.clusterRetainedPct;
  if (!facts.launchSecondBuyout) {
    return {
      id: "launch_second_buyout",
      label: "Launch-second buyout",
      outcome: "pass",
      value: "Not detected",
      threshold: "block while linked launch wallets retain ≥ 30%",
      reason: "No one-funder creation-slot buyout was detected",
      penalty: 0,
      hard: true,
      category: "safety",
      evidence,
    };
  }
  if (retained === null || retained === undefined) {
    return {
      id: "launch_second_buyout",
      label: "Launch-second buyout",
      outcome: "unknown",
      value: "Buyout found · holdings pending",
      threshold: "block while linked launch wallets retain ≥ 30%",
      reason: "A launch-second buyout was detected; current cluster holdings are unresolved",
      penalty: 0,
      hard: true,
      category: "safety",
      evidence,
    };
  }

  const blocked = retained >= 30;
  return {
    id: "launch_second_buyout",
    label: "Launch-second buyout",
    outcome: blocked ? "fail" : "pass",
    value: `${retained.toFixed(1)}% retained`,
    threshold: "block while linked launch wallets retain ≥ 30%",
    reason: blocked
      ? `Insiders still hold ${retained.toFixed(1)}% after a one-funder buyout`
      : `Launch buyout wallets are down to ${retained.toFixed(1)}%`,
    penalty: blocked ? 100 : 0,
    hard: true,
    category: "safety",
    evidence,
  };
}

function serialCreatorCheck(
  facts: LaunchFacts,
  profile: Profile,
  evidence: Evidence[],
): GateCheck {
  const oneHour = facts.creatorLaunches1h;
  const oneDay = facts.creatorLaunches24h;
  if (
    (oneHour === null || oneHour === undefined) &&
    (oneDay === null || oneDay === undefined)
  ) {
    return {
      id: "serial_creator",
      label: "Creator launch pace",
      outcome: "unknown",
      value: "Collecting",
      threshold:
        profile === "strict"
          ? "block ≥ 2 in 24h"
          : profile === "loose"
            ? "block ≥ 15 in 24h"
            : "warn ≥ 2 in 1h or ≥ 3 in 24h · block ≥ 3 in 1h or ≥ 6 in 24h",
      reason: "Creator launch history is still being indexed",
      penalty: 0,
      hard: false,
      category: "provenance",
      evidence,
    };
  }

  const hour = oneHour ?? 0;
  const day = oneDay ?? 0;
  const block =
    profile === "strict"
      ? day >= 2
      : profile === "loose"
        ? day >= 15
        : hour >= 3 || day >= 6;
  const warn =
    !block &&
    (profile === "strict"
      ? hour >= 2 || day >= 1
      : profile === "loose"
        ? day >= 8
        : hour >= 2 || day >= 3);
  return {
    id: "serial_creator",
    label: "Creator launch pace",
    outcome: block ? "fail" : warn ? "warn" : "pass",
    value: `${hour} / 1h · ${day} / 24h`,
    threshold:
      profile === "strict"
        ? "block ≥ 2 in 24h"
        : profile === "loose"
          ? "block ≥ 15 in 24h"
          : "block ≥ 3 in 1h or ≥ 6 in 24h",
    reason: block
      ? `Not tonight. ${day} coins from this wallet today`
      : warn
        ? "This creator is launching unusually often"
        : "Creator launch pace is below the warning line",
    penalty: block ? 30 : warn ? 8 : 0,
    hard: false,
    category: "provenance",
    evidence,
  };
}

function creatorRugRateCheck(
  facts: LaunchFacts,
  evidence: Evidence[],
): GateCheck {
  const outcomes = facts.creatorPriorOutcomes;
  if (!outcomes || outcomes.launches < 3) {
    return {
      id: "creator_rug_rate",
      label: "Creator prior outcomes",
      outcome: outcomes ? "pass" : "unknown",
      value: outcomes ? `${outcomes.launches} prior launches` : "Collecting",
      threshold: "warn 40% · block 60% after 3 priors",
      reason: outcomes
        ? "Not enough prior launches to score a rug rate"
        : "Creator outcomes are still being indexed",
      penalty: 0,
      hard: false,
      category: "provenance",
      evidence,
    };
  }
  const rate = (outcomes.rugged / outcomes.launches) * 100;
  return numericRisk({
    id: "creator_rug_rate",
    label: "Creator prior rug rate",
    value: rate,
    warnAt: 40,
    blockAt: 60,
    maxPenalty: 25,
    category: "provenance",
    evidence,
  });
}

function socialChecks(
  facts: LaunchFacts,
  evidence: Evidence[],
): GateCheck[] {
  const websitePenalty =
    facts.websiteUrl === undefined
      ? 0
      : !facts.websiteUrl
        ? 6
        : facts.websiteReachable === false
          ? 2
          : 0;
  const websiteEvidence = facts.websiteUrl
    ? [{ kind: "url" as const, ref: facts.websiteUrl, note: "Metadata website" }]
    : evidence;
  const xPenalty =
    facts.xReuseCount24h && facts.xReuseCount24h > 1
      ? 5
      : facts.xLinkType === "post"
        ? 3
        : facts.xLinkType === "community"
          ? 1
          : facts.xLinkType === "none"
            ? 4
            : 0;

  return [
    {
      id: "website",
      label: "Website",
      outcome:
        facts.websiteUrl === undefined
          ? "unknown"
          : websitePenalty
            ? "warn"
            : "pass",
      value: facts.websiteUrl === undefined
        ? "Unknown"
        : !facts.websiteUrl
          ? "None"
        : facts.websiteReachable === false
          ? "Unreachable"
          : "Present",
      threshold: "social evidence only",
      reason: facts.websiteUrl === undefined
        ? "Website metadata is still being resolved"
        : !facts.websiteUrl
          ? "No website; social score is docked and chain checks still decide"
        : facts.websiteReachable === false
          ? "Website did not answer the server-side safety check"
          : "Website is present; it cannot offset an on-chain failure",
      penalty: websitePenalty,
      hard: false,
      category: "social",
      evidence: websiteEvidence,
    },
    {
      id: "website_template_reuse",
      label: "Website template reuse",
      outcome:
        (facts.websiteTemplateReuse24h ?? 0) >= 3 ? "warn" : "pass",
      value:
        facts.websiteTemplateReuse24h === null ||
        facts.websiteTemplateReuse24h === undefined
          ? "Unknown"
          : `${facts.websiteTemplateReuse24h} matches`,
      threshold: "warn ≥ 3 in 24h",
      reason:
        (facts.websiteTemplateReuse24h ?? 0) >= 3
          ? "The same normalized site appeared on several launches"
          : "No repeated launch template was found",
      penalty: (facts.websiteTemplateReuse24h ?? 0) >= 3 ? 6 : 0,
      hard: false,
      category: "social",
      evidence: websiteEvidence,
    },
    {
      id: "x_link",
      label: "X link",
      outcome: xPenalty ? "warn" : facts.xLinkType ? "pass" : "unknown",
      value: facts.xLinkType ?? "Unknown",
      threshold: "profile preferred; reused handle penalized",
      reason: xPenalty
        ? "X evidence is weak or reused; chain checks still decide"
        : "X profile evidence is present",
      penalty: xPenalty,
      hard: false,
      category: "social",
      evidence,
    },
    {
      id: "ticker_clone",
      label: "Ticker and name clones",
      outcome: (facts.cloneCount1h ?? 0) >= 2 ? "warn" : "pass",
      value:
        facts.cloneCount1h === null || facts.cloneCount1h === undefined
          ? "Unknown"
          : `${facts.cloneCount1h} in 1h${
              facts.cloneRank1h ? ` · rank ${facts.cloneRank1h}` : ""
            }`,
      threshold: "penalize ≥ 2 in 1h",
      reason:
        (facts.cloneCount1h ?? 0) >= 2
          ? `Clone #${facts.cloneRank1h ?? "?"} of ${facts.cloneCount1h} launches this hour`
          : "No same-hour clone cluster was found",
      penalty: (facts.cloneCount1h ?? 0) >= 2 ? 6 : 0,
      hard: false,
      category: "social",
      evidence,
    },
    {
      id: "confirmed_clone",
      label: "Confirmed coin clone",
      outcome: facts.confirmedClone ? "fail" : "pass",
      value: facts.confirmedClone ? "Detected" : "Clear",
      threshold: "soft block",
      reason: facts.confirmedClone
        ? "Name matches a coin confirmed by its originator at another address"
        : facts.originatorConfirmed
          ? "Address is confirmed by the originator"
          : "No originator-confirmed clone was found",
      penalty: facts.confirmedClone ? 10 : 0,
      hard: false,
      category: "social",
      evidence,
    },
    {
      id: "image_clone",
      label: "Image reuse",
      outcome: (facts.imageCloneCount24h ?? 0) >= 2 ? "warn" : "pass",
      value:
        facts.imageCloneCount24h === null ||
        facts.imageCloneCount24h === undefined
          ? "Unknown"
          : `${facts.imageCloneCount24h} matches`,
      threshold: "warn ≥ 2 in 24h",
      reason:
        (facts.imageCloneCount24h ?? 0) >= 2
          ? "Launch image was reused in the last 24 hours"
          : "No recent image clone was found",
      penalty: (facts.imageCloneCount24h ?? 0) >= 2 ? 3 : 0,
      hard: false,
      category: "social",
      evidence,
    },
  ];
}

export function evaluateTrenchChecks(
  facts: LaunchFacts,
  profile: Profile,
  evidence: Evidence[],
): GateCheck[] {
  const clusterLines =
    profile === "strict"
      ? ([10, 20] as const)
      : profile === "loose"
        ? ([20, 40] as const)
        : ([15, 30] as const);

  const layeredPct = facts.layeredTransferPct;
  const layeredWallets = facts.layeredTransferWallets;
  const layeredFound = (layeredWallets ?? 0) >= 2;
  const checks: GateCheck[] = [
    launchSecondCheck(facts, evidence),
    numericRisk({
      id: "cluster_retained_pct",
      label: "Funder-linked holdings",
      value: facts.clusterRetainedPct,
      warnAt: clusterLines[0],
      blockAt: clusterLines[1],
      maxPenalty: 30,
      category: "supply",
      evidence,
    }),
    {
      id: "bundle_initial_pct",
      label: "Launch-slot buying",
      outcome: "pass",
      value:
        facts.bundleInitialPct === null ||
        facts.bundleInitialPct === undefined
          ? "Unknown"
          : `${facts.bundleInitialPct.toFixed(1)}%`,
      threshold: "information only",
      reason: "Initial bundles are attention context; retained holdings decide risk",
      penalty: 0,
      hard: false,
      category: "supply",
      evidence,
    },
    numericRisk({
      id: "bundle_retained_pct",
      label: "Launch-buyer holdings",
      value: facts.bundleRetainedPct,
      warnAt: 10,
      blockAt: 25,
      maxPenalty: 25,
      category: "supply",
      evidence,
    }),
    {
      id: "layered_distribution",
      label: "Layered token distribution",
      outcome:
        layeredPct !== null &&
        layeredPct !== undefined &&
        layeredPct >= 15
          ? "fail"
          : layeredFound
            ? "warn"
            : layeredWallets === null || layeredWallets === undefined
              ? "unknown"
              : "pass",
      value:
        layeredWallets === null || layeredWallets === undefined
          ? "Collecting"
          : `${layeredWallets} fresh wallets · ${(layeredPct ?? 0).toFixed(1)}%`,
      threshold: "warn ≥ 2 wallets · block ≥ 15% supply moved",
      reason:
        layeredPct !== null &&
        layeredPct !== undefined &&
        layeredPct >= 15
          ? "Launch wallets layered at least 15% of supply through fresh wallets"
          : layeredFound
            ? "Launch wallets passed tokens through multiple fresh wallets"
            : "No layered distribution was found",
      penalty:
        layeredPct !== null &&
        layeredPct !== undefined &&
        layeredPct >= 15
          ? 25
          : layeredFound
            ? 8
            : 0,
      hard: false,
      category: "supply",
      evidence,
    },
    serialCreatorCheck(facts, profile, evidence),
    creatorRugRateCheck(facts, evidence),
    hardBoolean(
      "deployer_pulled_pool",
      "Creator liquidity-pull history",
      facts.deployerPulledPool,
      "Creator removed liquidity from an earlier pool",
      evidence,
    ),
    numericRisk({
      id: "first_buyer_crew",
      label: "First-buyer rug history",
      value: facts.firstBuyerRugRatePct,
      warnAt: 60,
      blockAt: 75,
      maxPenalty: 25,
      category: "provenance",
      evidence,
    }),
    {
      id: "creator_fee_sweep",
      label: "Creator-fee sweep",
      outcome: facts.creatorFeeSweep ? "warn" : "pass",
      value: facts.creatorFeeSweep ? "Detected" : "Clear",
      threshold: "provenance warning",
      reason: facts.creatorFeeSweep
        ? "A prior creator-fee claim flowed back to a launch funder"
        : "No creator-fee sweep was found",
      penalty: facts.creatorFeeSweep ? 8 : 0,
      hard: false,
      category: "provenance",
      evidence,
    },
    numericRisk({
      id: "fresh_wallet_share",
      label: "Fresh top-holder wallets",
      value: facts.freshWalletSharePct,
      warnAt: 40,
      blockAt: 70,
      maxPenalty: 20,
      category: "supply",
      evidence,
    }),
    numericRisk({
      id: "self_trade_share",
      label: "Clustered or round-trip volume",
      value: facts.selfTradeSharePct,
      warnAt: 40,
      blockAt: 70,
      maxPenalty: 20,
      category: "market",
      evidence,
    }),
    hardBoolean(
      "manufactured_cap",
      "Manufactured market cap",
      facts.manufacturedCap,
      "Market cap is unsupported by canonical liquidity or independent volume",
      evidence,
    ),
    {
      id: "launch_jump",
      label: "First-10-second price jump",
      outcome: (facts.launchJumpX ?? 0) >= 4 ? "warn" : "pass",
      value:
        facts.launchJumpX === null || facts.launchJumpX === undefined
          ? "Unknown"
          : `${facts.launchJumpX.toFixed(1)}×`,
      threshold: "warn ≥ 4×",
      reason:
        (facts.launchJumpX ?? 0) >= 4
          ? "Launch price jumped at least 4× in ten seconds"
          : "No extreme launch jump was found",
      penalty: (facts.launchJumpX ?? 0) >= 4 ? 5 : 0,
      hard: false,
      category: "market",
      evidence,
    },
    {
      id: "smooth_climb",
      label: "Low-pullback climb",
      outcome: facts.smoothClimb30m ? "warn" : "pass",
      value: facts.smoothClimb30m ? "Detected" : "Clear",
      threshold: "warn +50% in 30m without a 5% pullback",
      reason: facts.smoothClimb30m
        ? "Price climbed too smoothly for organic tape"
        : "No smooth-climb pattern was found",
      penalty: facts.smoothClimb30m ? 5 : 0,
      hard: false,
      category: "market",
      evidence,
    },
    {
      id: "recent_crash",
      label: "Recent one-minute crash",
      outcome: (facts.recentCrash1mPct ?? 0) >= 40 ? "warn" : "pass",
      value:
        facts.recentCrash1mPct === null ||
        facts.recentCrash1mPct === undefined
          ? "Unknown"
          : `${facts.recentCrash1mPct.toFixed(1)}%`,
      threshold: "warn ≥ 40%",
      reason:
        (facts.recentCrash1mPct ?? 0) >= 40
          ? "Price dropped at least 40% inside one minute"
          : "No recent one-minute crash was found",
      penalty: (facts.recentCrash1mPct ?? 0) >= 40 ? 5 : 0,
      hard: false,
      category: "market",
      evidence,
    },
    ...socialChecks(facts, evidence),
  ];

  return checks;
}

export function evaluateTiming(
  facts: LaunchFacts,
  now: number,
): GateTiming {
  const ageSec = Math.max(0, (now - facts.createdAt) / 1_000);
  const insidersOut =
    facts.launchSecondBuyout === true &&
    (facts.clusterRetainedPct ?? Number.POSITIVE_INFINITY) < 5;
  const outsideDemand = (facts.newOutsideBuyers ?? 0) > 0;

  if (
    facts.graduatedAt &&
    now - facts.graduatedAt <= 60 * 60 * 1_000 &&
    (facts.openingPriceHoldPct ?? 0) >= 80 &&
    !facts.launchSecondBuyout
  ) {
    return {
      kind: "RETEST",
      label: "Retest",
      reason: `Graduated ${Math.floor((now - facts.graduatedAt) / 60_000)} min ago and holding ${(facts.openingPriceHoldPct ?? 0).toFixed(0)}% of opening price`,
      entryAllowed: true,
      insidersOut,
    };
  }
  if (
    facts.graduatedAt &&
    now - facts.graduatedAt > 60 * 60 * 1_000 &&
    (facts.openingPriceHoldPct ?? 0) >= 25
  ) {
    return {
      kind: "SURVIVOR",
      label: "Survivor",
      reason: "Graduated more than an hour ago and still holds at least 25% of opening price",
      entryAllowed: true,
      insidersOut,
    };
  }
  if (
    (facts.drawdownFromFirstPeakPct ?? 0) >= 40 &&
    facts.reclaimedFiveMinuteVwap &&
    outsideDemand &&
    (insidersOut || !facts.launchSecondBuyout)
  ) {
    return {
      kind: "SECOND_LEG",
      label: "Second leg",
      reason: `Second leg forming: ${facts.newOutsideBuyers} outside buyers since the dip`,
      entryAllowed: true,
      insidersOut,
    };
  }
  if (ageSec < 60) {
    return {
      kind: "EARLY",
      label: "Early",
      reason: "The first seconds belong to bots; wait for enough tape",
      entryAllowed: false,
      insidersOut,
    };
  }
  if (ageSec <= 10 * 60) {
    return {
      kind: "CHASE_WINDOW",
      label: "Chase window",
      reason: "Most buyers in minutes 1–10 end up as exit liquidity; wait for a second leg",
      entryAllowed: false,
      insidersOut,
    };
  }
  return {
    kind: "SETTLING",
    label: "Settling",
    reason: "Watch the post-peak tape for a second leg or graduation retest",
    entryAllowed: false,
    insidersOut,
  };
}
