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
import { parsePumpLaunch, parsePumpTrade } from "./pump-stream";

export type FeedLaunch = {
  facts: LaunchFacts;
  verdict: GateVerdict;
  source: Extract<Source, "live" | "replay">;
};

type FeedStatus = "connecting" | "live" | "replay" | "error";
const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;

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

export function useLaunchFeed() {
  const [launches, setLaunches] = useState<FeedLaunch[]>([]);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const launchesRef = useRef<FeedLaunch[]>([]);

  const retry = useCallback(() => {
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
    void buildReplay().then((replay) => {
      if (disposed) return;
      setLaunches((current) => {
        const next = current.some((launch) => launch.source === "live")
          ? [...current, ...replay].slice(0, 60)
          : replay;
        launchesRef.current = next;
        return next;
      });
      setStatus((current) => (current === "connecting" ? "replay" : current));
    });

    const endpoint =
      process.env.NEXT_PUBLIC_PUMPPORTAL_WS_URL ??
      "wss://pumpportal.fun/api/data";
    const socket = new WebSocket(endpoint);
    socketRef.current = socket;
    let createQueue = Promise.resolve();
    const timeout = window.setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        socket.close();
        setStatus("replay");
      }
    }, 8_000);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ method: "subscribeNewToken" }));
    });

    socket.addEventListener("message", (event) => {
      let payload: unknown;
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (
        payload &&
        typeof payload === "object" &&
        "message" in payload
      ) {
        const message = String((payload as { message: unknown }).message);
        if (message.toLowerCase().includes("successfully")) {
          window.clearTimeout(timeout);
          setStatus("live");
          setLastMessageAt(Date.now());
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
        createQueue = createQueue
          .then(async () => {
            const current = launchesRef.current;
            const indexed = indexSessionLaunches(
              [
                facts,
                ...current
                  .filter(
                    (launch) =>
                      launch.source === "live" &&
                      launch.facts.mint !== facts.mint,
                  )
                  .map((launch) => launch.facts),
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
              const next = [
                ...live,
                ...latest.filter((launch) => launch.source === "replay"),
              ].slice(0, 60);
              launchesRef.current = next;
              return next;
            });
          })
          .catch(() => {
            if (!disposed) setStatus("error");
          });
        socket.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [facts.mint],
          }),
        );
        return;
      }

      const trade = parsePumpTrade(payload);
      if (trade) {
        const observedAt = Date.now();
        setLastMessageAt(observedAt);
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
    });

    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      setStatus("replay");
    });
    socket.addEventListener("close", () => {
      window.clearTimeout(timeout);
      if (!disposed) setStatus("replay");
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
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
