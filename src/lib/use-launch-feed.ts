"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  evaluateGate,
  launchToFacts,
  type GateVerdict,
  type LaunchFacts,
  type RawLaunch,
  type Source,
} from "../../packages/core/src";
import tape from "../../fixtures/tapes/pump-launches.json";

export type FeedLaunch = {
  facts: LaunchFacts;
  verdict: GateVerdict;
  source: Extract<Source, "live" | "replay">;
};

type FeedStatus = "connecting" | "live" | "replay" | "error";
const OFFICIAL_APEGATE_MINT =
  process.env.NEXT_PUBLIC_APEGATE_TOKEN_MINT ?? null;

function isLaunch(value: unknown): value is RawLaunch {
  if (!value || typeof value !== "object") return false;
  const launch = value as Partial<RawLaunch>;
  return Boolean(
    launch.mint &&
      launch.signature &&
      launch.traderPublicKey &&
      launch.symbol &&
      launch.name &&
      typeof launch.marketCapSol === "number",
  );
}

async function buildReplay(): Promise<FeedLaunch[]> {
  const recordedAt = Date.parse(tape.recordedAt);
  return Promise.all(
    tape.launches.map(async (launch, index) => {
      const createdAt = recordedAt + index * 1_400;
      const facts = launchToFacts(launch, createdAt, createdAt);
      return {
        facts,
        verdict: await evaluateGate(facts, "standard", createdAt, {
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

  const retry = useCallback(() => {
    setStatus("connecting");
    setRetryNonce((value) => value + 1);
  }, []);

  const updateLaunch = useCallback(
    (mint: string, updater: (launch: FeedLaunch) => FeedLaunch) => {
      setLaunches((current) =>
        current.map((launch) =>
          launch.facts.mint === mint ? updater(launch) : launch,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    let disposed = false;
    void buildReplay().then((replay) => {
      if (disposed) return;
      setLaunches((current) =>
        current.some((launch) => launch.source === "live")
          ? [...current, ...replay].slice(0, 60)
          : replay,
      );
      setStatus((current) => (current === "connecting" ? "replay" : current));
    });

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

      if (isLaunch(payload) && payload.txType === "create") {
        const observedAt = Date.now();
        const facts = launchToFacts(payload, observedAt);
        setLastMessageAt(observedAt);
        setStatus("live");
        void evaluateGate(facts, "standard", observedAt, {
          officialApegateMint: OFFICIAL_APEGATE_MINT,
        }).then((verdict) => {
          if (disposed) return;
          setLaunches((current) => [
            { facts, verdict, source: "live" as const },
            ...current.filter(
              (launch) => launch.facts.mint !== payload.mint,
            ),
          ].slice(0, 60));
        });
        socket.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [payload.mint],
          }),
        );
        return;
      }

      const trade = payload as {
        mint?: string;
        txType?: string;
        marketCapSol?: number;
      };
      if (
        trade.mint &&
        (trade.txType === "buy" || trade.txType === "sell")
      ) {
        const observedAt = Date.now();
        setLastMessageAt(observedAt);
        setLaunches((current) =>
          current.map((launch) => {
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
          }),
        );
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
