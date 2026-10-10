"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  evaluateGate,
  indexSessionLaunches,
  launchToFacts,
  type GateVerdict,
  type LaunchFacts,
  type Source,
} from "../../packages/core/src";
import tape from "../../fixtures/tapes/pump-launches.json";
import { isBrandSafeLaunchLabel } from "./brand-safety";
import {
  parsePumpLaunch,
  parsePumpMigration,
  parsePumpTrade,
} from "./pump-stream";

export type FeedLaunch = {
  facts: LaunchFacts;
  verdict: GateVerdict;
  source: Extract<Source, "live" | "replay">;
};

type FeedStatus = "connecting" | "live" | "replay" | "error";
const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;
const TRADE_STREAM_ENABLED =
  process.env.NEXT_PUBLIC_PUMPPORTAL_TRADE_STREAM_ENABLED === "true";
const MAX_FEED_ITEMS = 60;
let replayPromise: Promise<FeedLaunch[]> | null = null;

async function buildReplay(): Promise<FeedLaunch[]> {
  const recordedAt = Date.parse(tape.recordedAt);
  const facts = indexSessionLaunches(
    tape.launches.map((launch, index) => {
      const createdAt = recordedAt + index * 1_400;
      return launchToFacts(launch, createdAt, createdAt);
    }),
  );
  const replayAt = facts.reduce(
    (latest, launch) => Math.max(latest, launch.createdAt),
    recordedAt,
  );
  return Promise.all(
    facts.map(async (launchFacts) => {
      return {
        facts: launchFacts,
        verdict: await evaluateGate(launchFacts, "standard", replayAt, {
          officialApegateMint: OFFICIAL_APEGATE_MINT,
        }),
        source: "replay" as const,
      };
    }),
  );
}

function replayLaunches() {
  replayPromise ??= buildReplay();
  return replayPromise;
}

function uniqueFeed(items: readonly FeedLaunch[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.source}:${item.facts.mint}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useLaunchFeed() {
  const [launches, setLaunches] = useState<FeedLaunch[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const launchesRef = useRef<FeedLaunch[]>([]);
  const reconnectAttemptRef = useRef(0);

  const retry = useCallback(() => {
    reconnectAttemptRef.current = 0;
    setStatus("connecting");
    setRetryNonce((value) => value + 1);
  }, []);

  const updateLaunch = useCallback(
    (mint: string, updater: (launch: FeedLaunch) => FeedLaunch) => {
      setLaunches((current) => {
        const next = current.map((launch) =>
          launch.facts.mint === mint ? updater(launch) : launch,
        );
        launchesRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | null = null;
    let staleTimer: number | null = null;
    let lastSocketMessageAt = Date.now();
    let createQueue = Promise.resolve();

    void replayLaunches().then((replay) => {
      if (disposed) return;
      setLaunches((current) => {
        const next = uniqueFeed(
          current.some((launch) => launch.source === "live")
            ? [...current, ...replay]
            : replay,
        ).slice(0, MAX_FEED_ITEMS);
        launchesRef.current = next;
        return next;
      });
      setStatus((current) => (current === "connecting" ? "replay" : current));
    });

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return;
      const attempt = reconnectAttemptRef.current;
      reconnectAttemptRef.current += 1;
      const delay = Math.min(1_000 * 2 ** attempt, 15_000);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!disposed) setRetryNonce((value) => value + 1);
      }, delay);
    };

    const upsertLiveFacts = (facts: LaunchFacts, observedAt: number) => {
      createQueue = createQueue
        .then(async () => {
          const current = launchesRef.current;
          const indexed = indexSessionLaunches(
            [
              facts,
              ...current
                .filter(
                  (item) =>
                    item.source === "live" &&
                    item.facts.mint !== facts.mint,
                )
                .map((item) => item.facts),
            ],
            observedAt,
          );
          const live = await Promise.all(
            indexed.map(async (indexedFacts) => ({
              facts: indexedFacts,
              verdict: await evaluateGate(
                indexedFacts,
                "standard",
                observedAt,
                { officialApegateMint: OFFICIAL_APEGATE_MINT },
              ),
              source: "live" as const,
            })),
          );
          if (disposed) return;
          setLaunches((latest) => {
            const next = uniqueFeed([
              ...live,
              ...latest.filter((item) => item.source === "replay"),
            ]).slice(0, MAX_FEED_ITEMS);
            launchesRef.current = next;
            return next;
          });
        })
        .catch(() => {
          if (!disposed) setStatus("error");
        });
    };

    const endpoint =
      process.env.NEXT_PUBLIC_PUMPPORTAL_WS_URL ??
      "wss://pumpportal.fun/api/data";
    const socket = new WebSocket(endpoint);
    socketRef.current = socket;
    const timeout = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close();
        setStatus("replay");
      }
    }, 8_000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ method: "subscribeNewToken" }));
      socket.send(JSON.stringify({ method: "subscribeMigration" }));
      if (TRADE_STREAM_ENABLED) {
        const liveMints = launchesRef.current
          .filter((item) => item.source === "live")
          .map((item) => item.facts.mint);
        if (liveMints.length) {
          socket.send(
            JSON.stringify({
              method: "subscribeTokenTrade",
              keys: liveMints,
            }),
          );
        }
      }
    });

    const handlePayload = (payload: unknown) => {
      if (
        payload &&
        typeof payload === "object" &&
        "message" in payload
      ) {
        const message = String((payload as { message: unknown }).message);
        if (
          message.toLowerCase().includes("subscribed") ||
          message.toLowerCase().includes("successfully")
        ) {
          window.clearTimeout(timeout);
          reconnectAttemptRef.current = 0;
          setStatus("live");
        }
        return;
      }

      const launch = parsePumpLaunch(payload);
      if (
        launch &&
        isBrandSafeLaunchLabel(launch.name, launch.symbol)
      ) {
        const observedAt = Date.now();
        const facts = launchToFacts(launch, observedAt);
        setLastMessageAt(observedAt);
        setStatus("live");
        reconnectAttemptRef.current = 0;
        upsertLiveFacts(facts, observedAt);
        if (TRADE_STREAM_ENABLED) {
          socket.send(
            JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [facts.mint],
            }),
          );
        }
        return;
      }

      const migration = parsePumpMigration(payload);
      if (migration) {
        const observedAt = Date.now();
        const existing = launchesRef.current.find(
          (item) =>
            item.source === "live" &&
            item.facts.mint === migration.mint,
        );
        const name =
          migration.name ?? existing?.facts.name ?? "Graduated Pump coin";
        const symbol = migration.symbol ?? existing?.facts.symbol ?? "PUMP";
        if (!isBrandSafeLaunchLabel(name, symbol)) return;
        const facts: LaunchFacts = existing
          ? {
              ...existing.facts,
              signature: migration.signature,
              name,
              symbol,
              pool: "pump-amm",
              graduatedAt: observedAt,
              observedAt,
            }
          : {
              mint: migration.mint,
              signature: migration.signature,
              name,
              symbol,
              creator: migration.mint,
              uri: "",
              createdAt: observedAt,
              observedAt,
              marketCapSol: 0,
              initialBuySol: 0,
              isMayhem: false,
              pool: "pump-amm",
              tradeCount: 1,
              graduatedAt: observedAt,
            };
        setLastMessageAt(observedAt);
        setStatus("live");
        reconnectAttemptRef.current = 0;
        upsertLiveFacts(facts, observedAt);
        return;
      }

      const trade = parsePumpTrade(payload);
      if (trade) {
        const observedAt = Date.now();
        setLastMessageAt(observedAt);
        reconnectAttemptRef.current = 0;
        setLaunches((current) => {
          const next = current.map((launch) => {
            if (launch.facts.mint !== trade.mint) return launch;
            const facts = {
              ...launch.facts,
              observedAt,
              tradeCount: (launch.facts.tradeCount ?? 1) + 1,
              marketCapSol:
                typeof trade.marketCapSol === "number"
                  ? trade.marketCapSol
                  : launch.facts.marketCapSol,
            };
            void evaluateGate(facts, "standard", observedAt, {
              officialApegateMint: OFFICIAL_APEGATE_MINT,
            }).then((verdict) => {
              if (!disposed) {
                updateLaunch(facts.mint, (item) => ({
                  ...item,
                  facts,
                  verdict,
                }));
              }
            });
            return { ...launch, facts };
          });
          launchesRef.current = next;
          return next;
        });
      }
    };

    socket.addEventListener("message", (event) => {
      lastSocketMessageAt = Date.now();
      let payload: unknown;
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const events = Array.isArray(payload) ? payload : [payload];
      for (const item of events) handlePayload(item);
    });

    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      setStatus("replay");
      socket.close();
    });
    socket.addEventListener("close", () => {
      window.clearTimeout(timeout);
      if (!disposed) {
        setStatus("replay");
        scheduleReconnect();
      }
    });
    staleTimer = window.setInterval(() => {
      if (
        socket.readyState === WebSocket.OPEN &&
        Date.now() - lastSocketMessageAt > 45_000
      ) {
        socket.close();
      }
    }, 15_000);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (staleTimer !== null) window.clearInterval(staleTimer);
      socket.close();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [retryNonce, updateLaunch]);

  return {
    launches,
    status,
    lastMessageAt,
    retry,
    updateLaunch,
  };
}
