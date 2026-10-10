"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedLaunch } from "./use-launch-feed";
import {
  mergeOutcomeTape,
  type OutcomeTapeEntry,
  type OutcomeTapeSample,
} from "./outcome-tape";

const STORAGE_KEY = "apegate.outcomes.v1";

export function useOutcomeTape(launches: readonly FeedLaunch[]) {
  const [entries, setEntries] = useState<OutcomeTapeEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const samples = useMemo(
    () =>
      launches
        .filter((launch) => launch.source === "live")
        .map(
          (launch): OutcomeTapeSample => ({
            mint: launch.facts.mint,
            name: launch.facts.name,
            symbol: launch.facts.symbol,
            source: "live",
            createdAt: launch.facts.createdAt,
            observedAt: launch.facts.observedAt,
            marketCapSol: launch.facts.marketCapSol,
            tradeCount: launch.facts.tradeCount ?? 1,
            pool: launch.facts.pool,
            verdict: launch.verdict.kind,
            timing: launch.verdict.timing.kind,
            factsHash: launch.verdict.factsHash,
            rulesetVersion: launch.verdict.rulesetVersion,
          }),
        ),
    [launches],
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setEntries(JSON.parse(saved) as OutcomeTapeEntry[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || samples.length === 0) return;
    let cancelled = false;
    const now = Date.now();
    queueMicrotask(() => {
      if (cancelled) return;
      setEntries((current) => {
        const next = mergeOutcomeTape(current, samples, now);
        return JSON.stringify(next) === JSON.stringify(current)
          ? current
          : next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, samples]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  return {
    entries,
    checkpointCount: entries.reduce(
      (total, entry) => total + entry.checkpoints.length,
      0,
    ),
    hydrated,
  };
}
