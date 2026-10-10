"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeedLaunch } from "./use-launch-feed";

const WATCH_STORAGE_KEY = "apegate.pass-watch.v1";
const ALERT_STORAGE_KEY = "apegate.gate-alerts.v1";

export type GatePassAlert = {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  at: number;
  factsHash: string;
};

export function useGateAlerts(launches: readonly FeedLaunch[]) {
  const [watchedMints, setWatchedMints] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<GatePassAlert[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const deliveredMints = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const watched = window.localStorage.getItem(WATCH_STORAGE_KEY);
        const savedAlerts = window.localStorage.getItem(ALERT_STORAGE_KEY);
        if (watched) setWatchedMints(JSON.parse(watched) as string[]);
        if (savedAlerts) setAlerts(JSON.parse(savedAlerts) as GatePassAlert[]);
      } catch {
        window.localStorage.removeItem(WATCH_STORAGE_KEY);
        window.localStorage.removeItem(ALERT_STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      WATCH_STORAGE_KEY,
      JSON.stringify(watchedMints),
    );
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts, hydrated, watchedMints]);

  useEffect(() => {
    if (!hydrated || watchedMints.length === 0) return;
    const watched = new Set(watchedMints);
    const candidates = launches.filter(
      (launch) =>
        watched.has(launch.facts.mint) &&
        launch.verdict.kind === "PASS" &&
        !deliveredMints.current.has(launch.facts.mint),
    );
    if (!candidates.length) return;
    for (const launch of candidates) {
      deliveredMints.current.add(launch.facts.mint);
    }
    queueMicrotask(() => {
      setAlerts((current) => {
        const existing = new Set(current.map((alert) => alert.id));
        const created: GatePassAlert[] = candidates
          .map((launch) => ({
            id: `pass:${launch.facts.mint}:${launch.verdict.factsHash}`,
            mint: launch.facts.mint,
            symbol: launch.facts.symbol,
            name: launch.facts.name,
            at: Date.now(),
            factsHash: launch.verdict.factsHash,
          }))
          .filter((alert) => !existing.has(alert.id));
        if (!created.length) return current;
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          for (const alert of created) {
            new Notification(`$${alert.symbol} passed Kong's Gate`, {
              body: "Open Apegate and review the fresh evidence before signing.",
              icon: "/apegate-logo.jpg",
              tag: alert.id,
            });
          }
        }
        return [...current, ...created].slice(-25);
      });
    });
  }, [hydrated, launches, watchedMints]);

  const watched = useMemo(() => new Set(watchedMints), [watchedMints]);

  const toggleWatch = useCallback((mint: string) => {
    setWatchedMints((current) => {
      if (current.includes(mint)) {
        deliveredMints.current.delete(mint);
        return current.filter((item) => item !== mint);
      }
      deliveredMints.current.delete(mint);
      return [...current, mint].slice(-50);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setAlerts((current) => current.filter((alert) => alert.id !== id));
  }, []);

  const enableDesktopNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    if (Notification.permission === "granted") return "granted" as const;
    if (Notification.permission === "denied") return "denied" as const;
    return Notification.requestPermission();
  }, []);

  return {
    alerts,
    watched,
    watchedCount: watchedMints.length,
    hydrated,
    toggleWatch,
    dismiss,
    enableDesktopNotifications,
  };
}
