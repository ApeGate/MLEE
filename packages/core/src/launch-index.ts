import type { LaunchFacts } from "./types";

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export const SESSION_LAUNCH_INDEX_LABEL = "This session";

export function normalizeLaunchIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function withinWindow(createdAt: number, asOf: number, windowMs: number) {
  return createdAt <= asOf && createdAt >= asOf - windowMs;
}

function compareLaunchOrder(a: LaunchFacts, b: LaunchFacts) {
  return a.createdAt - b.createdAt || a.mint.localeCompare(b.mint);
}

/**
 * Adds interim creator and clone history from launches observed in this
 * browser session. The Durable Object index will replace this scope later.
 */
export function indexSessionLaunches<T extends LaunchFacts>(
  launches: readonly T[],
  asOf = launches.reduce(
    (latest, launch) => Math.max(latest, launch.createdAt),
    0,
  ),
): T[] {
  if (!launches.length) return [];

  const uniqueByMint = new Map<string, T>();
  for (const launch of launches) {
    const current = uniqueByMint.get(launch.mint);
    if (!current || launch.observedAt >= current.observedAt) {
      uniqueByMint.set(launch.mint, launch);
    }
  }
  const unique = [...uniqueByMint.values()];
  const creatorWindows = new Map<
    string,
    { hour: number; day: number; week: number }
  >();
  const websiteTemplates = new Map<string, number>();
  const xHandles = new Map<string, number>();
  const imageHashes = new Map<string, number>();

  for (const launch of unique) {
    if (launch.createdAt > asOf) continue;
    const counts = creatorWindows.get(launch.creator) ?? {
      hour: 0,
      day: 0,
      week: 0,
    };
    if (withinWindow(launch.createdAt, asOf, HOUR_MS)) counts.hour += 1;
    if (withinWindow(launch.createdAt, asOf, DAY_MS)) counts.day += 1;
    if (withinWindow(launch.createdAt, asOf, 7 * DAY_MS)) counts.week += 1;
    creatorWindows.set(launch.creator, counts);

    if (withinWindow(launch.createdAt, asOf, DAY_MS)) {
      if (launch.websiteTemplateHash) {
        websiteTemplates.set(
          launch.websiteTemplateHash,
          (websiteTemplates.get(launch.websiteTemplateHash) ?? 0) + 1,
        );
      }
      if (launch.xHandle) {
        const handle = launch.xHandle.toLowerCase();
        xHandles.set(handle, (xHandles.get(handle) ?? 0) + 1);
      }
      if (launch.imageHash) {
        imageHashes.set(
          launch.imageHash,
          (imageHashes.get(launch.imageHash) ?? 0) + 1,
        );
      }
    }
  }

  const recent = unique.filter((launch) =>
    withinWindow(launch.createdAt, asOf, HOUR_MS),
  );
  const parent = new Map(recent.map((launch) => [launch.mint, launch.mint]));

  function find(mint: string): string {
    const current = parent.get(mint);
    if (!current || current === mint) return mint;
    const root = find(current);
    parent.set(mint, root);
    return root;
  }

  function union(left: string, right: string) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    parent.set(
      leftRoot.localeCompare(rightRoot) <= 0 ? rightRoot : leftRoot,
      leftRoot.localeCompare(rightRoot) <= 0 ? leftRoot : rightRoot,
    );
  }

  const firstBySymbol = new Map<string, string>();
  const firstByName = new Map<string, string>();
  for (const launch of recent) {
    const symbol = normalizeLaunchIdentity(launch.symbol);
    const name = normalizeLaunchIdentity(launch.name);
    if (symbol) {
      const match = firstBySymbol.get(symbol);
      if (match) union(match, launch.mint);
      else firstBySymbol.set(symbol, launch.mint);
    }
    if (name) {
      const match = firstByName.get(name);
      if (match) union(match, launch.mint);
      else firstByName.set(name, launch.mint);
    }
  }

  const clusters = new Map<string, T[]>();
  for (const launch of recent) {
    const root = find(launch.mint);
    const cluster = clusters.get(root) ?? [];
    cluster.push(launch);
    clusters.set(root, cluster);
  }

  const cloneFacts = new Map<
    string,
    { count: number; rank: number; leaderMint: string }
  >();
  for (const cluster of clusters.values()) {
    const ranked = [...cluster].sort(compareLaunchOrder);
    const leader = [...cluster].sort(
      (a, b) =>
        b.marketCapSol - a.marketCapSol ||
        compareLaunchOrder(a, b),
    )[0]!;
    ranked.forEach((launch, index) => {
      cloneFacts.set(launch.mint, {
        count: ranked.length,
        rank: index + 1,
        leaderMint: leader.mint,
      });
    });
  }

  return launches.map((launch) => {
    const creator = creatorWindows.get(launch.creator) ?? {
      hour: 0,
      day: 0,
      week: 0,
    };
    const clones = cloneFacts.get(launch.mint);
    return {
      ...launch,
      creatorLaunches1h: creator.hour,
      creatorLaunches24h: creator.day,
      creatorLaunches7d: creator.week,
      launchIndexScope: "session",
      launchIndexLabel: SESSION_LAUNCH_INDEX_LABEL,
      cloneCount1h: clones?.count ?? 0,
      cloneRank1h: clones?.rank ?? null,
      cloneLeaderMint: clones?.leaderMint ?? null,
      websiteTemplateReuse24h: launch.websiteTemplateHash
        ? (websiteTemplates.get(launch.websiteTemplateHash) ?? 0)
        : null,
      xReuseCount24h: launch.xHandle
        ? (xHandles.get(launch.xHandle.toLowerCase()) ?? 0)
        : null,
      imageCloneCount24h: launch.imageHash
        ? (imageHashes.get(launch.imageHash) ?? 0)
        : null,
    };
  });
}
